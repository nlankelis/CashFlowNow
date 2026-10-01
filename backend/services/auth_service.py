from __future__ import annotations

import hashlib
import sqlite3
from datetime import datetime, timedelta, timezone

import bcrypt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from config import ACCESS_TOKEN_EXPIRE_MINUTES, JWT_ALGORITHM, JWT_SECRET_KEY
from database import get_db_connection
from schemas import AuthUserResponse, LoginRequest, RegisterRequest

security = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        if hashed_password.startswith("$2b$") or hashed_password.startswith("$2a$"):
            return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
        # Fallback support for legacy SHA-256 hashes
        return hashlib.sha256(plain_password.encode("utf-8")).hexdigest() == hashed_password
    except Exception:
        return False


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def get_current_user(credentials: HTTPAuthorizationCredentials | None = Depends(security)) -> AuthUserResponse:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Could not validate credentials")
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id_str: str | None = payload.get("sub")
        if user_id_str is None:
            raise HTTPException(status_code=401, detail="Could not validate credentials")
        user_id = int(user_id_str)
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Could not validate credentials")

    with get_db_connection() as connection:
        user = connection.execute(
            "SELECT id, full_name, email FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()

    if user is None:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

    return AuthUserResponse(
        id=int(user["id"]),
        full_name=str(user["full_name"]),
        email=str(user["email"]),
    )


def register_user(payload: RegisterRequest) -> tuple[AuthUserResponse, str]:
    full_name = payload.full_name.strip()
    email = payload.email.strip().lower()
    password = payload.password

    if not full_name:
        raise HTTPException(status_code=400, detail="Full name is required.")
    if not email:
        raise HTTPException(status_code=400, detail="Email is required.")
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    password_hash = hash_password(password)
    created_at = datetime.utcnow().isoformat()

    try:
        with get_db_connection() as connection:
            cursor = connection.execute(
                """
                INSERT INTO users (full_name, email, password_hash, created_at)
                VALUES (?, ?, ?, ?)
                """,
                (full_name, email, password_hash, created_at),
            )
            connection.commit()
            user_id = cursor.lastrowid
    except sqlite3.IntegrityError as exc:
        raise HTTPException(status_code=400, detail="An account with that email already exists.") from exc

    user = AuthUserResponse(
        id=user_id,
        full_name=full_name,
        email=email,
    )
    access_token = create_access_token(data={"sub": str(user_id), "email": email})
    return user, access_token


def login_user(payload: LoginRequest) -> tuple[AuthUserResponse, str]:
    email = payload.email.strip().lower()

    with get_db_connection() as connection:
        user = connection.execute(
            """
            SELECT id, full_name, email, password_hash
            FROM users
            WHERE email = ?
            """,
            (email,),
        ).fetchone()

    if user is None or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    user_response = AuthUserResponse(
        id=int(user["id"]),
        full_name=str(user["full_name"]),
        email=str(user["email"]),
    )
    access_token = create_access_token(data={"sub": str(user["id"]), "email": email})
    return user_response, access_token
