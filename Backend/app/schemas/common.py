from pydantic import BaseModel, Field


class ErrorResponse(BaseModel):
    detail: str
    code: str
    field_errors: dict[str, list[str]] = Field(default_factory=dict)
