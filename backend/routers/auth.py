from fastapi import APIRouter, Request

from schemas import AuthResponse, LoginRequest, RegisterRequest
from services import auth_service
from utils.rate_limiter import get_client_ip, login_limiter, register_limiter

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=AuthResponse)
def register_user(payload: RegisterRequest, request: Request) -> AuthResponse:
    register_limiter.check(get_client_ip(request))
    user, access_token = auth_service.register_user(payload)
    return AuthResponse(user=user, access_token=access_token, token_type="bearer")


@router.post("/login", response_model=AuthResponse)
def login_user(payload: LoginRequest, request: Request) -> AuthResponse:
    login_limiter.check(get_client_ip(request))
    user, access_token = auth_service.login_user(payload)
    return AuthResponse(user=user, access_token=access_token, token_type="bearer")
