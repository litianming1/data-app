from typing import TypedDict

from langgraph.graph import END, StateGraph

from app.models.chat import ConversationMessage
from app.services.deepseek import DeepSeekService


class ChatState(TypedDict):
    message: str
    mode: str
    history: list[ConversationMessage]
    reply: str


def build_chat_graph(deepseek: DeepSeekService):
    """Build a minimal async LangGraph agent flow.

    The graph currently has one DeepSeek node. Additional agents can be added as
    parallel branches without changing the FastAPI route contract.
    """

    async def call_model(state: ChatState) -> ChatState:
        reply = await deepseek.generate(
            state["message"], state["mode"], state["history"]
        )
        return {**state, "reply": reply}

    graph = StateGraph(ChatState)
    graph.add_node("deepseek", call_model)
    graph.set_entry_point("deepseek")
    graph.add_edge("deepseek", END)
    return graph.compile()