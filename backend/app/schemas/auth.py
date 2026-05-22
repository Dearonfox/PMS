from pydantic import BaseModel, Field

from app.schemas.user import UserProfile


class SignupRequest(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    display_name: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=6, max_length=128)


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=1, max_length=128)


class AuthToken(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfile
