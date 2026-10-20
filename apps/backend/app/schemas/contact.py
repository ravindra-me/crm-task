import re
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.schemas.tag import TagOut

PHONE_PATTERN = re.compile(r"^\+?[0-9 ().-]+$")

SortField = Literal["name", "created_at"]
SortOrder = Literal["asc", "desc"]


class ContactOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    first_name: str
    last_name: str
    email: str | None
    phone: str | None
    company: str | None
    tags: list[TagOut]
    version: int
    created_at: datetime
    updated_at: datetime


class ContactPage(BaseModel):
    items: list[ContactOut]
    total: int
    page: int
    page_size: int


class ContactUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    version: int = Field(ge=1)
    first_name: str | None = Field(default=None, max_length=100)
    last_name: str | None = Field(default=None, max_length=100)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=32)
    company: str | None = Field(default=None, max_length=200)

    @field_validator("first_name", "last_name", mode="before")
    @classmethod
    def name_is_required(cls, value: object) -> object:
        if value is None or (isinstance(value, str) and not value.strip()):
            raise ValueError("This field is required")
        return value.strip() if isinstance(value, str) else value

    @field_validator("email", "phone", "company", mode="before")
    @classmethod
    def empty_text_means_none(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip() or None
        return value

    @field_validator("email")
    @classmethod
    def lowercase_email(cls, value: str | None) -> str | None:
        return value.lower() if value else value

    @field_validator("phone")
    @classmethod
    def phone_is_valid(cls, value: str | None) -> str | None:
        if value is None:
            return None
        digits = re.sub(r"\D", "", value)
        if not PHONE_PATTERN.match(value) or not 7 <= len(digits) <= 15:
            raise ValueError("Enter a valid phone number")
        return value

    def changes(self) -> dict[str, str | None]:
        return self.model_dump(include=self.model_fields_set - {"version"})


class ContactFilters(BaseModel):
    search: str | None = Field(default=None, max_length=100)
    tag_ids: list[int] = Field(default_factory=list, max_length=20)
    company: str | None = Field(default=None, max_length=200)
    sort_by: SortField = "created_at"
    sort_order: SortOrder = "desc"
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=10, ge=1, le=100)
