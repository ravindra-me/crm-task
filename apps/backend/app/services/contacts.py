from collections.abc import Sequence

from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.errors import EmailTakenError, NotFoundError, VersionConflictError
from app.models import ActivityType, Contact, ContactActivity
from app.repositories.activities import ActivityRepository
from app.repositories.contacts import ContactRepository
from app.schemas.contact import ContactFilters, ContactOut, ContactUpdate

EMAIL_INDEX = "uq_contacts_email_lower"


class ContactService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.contacts = ContactRepository(session)
        self.activities = ActivityRepository(session)

    def search(self, filters: ContactFilters) -> tuple[Sequence[Contact], int]:
        return self.contacts.search(filters)

    def get(self, contact_id: int) -> Contact:
        contact = self.contacts.get(contact_id)
        if contact is None:
            raise NotFoundError("Contact not found")
        return contact

    def update(self, contact_id: int, data: ContactUpdate) -> Contact:
        contact = self.contacts.get(contact_id, lock=True)
        if contact is None:
            raise NotFoundError("Contact not found")

        if contact.version != data.version:
            raise VersionConflictError(
                "This contact was changed by someone else",
                details={"current": ContactOut.model_validate(contact).model_dump(mode="json")},
            )

        changes = {
            field: {"from": getattr(contact, field), "to": value}
            for field, value in data.changes().items()
            if getattr(contact, field) != value
        }
        if not changes:
            self.session.rollback()
            return contact

        new_email = changes.get("email", {}).get("to")
        if new_email and self.contacts.email_taken(new_email, exclude_id=contact.id):
            raise EmailTakenError(
                "Another contact already uses this email", details={"field": "email"}
            )

        for field, change in changes.items():
            setattr(contact, field, change["to"])
        contact.version += 1
        contact.updated_at = func.now()
        self.activities.add([contact.id], ActivityType.CONTACT_UPDATED, {"changes": changes})

        try:
            self.session.commit()
        except IntegrityError as error:
            self.session.rollback()
            if EMAIL_INDEX in str(error.orig):
                raise EmailTakenError(
                    "Another contact already uses this email", details={"field": "email"}
                ) from error
            raise

        self.session.refresh(contact)
        return contact

    def recent_activity(self, contact_id: int, limit: int) -> Sequence[ContactActivity]:
        self.get(contact_id)
        return self.activities.recent(contact_id, limit)
