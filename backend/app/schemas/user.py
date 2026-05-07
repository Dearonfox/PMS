from pydantic import BaseModel, ConfigDict, Field


class UserSyncRequest(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    display_name: str = Field(min_length=1, max_length=100)
    auth_provider: str = Field(min_length=1, max_length=30)
    provider_user_id: str = Field(min_length=1, max_length=255)


class UserProfile(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    display_name: str
    auth_provider: str
    provider_user_id: str
    is_active: bool
