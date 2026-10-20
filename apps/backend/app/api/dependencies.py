from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.contacts import ContactService
from app.services.tags import TagService

DbSession = Annotated[Session, Depends(get_db)]


def get_contact_service(session: DbSession) -> ContactService:
    return ContactService(session)


def get_tag_service(session: DbSession) -> TagService:
    return TagService(session)


Contacts = Annotated[ContactService, Depends(get_contact_service)]
Tags = Annotated[TagService, Depends(get_tag_service)]
