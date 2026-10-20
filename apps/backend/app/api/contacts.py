from typing import Annotated, Any

from fastapi import APIRouter, Query

from app.api.dependencies import Contacts, Tags
from app.errors import error_body
from app.schemas.activity import ActivityOut
from app.schemas.contact import ContactFilters, ContactOut, ContactPage, ContactUpdate
from app.schemas.tag import BulkTagAssign, BulkTagResult, TagAssign

router = APIRouter(prefix="/contacts", tags=["contacts"])

CONFLICT_RESPONSE: dict[int | str, dict[str, Any]] = {
    409: {
        "description": "Version conflict or duplicate email",
        "content": {"application/json": {"example": error_body("version_conflict", "...")}},
    }
}


@router.get("")
def list_contacts(service: Contacts, filters: Annotated[ContactFilters, Query()]) -> ContactPage:
    items, total = service.search(filters)
    return ContactPage(
        items=[ContactOut.model_validate(contact) for contact in items],
        total=total,
        page=filters.page,
        page_size=filters.page_size,
    )


@router.post("/bulk/tags")
def bulk_assign_tag(body: BulkTagAssign, tags: Tags) -> BulkTagResult:
    return tags.bulk_assign(body.contact_ids, body.names)


@router.get("/{contact_id}")
def get_contact(contact_id: int, service: Contacts) -> ContactOut:
    return ContactOut.model_validate(service.get(contact_id))


@router.patch("/{contact_id}", responses=CONFLICT_RESPONSE)
def update_contact(contact_id: int, body: ContactUpdate, service: Contacts) -> ContactOut:
    return ContactOut.model_validate(service.update(contact_id, body))


@router.post("/{contact_id}/tags")
def add_tag(contact_id: int, body: TagAssign, tags: Tags) -> ContactOut:
    return ContactOut.model_validate(tags.add_to_contact(contact_id, body.name))


@router.delete("/{contact_id}/tags/{tag_id}")
def remove_tag(contact_id: int, tag_id: int, tags: Tags) -> ContactOut:
    return ContactOut.model_validate(tags.remove_from_contact(contact_id, tag_id))


@router.get("/{contact_id}/activities")
def contact_activity(
    contact_id: int, service: Contacts, limit: Annotated[int, Query(ge=1, le=100)] = 20
) -> list[ActivityOut]:
    return [
        ActivityOut.model_validate(activity)
        for activity in service.recent_activity(contact_id, limit)
    ]
