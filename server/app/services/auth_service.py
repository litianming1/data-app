from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

import bcrypt
from jose import JWTError, jwt


ALGORITHM = "HS256"


@dataclass(frozen=True)
class TokenPayload:
    subject: str
    expires_at: datetime


class AuthError(Exception):
    """Raised when an auth token is missing, malformed, or expired."""


class AuthService:
    """Password hashing and JWT helpers for local account authentication."""

    def __init__(self, secret_key: str, token_expire_minutes: int) -> None:
        self.secret_key = secret_key
        self.token_expire_minutes = token_expire_minutes

    def hash_password(self, password: str) -> str:
        return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode(
            "utf-8"
        )

    def verify_password(self, password: str, password_hash: str) -> bool:
        try:
            return bcrypt.checkpw(
                password.encode("utf-8"), password_hash.encode("utf-8")
            )
        except ValueError:
            return False

    def create_access_token(self, subject: str) -> str:
        expires_at = datetime.now(UTC) + timedelta(minutes=self.token_expire_minutes)
        return jwt.encode(
            {"exp": expires_at, "sub": subject},
            self.secret_key,
            algorithm=ALGORITHM,
        )

    def decode_access_token(self, token: str) -> TokenPayload:
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[ALGORITHM])
        except JWTError as error:
            raise AuthError("Invalid authentication token.") from error

        subject = payload.get("sub")
        expires_at = payload.get("exp")
        if not isinstance(subject, str) or not subject:
            raise AuthError("Invalid authentication token subject.")

        if isinstance(expires_at, int | float):
            expiration = datetime.fromtimestamp(expires_at, UTC)
        elif isinstance(expires_at, str) and expires_at.isdigit():
            expiration = datetime.fromtimestamp(int(expires_at), UTC)
        else:
            raise AuthError("Invalid authentication token expiration.")

        return TokenPayload(subject=subject, expires_at=expiration)