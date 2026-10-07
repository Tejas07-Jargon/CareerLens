"""
Live demo probe adapter.

Checks whether the student's deployed project URL is reachable:
- HTTP 2xx response → strong signal
- Load time recorded as depth
- Screenshot captured (if playwright is available) for the demo UI

This is cheap to implement relative to its demo impact:
a working deployment is strong evidence that a project is real.
"""

import time
from typing import Any, Dict, List, Optional

import httpx
import structlog

from app.models.evidence import Evidence

log = structlog.get_logger(__name__)

LIVE_PROBE_RELIABILITY = 0.80


class LiveProbeAdapter:
    """
    Probes a URL and returns an Evidence record.

    Usage
    -----
    adapter = LiveProbeAdapter(url="https://myapp.vercel.app", profile_id="...")
    evidence = adapter.probe()
    """

    def __init__(self, url: str, profile_id: str):
        self.url = url
        self.profile_id = profile_id

    def probe(self) -> Optional[Evidence]:
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)

        result = self._http_probe()
        if result is None:
            return None

        status_code, load_time_s = result
        depth = self._load_time_to_depth(load_time_s)

        return Evidence(
            profile_id=self.profile_id,
            source="live_probe",
            source_url=self.url,
            evidence_type="deployment",
            skill_hints=["Deployment", "DevOps", "Web Development"],
            reliability=LIVE_PROBE_RELIABILITY,
            depth=depth,
            recency=1.0,
            authenticity=1.0,
            locator={
                "url": self.url,
                "http_status": status_code,
                "load_time_s": round(load_time_s, 2),
            },
            extractor_id="live_probe_adapter_v1",
            observed_at=now,
        )

    def _http_probe(self):
        try:
            start = time.perf_counter()
            with httpx.Client(timeout=10, follow_redirects=True) as client:
                resp = client.get(self.url)
            elapsed = time.perf_counter() - start
            if 200 <= resp.status_code < 400:
                log.info("Live probe success", url=self.url, status=resp.status_code)
                return resp.status_code, elapsed
            log.warning("Live probe non-2xx", url=self.url, status=resp.status_code)
            return None
        except Exception as exc:
            log.warning("Live probe failed", url=self.url, error=str(exc))
            return None

    @staticmethod
    def _load_time_to_depth(seconds: float) -> float:
        """Fast < 1s → depth 1.0; slow > 10s → depth 0.2."""
        if seconds <= 1.0:
            return 1.0
        if seconds >= 10.0:
            return 0.2
        # Linear interpolation
        return 1.0 - 0.8 * (seconds - 1.0) / 9.0
