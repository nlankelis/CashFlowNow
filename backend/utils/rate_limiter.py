import time
from collections import defaultdict
from threading import Lock
from fastapi import HTTPException, Request


class SimpleRateLimiter:
    def __init__(self, requests_limit: int, window_seconds: int = 60):
        self.requests_limit = requests_limit
        self.window_seconds = window_seconds
        self.history = defaultdict(list)
        self.lock = Lock()

    def check(self, key: str) -> None:
        now = time.time()
        window_start = now - self.window_seconds
        with self.lock:
            timestamps = [t for t in self.history[key] if t > window_start]
            if len(timestamps) >= self.requests_limit:
                retry_after = int(self.window_seconds - (now - timestamps[0])) + 1
                raise HTTPException(
                    status_code=429,
                    detail=f"Rate limit exceeded. Maximum {self.requests_limit} requests per minute.",
                    headers={"Retry-After": str(max(1, retry_after))},
                )
            timestamps.append(now)
            self.history[key] = timestamps


def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


login_limiter = SimpleRateLimiter(requests_limit=5, window_seconds=60)
register_limiter = SimpleRateLimiter(requests_limit=3, window_seconds=60)
invoice_limiter = SimpleRateLimiter(requests_limit=10, window_seconds=60)
