from fastapi import APIRouter

from schemas import AuthResponse, LoginRequest, RegisterRequest
from services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=AuthResponse)
def register_user(payload: RegisterRequest) -> AuthResponse:
    user = auth_service.register_user(payload)
    return AuthResponse(user=user)


@router.post("/login", response_model=AuthResponse)
def login_user(payload: LoginRequest) -> AuthResponse:
    user = auth_service.login_user(payload)
    return AuthResponse(user=user)

