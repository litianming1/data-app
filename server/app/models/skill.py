from typing import Literal

from pydantic import BaseModel, Field


SkillStatus = Literal["enabled", "disabled"]


class SkillBase(BaseModel):
    category: str = Field(..., min_length=1)
    description: str = Field(..., min_length=1)
    instructions: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    status: SkillStatus = "enabled"
    trigger: str = Field(..., min_length=1)


class SkillCreate(SkillBase):
    id: str | None = None
    usageCount: int = 0


class SkillUpdate(BaseModel):
    category: str | None = Field(default=None, min_length=1)
    description: str | None = Field(default=None, min_length=1)
    instructions: str | None = Field(default=None, min_length=1)
    name: str | None = Field(default=None, min_length=1)
    status: SkillStatus | None = None
    trigger: str | None = Field(default=None, min_length=1)
    usageCount: int | None = None


class SkillItem(SkillBase):
    id: str
    updatedAt: str
    usageCount: int = 0
