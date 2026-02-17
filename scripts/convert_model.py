#!/usr/bin/env python3
"""
V-Face: Download MobileFaceNet and export to ONNX.

Source: foamliu/MobileFaceNet (Apache-2.0)
Architecture: MobileNetV2 backbone for face recognition
Input:  [1, 3, 112, 112] — RGB 112x112 face crop, normalized (x - 127.5) / 128.0
Output: [1, 128] — L2-normalizable face embedding

Usage:
    python3 scripts/convert_model.py

This will:
1. Download the pretrained mobilefacenet.pt weights (~4.7 MB)
2. Load the MobileFaceNet architecture
3. Export to model/mobilefacenet.onnx
4. Validate the ONNX model
5. Print the SHA-256 hash for version-locking
"""

import os
import sys
import hashlib
import urllib.request
import math

import torch
import torch.nn as nn
import torch.nn.functional as F

# ============================================================================
# MobileFaceNet Architecture (from foamliu/MobileFaceNet)
# ============================================================================

def _make_divisible(v, divisor, min_value=None):
    if min_value is None:
        min_value = divisor
    new_v = max(min_value, int(v + divisor / 2) // divisor * divisor)
    if new_v < 0.9 * v:
        new_v += divisor
    return new_v


class ConvBNReLU(nn.Sequential):
    def __init__(self, in_planes, out_planes, kernel_size=3, stride=1, groups=1):
        padding = (kernel_size - 1) // 2
        super(ConvBNReLU, self).__init__(
            nn.Conv2d(in_planes, out_planes, kernel_size, stride, padding, groups=groups, bias=False),
            nn.BatchNorm2d(out_planes),
            nn.ReLU6(inplace=True)
        )


class DepthwiseSeparableConv(nn.Module):
    def __init__(self, in_planes, out_planes, kernel_size, padding, bias=False):
        super(DepthwiseSeparableConv, self).__init__()
        self.depthwise = nn.Conv2d(in_planes, in_planes, kernel_size=kernel_size, padding=padding, groups=in_planes, bias=bias)
        self.pointwise = nn.Conv2d(in_planes, out_planes, kernel_size=1, bias=bias)
        self.bn1 = nn.BatchNorm2d(in_planes)
        self.bn2 = nn.BatchNorm2d(out_planes)
        self.relu = nn.ReLU()

    def forward(self, x):
        x = self.depthwise(x)
        x = self.bn1(x)
        x = self.relu(x)
        x = self.pointwise(x)
        x = self.bn2(x)
        x = self.relu(x)
        return x


class GDConv(nn.Module):
    def __init__(self, in_planes, out_planes, kernel_size, padding, bias=False):
        super(GDConv, self).__init__()
        self.depthwise = nn.Conv2d(in_planes, out_planes, kernel_size=kernel_size, padding=padding, groups=in_planes, bias=bias)
        self.bn = nn.BatchNorm2d(in_planes)

    def forward(self, x):
        x = self.depthwise(x)
        x = self.bn(x)
        return x


class InvertedResidual(nn.Module):
    def __init__(self, inp, oup, stride, expand_ratio):
        super(InvertedResidual, self).__init__()
        self.stride = stride
        assert stride in [1, 2]
        hidden_dim = int(round(inp * expand_ratio))
        self.use_res_connect = self.stride == 1 and inp == oup
        layers = []
        if expand_ratio != 1:
            layers.append(ConvBNReLU(inp, hidden_dim, kernel_size=1))
        layers.extend([
            ConvBNReLU(hidden_dim, hidden_dim, stride=stride, groups=hidden_dim),
            nn.Conv2d(hidden_dim, oup, 1, 1, 0, bias=False),
            nn.BatchNorm2d(oup),
        ])
        self.conv = nn.Sequential(*layers)

    def forward(self, x):
        if self.use_res_connect:
            return x + self.conv(x)
        else:
            return self.conv(x)


class MobileFaceNet(nn.Module):
    def __init__(self, width_mult=1.0, inverted_residual_setting=None, round_nearest=8):
        super(MobileFaceNet, self).__init__()
        block = InvertedResidual
        input_channel = 64
        last_channel = 512

        if inverted_residual_setting is None:
            inverted_residual_setting = [
                # t, c, n, s
                [2, 64, 5, 2],
                [4, 128, 1, 2],
                [2, 128, 6, 1],
                [4, 128, 1, 2],
                [2, 128, 2, 1],
            ]

        if len(inverted_residual_setting) == 0 or len(inverted_residual_setting[0]) != 4:
            raise ValueError("inverted_residual_setting should be non-empty or a 4-element list")

        self.last_channel = _make_divisible(last_channel * max(1.0, width_mult), round_nearest)
        self.conv1 = ConvBNReLU(3, input_channel, stride=2)
        self.dw_conv = DepthwiseSeparableConv(in_planes=64, out_planes=64, kernel_size=3, padding=1)
        features = list()
        for t, c, n, s in inverted_residual_setting:
            output_channel = _make_divisible(c * width_mult, round_nearest)
            for i in range(n):
                stride = s if i == 0 else 1
                features.append(block(input_channel, output_channel, stride, expand_ratio=t))
                input_channel = output_channel
        self.conv2 = ConvBNReLU(input_channel, self.last_channel, kernel_size=1)
        self.gdconv = GDConv(in_planes=512, out_planes=512, kernel_size=7, padding=0)
        self.conv3 = nn.Conv2d(512, 128, kernel_size=1)
        self.bn = nn.BatchNorm2d(128)
        self.features = nn.Sequential(*features)

        for m in self.modules():
            if isinstance(m, nn.Conv2d):
                nn.init.kaiming_normal_(m.weight, mode='fan_out')
                if m.bias is not None:
                    nn.init.zeros_(m.bias)
            elif isinstance(m, nn.BatchNorm2d):
                nn.init.ones_(m.weight)
                nn.init.zeros_(m.bias)
            elif isinstance(m, nn.Linear):
                nn.init.normal_(m.weight, 0, 0.01)
                nn.init.zeros_(m.bias)

    def forward(self, x):
        x = self.conv1(x)
        x = self.dw_conv(x)
        x = self.features(x)
        x = self.conv2(x)
        x = self.gdconv(x)
        x = self.conv3(x)
        x = self.bn(x)
        x = x.view(x.size(0), -1)
        return x


# ============================================================================
# Download + Convert
# ============================================================================

WEIGHTS_URL = "https://github.com/foamliu/MobileFaceNet/releases/download/v1.0/mobilefacenet.pt"
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
WEIGHTS_PATH = os.path.join(PROJECT_ROOT, "model", "mobilefacenet.pt")
ONNX_PATH = os.path.join(PROJECT_ROOT, "model", "mobilefacenet.onnx")


def download_weights():
    """Download pretrained weights if not already present."""
    if os.path.exists(WEIGHTS_PATH) and os.path.getsize(WEIGHTS_PATH) > 1_000_000:
        print(f"✅ Weights already exist at {WEIGHTS_PATH}")
        return

    os.makedirs(os.path.dirname(WEIGHTS_PATH), exist_ok=True)
    print(f"⬇️  Downloading weights from {WEIGHTS_URL}...")
    urllib.request.urlretrieve(WEIGHTS_URL, WEIGHTS_PATH)
    size_mb = os.path.getsize(WEIGHTS_PATH) / (1024 * 1024)
    print(f"✅ Downloaded: {size_mb:.1f} MB")


def convert_to_onnx():
    """Load weights and export to ONNX."""
    print("🔧 Loading MobileFaceNet model...")
    model = MobileFaceNet()
    state_dict = torch.load(WEIGHTS_PATH, map_location='cpu', weights_only=True)
    model.load_state_dict(state_dict)
    model.eval()

    # Verify output shape
    dummy_input = torch.randn(1, 3, 112, 112)
    with torch.no_grad():
        output = model(dummy_input)
    
    assert output.shape == (1, 128), f"❌ Unexpected output shape: {output.shape}, expected (1, 128)"
    print(f"✅ Model output shape verified: {output.shape}")

    # Export to ONNX
    print(f"📦 Exporting to ONNX: {ONNX_PATH}...")
    torch.onnx.export(
        model,
        dummy_input,
        ONNX_PATH,
        opset_version=11,
        input_names=["input"],
        output_names=["embedding"],
        dynamic_axes={
            "input": {0: "batch_size"},
            "embedding": {0: "batch_size"},
        },
    )

    size_mb = os.path.getsize(ONNX_PATH) / (1024 * 1024)
    print(f"✅ ONNX model exported: {size_mb:.1f} MB")


def validate_onnx():
    """Validate the exported ONNX model."""
    import onnx
    model = onnx.load(ONNX_PATH)
    onnx.checker.check_model(model)

    # Print input/output info
    for inp in model.graph.input:
        print(f"   Input:  {inp.name} — shape: {[d.dim_value for d in inp.type.tensor_type.shape.dim]}")
    for out in model.graph.output:
        print(f"   Output: {out.name} — shape: {[d.dim_value for d in out.type.tensor_type.shape.dim]}")

    print("✅ ONNX model validation passed")


def compute_hash():
    """Compute SHA-256 hash of the ONNX model for version-locking."""
    sha256 = hashlib.sha256()
    with open(ONNX_PATH, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            sha256.update(chunk)
    digest = sha256.hexdigest()
    print(f"🔒 Model SHA-256: {digest}")
    return digest


if __name__ == "__main__":
    print("=" * 60)
    print("V-Face: MobileFaceNet ONNX Model Export")
    print("=" * 60)
    
    download_weights()
    convert_to_onnx()
    validate_onnx()
    model_hash = compute_hash()

    print()
    print("=" * 60)
    print("✅ Done! Model ready at:", ONNX_PATH)
    print(f"   SHA-256: {model_hash}")
    print("=" * 60)
