import hashlib
import sqlite3
from datetime import datetime

from fastapi import HTTPException

from database import get_db_connection
from schemas import AuthUserResponse, LoginRequest, RegisterRequest


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def register_user(payload: RegisterRequest) -> AuthUserResponse:
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

    return AuthUserResponse(
        id=user_id,
        full_name=full_name,
        email=email,
    )


def login_user(payload: LoginRequest) -> AuthUserResponse:
    email = payload.email.strip().lower()
    password_hash = hash_password(payload.password)

    with get_db_connection() as connection:
        user = connection.execute(
            """
            SELECT id, full_name, email, password_hash
            FROM users
            WHERE email = ?
            """,
            (email,),
        ).fetchone()

    if user is None or user["password_hash"] != password_hash:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    return AuthUserResponse(
        id=int(user["id"]),
        full_name=str(user["full_name"]),
        email=str(user["email"]),
    )

