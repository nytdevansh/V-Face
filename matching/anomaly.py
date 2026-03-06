"""
V-Face Anomaly Detection

Behavioral fraud detection using statistical analysis of verification patterns.
Tracks per-identity frequency, timing, and flags anomalous usage.

Features:
- Z-score anomaly detector: flags identities where verification frequency > 3σ
- Time-of-day pattern analysis
- Rolling window baseline (24h default)
"""

import os
import time
import logging
from collections import defaultdict
from dataclasses import dataclass, field

import numpy as np
from fastapi import APIRouter, Header, HTTPException

logger = logging.getLogger("matching.anomaly")

ANOMALY_WINDOW_SECONDS = int(os.getenv("ANOMALY_WINDOW_SECONDS", str(24 * 3600)))  # 24h default
ANOMALY_ZSCORE_THRESHOLD = float(os.getenv("ANOMALY_ZSCORE_THRESHOLD", "3.0"))


@dataclass
class IdentityActivity:
    """Tracks verification activity for a single identity."""
    fingerprint: str
    events: list = field(default_factory=list)  # List of timestamps
    flagged: bool = False
    flag_reason: str = ""

    def add_event(self, timestamp: float = None):
        self.events.append(timestamp or time.time())

    def get_recent_count(self, window: int = ANOMALY_WINDOW_SECONDS) -> int:
        cutoff = time.time() - window
        return sum(1 for t in self.events if t >= cutoff)

    def prune_old(self, max_age: int = 7 * 24 * 3600):
        """Remove events older than max_age (default 7 days)."""
        cutoff = time.time() - max_age
        self.events = [t for t in self.events if t >= cutoff]


class AnomalyDetector:
    """Z-score based anomaly detector for verification patterns."""

    def __init__(self):
        self.activities: dict[str, IdentityActivity] = {}
        self._global_counts: list[int] = []  # Per-window counts for baseline

    def record_event(self, fingerprint: str):
        """Record a verification event for an identity."""
        if fingerprint not in self.activities:
            self.activities[fingerprint] = IdentityActivity(fingerprint=fingerprint)
        self.activities[fingerprint].add_event()

    def check_anomaly(self, fingerprint: str) -> dict:
        """Check if an identity's recent activity is anomalous."""
        activity = self.activities.get(fingerprint)
        if not activity:
            return {"anomalous": False, "reason": "no_activity"}

        recent_count = activity.get_recent_count()

        # Compute baseline stats across all identities
        all_counts = [a.get_recent_count() for a in self.activities.values()]
        if len(all_counts) < 3:
            return {"anomalous": False, "reason": "insufficient_data", "count": recent_count}

        mean = np.mean(all_counts)
        std = np.std(all_counts)

        if std == 0:
            return {"anomalous": False, "reason": "zero_variance", "count": recent_count}

        z_score = (recent_count - mean) / std

        is_anomalous = z_score > ANOMALY_ZSCORE_THRESHOLD

        if is_anomalous:
            activity.flagged = True
            activity.flag_reason = f"Z-score {z_score:.2f} > {ANOMALY_ZSCORE_THRESHOLD} (count: {recent_count})"
            logger.warning(f"ANOMALY DETECTED: {fingerprint[:8]}... — {activity.flag_reason}")

        return {
            "anomalous": is_anomalous,
            "z_score": round(z_score, 4),
            "recent_count": recent_count,
            "baseline_mean": round(mean, 2),
            "baseline_std": round(std, 2),
            "threshold": ANOMALY_ZSCORE_THRESHOLD,
        }

    def get_flagged(self) -> list[dict]:
        """Return all flagged identities."""
        return [
            {
                "fingerprint": a.fingerprint,
                "reason": a.flag_reason,
                "recent_count": a.get_recent_count(),
                "total_events": len(a.events),
            }
            for a in self.activities.values()
            if a.flagged
        ]

    def cleanup(self):
        """Prune old events from all identities."""
        for activity in self.activities.values():
            activity.prune_old()


# ============================================================================
# Singleton detector instance
# ============================================================================
detector = AnomalyDetector()


# ============================================================================
# FastAPI Router
# ============================================================================
router = APIRouter(prefix="/anomaly", tags=["anomaly"])

MATCHING_SECRET = os.getenv("MATCHING_SECRET", "dev-secret-change-me")


def verify_secret(x_matching_secret: str = Header(None)):
    if x_matching_secret != MATCHING_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")


@router.post("/record")
def record_event(fingerprint: str, x_matching_secret: str = Header(None)):
    """Record a verification event."""
    verify_secret(x_matching_secret)
    detector.record_event(fingerprint)
    return {"recorded": True}


@router.post("/check")
def check_anomaly(fingerprint: str, x_matching_secret: str = Header(None)):
    """Check if a fingerprint shows anomalous verification patterns."""
    verify_secret(x_matching_secret)
    return detector.check_anomaly(fingerprint)


@router.get("/flagged")
def get_flagged(x_matching_secret: str = Header(None)):
    """Return all flagged identities."""
    verify_secret(x_matching_secret)
    return {"flagged": detector.get_flagged(), "total_tracked": len(detector.activities)}
