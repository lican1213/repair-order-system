"""In-memory sliding-window rate limiter for public API endpoints.

No external dependencies.  State lives in the process; resets on restart.
See D-055 (old JWT still valid) and D-057 (async race condition accepted).
"""

import time


class RateLimiter:
    """Sliding-window counter keyed by arbitrary string."""

    def __init__(self) -> None:
        self._records: dict[str, list[float]] = {}

    def check(self, key: str, limit: int, window_seconds: int) -> bool:
        """Return True if the request is allowed, False if rate-limited."""
        now = time.time()
        cutoff = now - window_seconds

        # Clean expired timestamps for this key
        if key in self._records:
            self._records[key] = [t for t in self._records[key] if t > cutoff]
            if not self._records[key]:
                del self._records[key]

        # First request for this key
        if key not in self._records:
            self._records[key] = []

        # Over limit?
        if len(self._records[key]) >= limit:
            return False

        # Record this request
        self._records[key].append(now)
        return True


# Module-level singleton — shared across all requests.
limiter = RateLimiter()
