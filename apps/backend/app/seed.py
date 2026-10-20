import argparse
import random
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import func, insert, select, text
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import Contact, ContactTag, Tag

FIRST_NAMES = (
    "Aarav Aisha Alex Amelia Ananya Arjun Ben Carlos Chen Chloe Daniel Diya Elena "
    "Emma Ethan Fatima Gabriel Grace Hannah Isha Ivan James Kabir Kavya Leo Liam "
    "Lucia Maya Meera Mia Noah Olivia Omar Priya Rahul Riya Rohan Sara Sofia Tanvi "
    "Tom Vikram Wei Yusuf Zara"
).split()
LAST_NAMES = (
    "Agarwal Brown Chen Das Davis Fernandez Garcia Gupta Iyer Jain Johnson Kapoor "
    "Khan Kim Kumar Lee Lopez Mehta Miller Nair Nguyen Patel Reddy Rao Shah Sharma "
    "Singh Smith Taylor Verma Wilson Wong"
).split()
COMPANIES = [
    "Acme Corp",
    "Bluewave Labs",
    "Brightpath",
    "Cloudnine Systems",
    "Evergreen Foods",
    "Globex",
    "Helios Energy",
    "Initech",
    "Lumen Health",
    "Northwind Traders",
    "Orbit Logistics",
    "Pinnacle Finance",
    "Quantum Retail",
    "Redwood Media",
    "Summit Education",
    "Zenith Motors",
]
TAGS = ["Lead", "Prospect", "Customer", "VIP", "Partner", "Churned"]


def make_phone(randomizer: random.Random) -> str:
    area = randomizer.randint(200, 999)
    exchange = randomizer.randint(100, 999)
    line = randomizer.randint(1000, 9999)
    number = f"{area}{exchange}{line}"
    style = randomizer.choice(["us", "in", "plain"])
    if style == "us":
        return f"+1 ({number[:3]}) {number[3:6]}-{number[6:]}"
    if style == "in":
        return f"+91 {randomizer.randint(70000, 99999)} {randomizer.randint(10000, 99999)}"
    return number


def build_contacts(count: int, randomizer: random.Random) -> list[dict[str, Any]]:
    now = datetime.now(UTC)
    rows = []
    for index in range(1, count + 1):
        first = randomizer.choice(FIRST_NAMES)
        last = randomizer.choice(LAST_NAMES)
        company = randomizer.choice(COMPANIES) if randomizer.random() > 0.1 else None
        domain = company.lower().replace(" ", "") + ".com" if company else "example.com"
        created = now - timedelta(
            days=randomizer.randint(0, 730), minutes=randomizer.randint(0, 1440)
        )
        email = f"{first}.{last}{index}@{domain}".lower() if randomizer.random() > 0.05 else None
        rows.append(
            {
                "first_name": first,
                "last_name": last,
                "email": email,
                "phone": make_phone(randomizer) if randomizer.random() > 0.1 else None,
                "company": company,
                "created_at": created,
                "updated_at": created,
            }
        )
    return rows


def seed(session: Session, count: int, reset: bool) -> None:
    if reset:
        session.execute(
            text(
                "TRUNCATE contact_activities, contact_tags, contacts, tags RESTART IDENTITY CASCADE"
            )
        )
    elif session.scalar(select(func.count()).select_from(Contact)):
        print("Contacts already exist, skipping. Use --reset to start over.")
        return

    randomizer = random.Random(42)
    session.execute(insert(Tag), [{"name": name} for name in TAGS])
    tag_ids = list(session.scalars(select(Tag.id)))

    batch_size = 5000
    rows = build_contacts(count, randomizer)
    for start in range(0, len(rows), batch_size):
        batch = rows[start : start + batch_size]
        ids = session.scalars(insert(Contact).returning(Contact.id), batch).all()
        links = [
            {"contact_id": contact_id, "tag_id": tag_id}
            for contact_id in ids
            for tag_id in randomizer.sample(tag_ids, k=randomizer.choice([0, 1, 1, 2, 3]))
        ]
        if links:
            session.execute(insert(ContactTag), links)

    session.commit()
    print(f"Seeded {count} contacts and {len(TAGS)} tags.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Fill the database with demo contacts.")
    parser.add_argument("--count", type=int, default=15)
    parser.add_argument("--reset", action="store_true", help="delete existing data first")
    options = parser.parse_args()

    with SessionLocal() as session:
        seed(session, options.count, options.reset)


if __name__ == "__main__":
    main()
