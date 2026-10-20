import pytest
from pydantic import ValidationError

from app.repositories.contacts import like_pattern
from app.schemas.contact import ContactUpdate
from app.schemas.tag import TagAssign


def test_update_normalizes_input():
    data = ContactUpdate.model_validate(
        {"version": 1, "first_name": "  Ada ", "email": " Ada@Example.COM ", "company": "  "}
    )
    assert data.first_name == "Ada"
    assert data.email == "ada@example.com"
    assert data.company is None


def test_update_only_reports_fields_that_were_sent():
    data = ContactUpdate.model_validate({"version": 3, "phone": ""})
    assert data.changes() == {"phone": None}


@pytest.mark.parametrize(
    "payload",
    [
        {"version": 1, "first_name": None},
        {"version": 1, "last_name": "   "},
        {"version": 1, "email": "not-an-email"},
        {"version": 1, "phone": "12ab"},
        {"version": 1, "phone": "123"},
        {"version": 0},
        {"version": 1, "unknown": "x"},
    ],
)
def test_update_rejects_invalid_input(payload):
    with pytest.raises(ValidationError):
        ContactUpdate.model_validate(payload)


def test_tag_name_is_trimmed_and_validated():
    assert TagAssign(name="  Key   Account ").name == "Key Account"
    with pytest.raises(ValidationError):
        TagAssign(name="<script>")
    with pytest.raises(ValidationError):
        TagAssign(name="x" * 41)


def test_like_pattern_escapes_wildcards():
    assert like_pattern("50%_off") == "%50\\%\\_off%"
