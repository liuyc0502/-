import json
import re
from typing import Any, Dict, Iterable, Optional


_CODE_FENCE_PATTERN = re.compile(r"```(?:json)?\s*(.*?)\s*```", re.IGNORECASE | re.DOTALL)


def extract_json_object(
    text: str,
    required_keys: Optional[Iterable[str]] = None,
) -> Optional[Dict[str, Any]]:
    """Extract the first JSON object that matches the required keys."""
    if not text:
        return None

    required = set(required_keys or [])
    for candidate in _iter_json_candidates(text):
        try:
            parsed = json.loads(candidate)
        except json.JSONDecodeError:
            continue

        if isinstance(parsed, dict) and required.issubset(parsed.keys()):
            return parsed

    return None


def _iter_json_candidates(text: str):
    seen = set()

    for segment in _iter_candidate_segments(text):
        normalized = segment.strip()
        if normalized and normalized not in seen:
            seen.add(normalized)
            yield normalized

        for candidate in _iter_balanced_json_objects(segment):
            normalized = candidate.strip()
            if normalized and normalized not in seen:
                seen.add(normalized)
                yield normalized


def _iter_candidate_segments(text: str):
    for match in _CODE_FENCE_PATTERN.finditer(text):
        yield match.group(1)
    yield text


def _iter_balanced_json_objects(text: str):
    for start, ch in enumerate(text):
        if ch != "{":
            continue

        end = _find_balanced_json_end(text, start)
        if end is not None:
            yield text[start : end + 1]


def _find_balanced_json_end(text: str, start: int) -> Optional[int]:
    depth = 0
    in_string = False
    escaped = False

    for idx in range(start, len(text)):
        ch = text[idx]

        if in_string:
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == '"':
                in_string = False
            continue

        if ch == '"':
            in_string = True
            continue

        if ch == "{":
            depth += 1
            continue

        if ch == "}":
            depth -= 1
            if depth == 0:
                return idx

    return None
