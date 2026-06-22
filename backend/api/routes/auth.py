"""Auth endpoints: register and login."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr

from core.auth import register_user, authenticate_user, create_token

router = APIRouter()


class RegisterRequest(BaseModel):
    email: str
    name: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/auth/register")
def register(req: RegisterRequest):
    try:
        user = register_user(req.email, req.name, req.password)
        token = create_token(user["email"], user["name"])
        return {"user": user, "token": token}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/auth/login")
def login(req: LoginRequest):
    user = authenticate_user(req.email, req.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token(user["email"], user["name"])
    return {"user": user, "token": token}
