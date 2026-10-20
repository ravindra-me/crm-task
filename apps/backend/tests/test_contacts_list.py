from datetime import UTC, datetime, timedelta

import pytest

URL = "/api/v1/contacts"


def names(response):
    return [
        f"{contact['first_name']} {contact['last_name']}" for contact in response.json()["items"]
    ]


@pytest.fixture
def people(make_contact):
    now = datetime.now(UTC)
    contact_ids = {
        "ada": make_contact(
            first_name="Ada",
            last_name="Lovelace",
            email="ada@analytical.io",
            phone="+44 20 7946 0018",
            company="Analytical Engines",
            created_at=now - timedelta(days=3),
        ),
        "grace": make_contact(
            first_name="Grace",
            last_name="Hopper",
            email="grace@navy.mil",
            phone="(555) 010-2030",
            company="US Navy",
            created_at=now - timedelta(days=1),
        ),
        "alan": make_contact(
            first_name="Alan",
            last_name="Turing",
            email=None,
            phone=None,
            company="Bletchley Park",
            created_at=now - timedelta(days=2),
        ),
    }
    return contact_ids


def test_default_sort_is_newest_first(client, people):
    response = client.get(URL)
    assert response.status_code == 200
    assert names(response) == ["Grace Hopper", "Alan Turing", "Ada Lovelace"]
    assert response.json()["total"] == 3


@pytest.mark.parametrize(
    "sort_by, sort_order, expected",
    [
        ("name", "asc", ["Ada Lovelace", "Alan Turing", "Grace Hopper"]),
        ("name", "desc", ["Grace Hopper", "Alan Turing", "Ada Lovelace"]),
        ("created_at", "asc", ["Ada Lovelace", "Alan Turing", "Grace Hopper"]),
        ("created_at", "desc", ["Grace Hopper", "Alan Turing", "Ada Lovelace"]),
    ],
)
def test_sorting(client, people, sort_by, sort_order, expected):
    params = {"sort_by": sort_by, "sort_order": sort_order}
    assert names(client.get(URL, params=params)) == expected


@pytest.mark.parametrize(
    "search, expected",
    [
        ("ada lov", ["Ada Lovelace"]),
        ("HOPPER", ["Grace Hopper"]),
        ("navy.mil", ["Grace Hopper"]),
        ("5550102", ["Grace Hopper"]),
        ("555-010", ["Grace Hopper"]),
        ("nobody", []),
        ("%", []),
    ],
)
def test_search(client, people, search, expected):
    assert names(client.get(URL, params={"search": search})) == expected


def test_filter_by_company(client, people):
    assert names(client.get(URL, params={"company": "bletchley"})) == ["Alan Turing"]


def test_filter_by_tags_matches_any_selected_tag(client, people):
    vip = client.post(f"{URL}/{people['ada']}/tags", json={"name": "VIP"}).json()["tags"][0]
    lead = client.post(f"{URL}/{people['alan']}/tags", json={"name": "Lead"}).json()["tags"][0]
    client.post(f"{URL}/{people['grace']}/tags", json={"name": "Customer"})

    response = client.get(
        URL, params={"tag_ids": [vip["id"], lead["id"]], "sort_by": "name", "sort_order": "asc"}
    )
    assert names(response) == ["Ada Lovelace", "Alan Turing"]


def test_filters_combine(client, people):
    client.post(f"{URL}/{people['ada']}/tags", json={"name": "VIP"})
    vip_id = client.get("/api/v1/tags").json()[0]["id"]

    response = client.get(URL, params={"tag_ids": [vip_id], "company": "navy"})
    assert response.json()["total"] == 0


def test_pagination(client, make_contact):
    for index in range(7):
        make_contact(first_name=f"Name{index}")

    first = client.get(
        URL, params={"page_size": 3, "page": 1, "sort_by": "name", "sort_order": "asc"}
    ).json()
    last = client.get(
        URL, params={"page_size": 3, "page": 3, "sort_by": "name", "sort_order": "asc"}
    ).json()
    beyond = client.get(URL, params={"page_size": 3, "page": 9}).json()

    assert first["total"] == 7 and len(first["items"]) == 3
    assert [contact["first_name"] for contact in last["items"]] == ["Name6"]
    assert beyond["items"] == [] and beyond["total"] == 7


@pytest.mark.parametrize(
    "params",
    [
        {"page": 0},
        {"page_size": 101},
        {"sort_by": "email"},
        {"sort_order": "up"},
        {"tag_ids": "abc"},
        {"search": "x" * 101},
    ],
)
def test_invalid_query_params(client, params):
    response = client.get(URL, params=params)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"


def test_get_contact(client, people):
    response = client.get(f"{URL}/{people['ada']}")
    assert response.status_code == 200
    assert response.json()["email"] == "ada@analytical.io"
    assert response.json()["version"] == 1


def test_get_missing_contact(client):
    response = client.get(f"{URL}/12345")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "not_found"
