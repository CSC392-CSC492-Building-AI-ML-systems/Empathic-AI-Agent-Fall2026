from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from .message import Message

"""Class representing a stored session"""
@dataclass
class Session:
    session_id: UUID
    created_at: datetime
    context: str
    tool_context: str
    terminated: bool
    user_id: UUID
    name: str | None
    messages: list[Message]

    def add_message(self, message: Message) -> None:
        """Add Message object to own list of messages"""
        self.messages.append(message)

    def get_conversation_for_model(self) -> list[dict[str, str]]:
        """Get list of conversation history for model"""
        convo_history = []
        for message in self.messages:
            convo_history.append({"role": message.role,
                                  "content": message.content})
        return convo_history

    def get_conversation_for_frontend(self) -> list[dict[str, str, datetime]]:
        """Get list of conversation history for frontend"""
        convo_history = []
        for message in self.messages:
            if message.role == "tool":
                continue
            convo_history.append({"role": message.role,
                                  "content": message.content,
                                  "created_at": message.created_at})
        return convo_history
