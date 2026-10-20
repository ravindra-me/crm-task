from collections.abc import Sequence

from sqlalchemy.orm import Session

from app.errors import NotFoundError
from app.models import ActivityType, Contact, Tag
from app.repositories.activities import ActivityRepository
from app.repositories.contacts import ContactRepository
from app.repositories.tags import TagRepository
from app.schemas.tag import BulkTagResult, TagOut


class TagService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.tags = TagRepository(session)
        self.contacts = ContactRepository(session)
        self.activities = ActivityRepository(session)

    def all(self) -> Sequence[Tag]:
        return self.tags.all()

    def add_to_contact(self, contact_id: int, name: str) -> Contact:
        self._ensure_contact(contact_id)
        tag = self.tags.get_or_create(name)
        added = self.tags.attach([contact_id], tag.id)
        self._record(added, ActivityType.TAG_ADDED, tag)
        self.session.commit()
        return self._reload(contact_id)

    def remove_from_contact(self, contact_id: int, tag_id: int) -> Contact:
        self._ensure_contact(contact_id)
        tag = self.tags.get(tag_id)
        if tag is None:
            raise NotFoundError("Tag not found")
        if self.tags.detach(contact_id, tag_id):
            self._record([contact_id], ActivityType.TAG_REMOVED, tag)
        self.session.commit()
        return self._reload(contact_id)

    def bulk_assign(self, contact_ids: list[int], names: list[str]) -> BulkTagResult:
        unique_ids = sorted(set(contact_ids))
        missing = set(unique_ids) - self.contacts.existing_ids(unique_ids)
        if missing:
            raise NotFoundError(
                "Some contacts do not exist", details={"missing_ids": sorted(missing)}
            )

        tags: list[Tag] = []
        added_total = 0
        for name in names:
            tag = self.tags.get_or_create(name)
            added = self.tags.attach(unique_ids, tag.id)
            self._record(added, ActivityType.TAG_ADDED, tag)
            tags.append(tag)
            added_total += len(added)
        self.session.commit()

        return BulkTagResult(
            tags=[TagOut.model_validate(tag) for tag in tags],
            added=added_total,
            already_tagged=len(unique_ids) * len(tags) - added_total,
        )

    def _record(self, contact_ids: list[int], activity_type: ActivityType, tag: Tag) -> None:
        if contact_ids:
            self.contacts.touch(contact_ids)
            self.activities.add(contact_ids, activity_type, {"tag_id": tag.id, "tag": tag.name})

    def _ensure_contact(self, contact_id: int) -> None:
        if not self.contacts.existing_ids([contact_id]):
            raise NotFoundError("Contact not found")

    def _reload(self, contact_id: int) -> Contact:
        contact = self.contacts.get(contact_id)
        if contact is None:
            raise NotFoundError("Contact not found")
        return contact
