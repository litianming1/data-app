from collections.abc import Sequence

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

from app.core.config import Settings
from app.models.chat import ConversationMessage
from app.models.skill import SkillItem


class DeepSeekService:
    """OpenAI-compatible DeepSeek chat wrapper."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def _model(self) -> ChatOpenAI:
        if not self.settings.deepseek_api_key or self.settings.deepseek_api_key.startswith("your_"):
            raise RuntimeError("DEEPSEEK_API_KEY is not configured")

        return ChatOpenAI(
            api_key=self.settings.deepseek_api_key,
            base_url=self.settings.deepseek_base_url,
            model=self.settings.deepseek_model,
            temperature=0.7,
        )

    def _messages(
        self,
        message: str,
        mode: str,
        history: Sequence[ConversationMessage] | None = None,
        triggered_skills: Sequence[SkillItem] | None = None,
    ) -> list[SystemMessage | HumanMessage | AIMessage]:
        system_prompt = (
            "你是 AI App 的中文 AI 助手。"
            "请根据用户问题给出清晰、直接、可执行的回答。"
            f"当前回复模式为：{mode}。"
        )
        if triggered_skills:
            skill_lines = ["本轮已触发以下 Skills，请优先遵循它们的说明："]
            for skill in triggered_skills:
                skill_lines.append(
                    f"- {skill.name}（{skill.category}，触发：{skill.trigger}）："
                    f"{skill.instructions}"
                )
            system_prompt = f"{system_prompt}\n" + "\n".join(skill_lines)

        messages: list[SystemMessage | HumanMessage | AIMessage] = [
            SystemMessage(content=system_prompt)
        ]

        for item in history or []:
            if item.role == "assistant":
                messages.append(AIMessage(content=item.content))
            else:
                messages.append(HumanMessage(content=item.content))

        messages.append(HumanMessage(content=message))
        return messages

    @staticmethod
    def _content_to_text(content: object) -> str:
        if isinstance(content, str):
            return content
        if isinstance(content, list):
            parts: list[str] = []
            for item in content:
                if isinstance(item, str):
                    parts.append(item)
                elif isinstance(item, dict):
                    text = item.get("text")
                    if isinstance(text, str):
                        parts.append(text)
            return "".join(parts)
        return str(content) if content is not None else ""

    async def generate(
        self,
        message: str,
        mode: str,
        history: Sequence[ConversationMessage] | None = None,
        triggered_skills: Sequence[SkillItem] | None = None,
    ) -> str:
        response = await self._model().ainvoke(
            self._messages(message, mode, history, triggered_skills)
        )
        return self._content_to_text(response.content)

    async def stream(
        self,
        message: str,
        mode: str,
        history: Sequence[ConversationMessage] | None = None,
        triggered_skills: Sequence[SkillItem] | None = None,
    ):
        async for chunk in self._model().astream(
            self._messages(message, mode, history, triggered_skills)
        ):
            text = self._content_to_text(chunk.content)
            if text:
                yield text