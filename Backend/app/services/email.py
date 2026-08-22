import logging
from typing import Protocol

logger = logging.getLogger(__name__)


class EmailSender(Protocol):
    async def send_email_verification(self, email: str, token: str) -> None: ...

    async def send_password_reset(self, email: str, token: str) -> None: ...


class LoggingEmailSender:
    """Development delivery adapter that intentionally never logs secret tokens."""

    async def send_email_verification(self, email: str, token: str) -> None:
        del token
        logger.info("Email verification delivery requested for %s", email)

    async def send_password_reset(self, email: str, token: str) -> None:
        del token
        logger.info("Password reset delivery requested for %s", email)
