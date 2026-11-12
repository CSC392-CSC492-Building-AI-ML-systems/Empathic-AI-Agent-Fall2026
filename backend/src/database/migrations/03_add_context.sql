ALTER TABLE sessions
    ADD context TEXT,
    ADD tool_context TEXT,
    ADD terminated BOOLEAN DEFAULT false;

ALTER TABLE users DROP COLUMN profile;

CREATE TABLE user_memories (
    user_id UUID NOT NULL,
    memory_key TEXT NOT NULL,
    content TEXT NOT NULL,

    PRIMARY KEY (user_id, memory_key),
    FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
);
