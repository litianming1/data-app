from pathlib import Path
from tempfile import TemporaryDirectory

from fastapi import UploadFile
from markitdown import MarkItDown

from app.models.markitdown import MarkItDownResponse


class MarkItDownConversionError(RuntimeError):
    """Raised when an uploaded file cannot be converted to Markdown."""


async def convert_upload_to_markdown(upload: UploadFile) -> MarkItDownResponse:
    if not upload.filename:
        raise ValueError("Uploaded file must include a filename.")

    content = await upload.read()
    if not content:
        raise ValueError("Uploaded file is empty.")

    try:
        with TemporaryDirectory() as temporary_directory:
            file_path = Path(temporary_directory) / Path(upload.filename).name
            file_path.write_bytes(content)

            result = MarkItDown().convert(file_path)
    except Exception as error:
        raise MarkItDownConversionError("File conversion failed.") from error
    finally:
        await upload.close()

    markdown = result.text_content.strip()
    if not markdown:
        raise MarkItDownConversionError("Converted markdown is empty.")

    return MarkItDownResponse(
        content_type=upload.content_type,
        filename=upload.filename,
        markdown=markdown,
    )