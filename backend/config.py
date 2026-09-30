import os

DEFAULT_ALLOWED_ORIGINS = [
    "http://127.0.0.1:5173",
    "http://localhost:5173",
    "https://nlankelis.github.io",
    "https://cash-flow-now-ten.vercel.app",
]
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", ",".join(DEFAULT_ALLOWED_ORIGINS)).split(",")
    if origin.strip()
]
ALLOWED_ORIGIN_REGEX = os.getenv("ALLOWED_ORIGIN_REGEX", r"https://.*\.vercel\.app")

MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024
MANUAL_REVIEW_AMOUNT_THRESHOLD = 150_000
REJECT_AMOUNT_THRESHOLD = 1_000_000
MAX_LAYOUT_SIGNATURES = 100
DATABASE_PATH = os.getenv("DATABASE_PATH", os.path.join(os.path.dirname(__file__), "cashflownow.db"))

