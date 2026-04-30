from typing import Literal

from pydantic import BaseModel, Field


UserRole = Literal["admin", "user"]


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=1)


class AuthUser(BaseModel):
    id: str
    email: str
    name: str
    role: UserRole = "admin"


class AuthSessionResponse(BaseModel):
    user: AuthUser


class UserItem(AuthUser):
    created_at: str
    updated_at: str


class UserCreate(BaseModel):
    email: str = Field(..., min_length=3)
    name: str = Field(..., min_length=1)
    password: str = Field(..., min_length=6)
    role: UserRole = "user"


class UserUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1)
    password: str | None = Field(default=None, min_length=6)
    role: UserRole | None = None