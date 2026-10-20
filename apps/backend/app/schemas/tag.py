import re

from pydantic import BaseModel, ConfigDict, Field, field_validator

TAG_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9 _&-]*$")


def clean_tag_name(value: str) -> str:
    value = " ".join(value.split())
    if not value:
        raise ValueError("Tag name is required")
    if len(value) > 40:
        raise ValueError("Tag name must be 40 characters or fewer")
    if not TAG_PATTERN.match(value):
        raise ValueError("Tag name can only contain letters, numbers, spaces, '-', '_' and '&'")
    return value


class TagOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class TagAssign(BaseModel):
    name: str

    @field_validator("name")
    @classmethod
    def name_is_valid(cls, name: str) -> str:
        return clean_tag_name(name)


class BulkTagAssign(BaseModel):
    contact_ids: list[int] = Field(min_length=1, max_length=1000)
    names: list[str] = Field(min_length=1, max_length=10)

    @field_validator("names")
    @classmethod
    def names_are_valid(cls, names: list[str]) -> list[str]:
        cleaned: list[str] = []
        seen: set[str] = set()
        for name in names:
            clean_name = clean_tag_name(name)
            if clean_name.lower() not in seen:
                seen.add(clean_name.lower())
                cleaned.append(clean_name)
        return cleaned


class BulkTagResult(BaseModel):
    tags: list[TagOut]
    added: int
    already_tagged: int
