"""JWT authentication: register, login, token verification — backed by SQLite."""

import os
import hashlib
import hmac
import time
import json
import base64
from typing import Optional

from state.database import create_user, get_user

SECRET_KEY = os.getenv("JWT_SECRET", "revcast-dev-secret-change-in-production")
TOKEN_EXPIRY = 86400  # 24 hours


def _hash_password(password: str) -> str:
    salt = os.urandom(16).hex()
    hashed = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100000).hex()
    return f"{salt}:{hashed}"


def _verify_password(password: str, stored: str) -> bool:
    salt, hashed = stored.split(":")
    check = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100000).hex()
    return hmac.compare_digest(check, hashed)


def register_user_action(email: str, name: str, password: str) -> dict:
    pw_hash = _hash_password(password)
    success = create_user(email, name, pw_hash)
    if not success:
        raise ValueError("Email already registered")
    return {"email": email, "name": name}


def authenticate_user(email: str, password: str) -> Optional[dict]:
    user = get_user(email)
    if not user:
        return None
    if not _verify_password(password, user["password_hash"]):
        return None
    return {"email": user["email"], "name": user["name"]}


def create_token(email: str, name: str) -> str:
    header = base64.urlsafe_b64encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode()).decode().rstrip("=")
    payload = base64.urlsafe_b64encode(json.dumps({
        "email": email,
        "name": name,
        "exp": int(time.time()) + TOKEN_EXPIRY,
    }).encode()).decode().rstrip("=")
    signature = hmac.new(SECRET_KEY.encode(), f"{header}.{payload}".encode(), hashlib.sha256).hexdigest()
    return f"{header}.{payload}.{signature}"


def verify_token(token: str) -> Optional[dict]:
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        header, payload, signature = parts
        expected_sig = hmac.new(SECRET_KEY.encode(), f"{header}.{payload}".encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected_sig):
            return None
        padding = 4 - len(payload) % 4
        if padding != 4:
            payload += "=" * padding
        data = json.loads(base64.urlsafe_b64decode(payload))
        if data.get("exp", 0) < time.time():
            return None
        return {"email": data["email"], "name": data["name"]}
    except Exception:
        return None
