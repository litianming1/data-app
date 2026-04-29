from datetime import UTC, datetime
from uuid import uuid4

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models.skill import SkillCreate, SkillItem, SkillUpdate


DEFAULT_SKILLS: list[SkillCreate] = [
    SkillCreate(
        category="设计",
        description="生成高质量前端界面、布局和视觉方向。",
        id="frontend-design",
        instructions=(
            "用于页面、组件和视觉体验设计。输出时关注层级、间距、色彩、动效和"
            "可访问性。"
        ),
        name="Frontend Design",
        status="enabled",
        trigger="创建页面、优化 UI、设计组件",
        usageCount=32,
    ),
    SkillCreate(
        category="开发",
        description="把需求拆成可执行步骤，并保持改动小而可验证。",
        id="karpathy-guidelines",
        instructions="实现前先明确成功标准，优先做最小可用改动，避免无关重构。",
        name="Karpathy Guidelines",
        status="enabled",
        trigger="写代码、重构、修复问题",
        usageCount=21,
    ),
    SkillCreate(
        category="调试",
        description="遇到 bug 或测试失败时，按证据链定位根因。",
        id="systematic-debugging",
        instructions=(
            "先复现问题，再收集日志和最小失败案例，最后验证修复是否覆盖根因。"
        ),
        name="Systematic Debugging",
        status="enabled",
        trigger="报错、测试失败、行为异常、修 bug、调试",
        usageCount=18,
    ),
    SkillCreate(
        category="测试",
        description="通过先写验证路径来约束功能实现。",
        id="test-driven-development",
        instructions=(
            "适合新增功能或修复缺陷。先定义失败场景，再实现并跑自动化验证。"
        ),
        name="Test Driven Development",
        status="disabled",
        trigger="新增功能、修 bug、补测试",
        usageCount=9,
    ),
    SkillCreate(
        category="计划",
        description="为多步骤任务生成清晰计划和验收标准。",
        id="writing-plans",
        instructions=(
            "用于需求明确但改动较多的任务。输出分阶段步骤、相关文件和验证方式。"
        ),
        name="Writing Plans",
        status="enabled",
        trigger="制定计划、拆分任务、迁移方案",
        usageCount=15,
    ),
    SkillCreate(
        category="创作",
        description="辅助图片、视频和提示词创作工作流。",
        id="ai-create",
        instructions="用于生成视觉提示词、视频分镜、创作模板和内容改写建议。",
        name="AI Create Assistant",
        status="enabled",
        trigger="图像提示词、视频脚本、创作灵感",
        usageCount=27,
    ),
]


class SkillStore:
    """MongoDB-backed Skill management store."""

    def __init__(self, database: AsyncIOMotorDatabase) -> None:
        self.collection = database["skills"]

    async def ensure_indexes(self) -> None:
        await self.collection.create_index("id", unique=True)
        await self.collection.create_index([("category", 1), ("status", 1)])

    async def seed_defaults(self) -> None:
        if await self.collection.estimated_document_count() > 0:
            return

        today = datetime.now(UTC).date().isoformat()
        await self.collection.insert_many(
            [
                {
                    **skill.model_dump(),
                    "id": skill.id or str(uuid4()),
                    "updatedAt": today,
                }
                for skill in DEFAULT_SKILLS
            ]
        )

    async def list_skills(self) -> list[SkillItem]:
        cursor = self.collection.find({}, {"_id": 0}).sort(
            [("updatedAt", -1), ("name", 1)]
        )
        documents = await cursor.to_list(length=None)
        return [SkillItem(**document) for document in documents]

    async def list_enabled_skills(self) -> list[SkillItem]:
        cursor = self.collection.find({"status": "enabled"}, {"_id": 0}).sort(
            [("usageCount", -1), ("name", 1)]
        )
        documents = await cursor.to_list(length=None)
        return [SkillItem(**document) for document in documents]

    async def create_skill(self, payload: SkillCreate) -> SkillItem:
        skill_id = payload.id or str(uuid4())
        now = datetime.now(UTC).date().isoformat()
        document = {
            **payload.model_dump(exclude={"id"}),
            "id": skill_id,
            "updatedAt": now,
        }
        await self.collection.insert_one(document)
        return SkillItem(**document)

    async def update_skill(self, skill_id: str, payload: SkillUpdate) -> SkillItem | None:
        changes = payload.model_dump(exclude_unset=True)
        if changes:
            changes["updatedAt"] = datetime.now(UTC).date().isoformat()
            await self.collection.update_one({"id": skill_id}, {"$set": changes})

        document = await self.collection.find_one({"id": skill_id}, {"_id": 0})
        return SkillItem(**document) if document else None

    async def delete_skill(self, skill_id: str) -> bool:
        result = await self.collection.delete_one({"id": skill_id})
        return result.deleted_count > 0
