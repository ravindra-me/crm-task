import re
import tomllib
from pathlib import Path

BACKEND = Path(__file__).parent.parent


def package_names(lines: list[str]) -> set[str]:
    names = set()
    for line in lines:
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        names.add(re.split(r"[\[=<>~ ]", line, maxsplit=1)[0].lower())
    return names


def test_requirements_txt_matches_pyproject():
    pyproject = tomllib.loads((BACKEND / "pyproject.toml").read_text())
    app = package_names(pyproject["project"]["dependencies"])
    dev = package_names(pyproject["dependency-groups"]["dev"])

    requirements = package_names((BACKEND / "requirements.txt").read_text().splitlines())

    assert requirements == app | dev
