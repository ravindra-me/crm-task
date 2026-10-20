import re
from collections.abc import Sequence
from typing import Any

from sqlalchemy import ColumnElement, exists, func, literal_column, or_, select, update
from sqlalchemy.orm import Session, selectinload

from app.models import Contact, ContactTag
from app.schemas.contact import ContactFilters

FULL_NAME = func.lower(Contact.first_name + literal_column("' '") + Contact.last_name)

SORT_COLUMNS: dict[str, list[Any]] = {
    "name": [func.lower(Contact.first_name), func.lower(Contact.last_name), Contact.id],
    "created_at": [Contact.created_at, Contact.id],
}


def like_pattern(value: str) -> str:
    escaped = value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"


class ContactRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get(self, contact_id: int, *, lock: bool = False) -> Contact | None:
        statement = (
            select(Contact).where(Contact.id == contact_id).options(selectinload(Contact.tags))
        )
        if lock:
            statement = statement.with_for_update(of=Contact)
        return self.session.scalars(statement).one_or_none()

    def search(self, filters: ContactFilters) -> tuple[Sequence[Contact], int]:
        conditions = self._conditions(filters)

        total = (
            self.session.scalar(select(func.count()).select_from(Contact).where(*conditions)) or 0
        )

        descending = filters.sort_order == "desc"
        order_by = [
            column.desc() if descending else column.asc()
            for column in SORT_COLUMNS[filters.sort_by]
        ]

        statement = (
            select(Contact)
            .where(*conditions)
            .order_by(*order_by)
            .offset((filters.page - 1) * filters.page_size)
            .limit(filters.page_size)
            .options(selectinload(Contact.tags))
        )
        return self.session.scalars(statement).all(), total

    def _conditions(self, filters: ContactFilters) -> list[ColumnElement[bool]]:
        conditions: list[ColumnElement[bool]] = []

        search = (filters.search or "").strip().lower()
        if search:
            pattern = like_pattern(search)
            matches = [
                FULL_NAME.like(pattern),
                func.lower(Contact.email).like(pattern),
            ]
            digits = re.sub(r"\D", "", search)
            if len(digits) >= 3:
                matches.append(Contact.phone_digits.like(f"%{digits}%"))
            conditions.append(or_(*matches))

        company = (filters.company or "").strip().lower()
        if company:
            conditions.append(func.lower(Contact.company).like(like_pattern(company)))

        if filters.tag_ids:
            conditions.append(
                exists().where(
                    ContactTag.contact_id == Contact.id, ContactTag.tag_id.in_(filters.tag_ids)
                )
            )

        return conditions

    def email_taken(self, email: str, exclude_id: int) -> bool:
        statement = select(
            exists().where(func.lower(Contact.email) == email.lower(), Contact.id != exclude_id)
        )
        return bool(self.session.scalar(statement))

    def existing_ids(self, contact_ids: list[int]) -> set[int]:
        return set(self.session.scalars(select(Contact.id).where(Contact.id.in_(contact_ids))))

    def touch(self, contact_ids: list[int]) -> None:
        if contact_ids:
            self.session.execute(
                update(Contact).where(Contact.id.in_(contact_ids)).values(updated_at=func.now())
            )
