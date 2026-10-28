from datetime import datetime
from uuid import UUID

from .message import Message


class Session:
    """Class representing an entry in the session table"""

    def __init__(self,  session_id: UUID, created_at: datetime, name: str | None = None) -> None:
        self.session_id = session_id
        self.name = name
        self.created_at = created_at
        self.messages: list[Message] = []

    def get_created_at(self) -> datetime:
        """Return the creation timestamp saved by the database."""
        return self.created_at

    def add_message(self, message: Message) -> None:
        """Add Message object to own list of messages"""
        self.messages.append(message)

    def get_conversation_for_model(self) -> list[dict[str, str]]:
        convo_history = []
        for message in self.messages:
            convo_history.append({"role": message.get_role(),
                                  "content": message.get_content()})
        return convo_history

    def get_conversation_for_frontend(self) -> list[dict[str, str, datetime]]:
        convo_history = []
        for message in self.messages:
            convo_history.append({"role": message.get_role(),
                                  "content": message.get_content(),
                                  "created_at": message.get_created_at()})
        return convo_history
