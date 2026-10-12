from uuid import UUID

class User:
    """Class representing an entry in the users table"""

    def __init__(self,
                 user_id: UUID,
                 first_name: str,
                 last_name: str,
                 email: str,
                 password: str,
                 profile: str | None,
                 nickname: str | None) -> None:

        self.user_id = user_id
        self.first_name = first_name
        self.last_name = last_name
        self.email = email
        self.password = password
        self.profile = profile
        self.nickname = nickname


