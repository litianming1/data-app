import re

from app.models.skill import SkillItem

_SPLIT_PATTERN = re.compile(r"[\s,，、;；|/]+")


def _keywords(skill: SkillItem) -> list[tuple[str, int]]:
    keywords: list[tuple[str, int]] = []

    for token in _SPLIT_PATTERN.split(skill.trigger):
        normalized = token.strip().lower()
        if normalized:
            keywords.append((normalized, 3))

    for value, weight in ((skill.name, 2), (skill.description, 1)):
        normalized = value.strip().lower()
        if normalized:
            keywords.append((normalized, weight))

    category = skill.category.lower()
    name = skill.name.lower()
    if "调试" in category or "debug" in name:
        keywords.extend((keyword, 2) for keyword in ["修 bug", "bug", "调试"])

    return keywords


def match_skills(message: str, skills: list[SkillItem], limit: int = 3) -> list[SkillItem]:
    """Return enabled Skills that are relevant to the current user message."""

    normalized_message = message.lower()
    scored: list[tuple[int, int, str, SkillItem]] = []

    for skill in skills:
        score = 0
        for keyword, weight in _keywords(skill):
            if keyword in normalized_message:
                score = max(score, weight)

        if score > 0:
            scored.append((score, skill.usageCount, skill.name, skill))

    scored.sort(key=lambda item: (-item[0], -item[1], item[2]))
    return [skill for _, _, _, skill in scored[:limit]]
