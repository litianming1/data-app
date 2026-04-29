from pydantic import BaseModel


class MarkItDownResponse(BaseModel):
    filename: str
    content_type: str | None = None
    markdown: str