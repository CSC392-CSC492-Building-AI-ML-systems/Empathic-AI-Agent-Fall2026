from uuid import UUID

from .message import Message


class Session:
    """Class representing an entry in the session table"""

    def __init__(self, session_id: UUID, name: str | None = None) -> None:
        self.session_id = session_id
        self.name = name
        self.messages: list[Message] = []

    def add_message(self, message: Message) -> None:
        """Add Message object to own list of messages"""
        self.messages.append(message)

    def get_conversation_as_json(self):
        pass
        # TO DO once we figure out how a convo looks like
