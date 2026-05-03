import ast
import json
from typing import Any


def parse_json_array_text(value: str | None) -> list[str]:
    """Parse a JSON array string, with safe compatibility for legacy list strings."""
    if not value:
        return []

    parsed: Any
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError:
        try:
            parsed = ast.literal_eval(value)
        except (ValueError, SyntaxError):
            return []

    if not isinstance(parsed, list):
        return []

    return [item for item in parsed if isinstance(item, str)]


def normalize_json_array_text(value: str | None) -> str | None:
    if value is None:
        return None
    return json.dumps(parse_json_array_text(value), ensure_ascii=False)
