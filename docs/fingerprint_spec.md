# Fingerprint Specification v1.0

## Overview
The V-Face Fingerprint is a privacy-preserving, deterministic identifier derived from a face embedding. It is designed to be **irreversible** (cannot reconstruct the face) but **consistent** (same face produces same fingerprint within a tolerance).

## 1. Canonical Embedding Generation
All implementations MUST use the exact same model and preprocessing pipeline to ensure the same input image yields the same float vector.

### 1.1 Model
- **Architecture**: ArcFace MobileNet (v1/v2)
- **Format**: ONNX
- **Input Shape**: `112x112` RGB
- **Output**: 128-dimensional float32 vector

### 1.2 Preprocessing Pipeline
1.  **Face Detection**: Use `SSD MobileNet V1` (or equivalent lightweight detector) to find the bounding box.
2.  **Alignment**: Perform 5-point landmark alignment (eyes, nose, mouth corners) to a standard template.
3.  **Crop & Resize**: Crop to 112x112 pixels.
4.  **Normalization**:
    - Subtract mean: `127.5`
    - Divide by scale: `128.0`
    - Result range: `[-1.0, 1.0]`

## 2. Fingerprint Derivation Algorithm

### Step 1: L2 Normalization
Normalize the raw output vector $v$ to unit length:
$$ v_{norm} = \frac{v}{||v||_2} $$

### Step 2: Fixed-Point Quantization
To ensure cross-platform consistency (handling floating point differences between WASM, Node, Python), we quantize the vector.

- **Precision**: 4 decimal places
- **Algorithm**:
  ```python
  def quantize(vector):
      return [round(x, 4) for x in vector]
  ```

### Step 3: Serialization
Convert the quantized vector to a string representation.
- **Format**: JSON array of numbers, no whitespace.
  ```json
  [0.1234,-0.5678,...]
  ```

### Step 4: Cryptographic Hashing
Hash the serialized string to produce the final identifier.
- **Algorithm**: SHA-256
- **Encoding**: Hexadecimal string
- **Output**: 64-character string

## 3. Future Improvements (Bucketing)
*Note: For v1.0 MVP, we use the "Exact Match" strategy described above. This implies a strict similarity requirement. If needed later, we will implement Locality Sensitive Hashing (LSH) to allow for fuzzy matching.*

## 4. Reference Implementation (Pseudo-code)

```javascript
async function generateFingerprint(imageBuffer) {
  // 1. Run ONNX Model
  const rawVector = await runMobileFaceNet(imageBuffer);
  
  // 2. Normalize
  const normVector = l2Normalize(rawVector);
  
  // 3. Quantize
  const quantized = normVector.map(n => Number(n.toFixed(4)));
  
  // 4. Serialize
  const serialized = JSON.stringify(quantized);
  
  // 5. Hash
  const hash = await sha256(serialized);
  
  return {
    fingerprint: hash,
    modelVersion: "mobilefacenet_v1",
    vectorVersion: "v1.0"
  };
}
```
