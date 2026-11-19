LOCK TABLE sessions IN ACCESS EXCLUSIVE MODE;

CREATE TABLE message_context (
    session_id UUID NOT NULL,
    context TEXT,

    PRIMARY KEY (session_id),

    FOREIGN KEY (session_id) REFERENCES sessions(id)
        ON DELETE CASCADE
);


CREATE TABLE tool_context (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    session_id UUID NOT NULL,
    context TEXT,

    FOREIGN KEY (session_id) REFERENCES sessions(id)
        ON DELETE CASCADE
);

INSERT INTO message_context (session_id, context)
SELECT id, context FROM sessions WHERE context IS NOT NULL;

INSERT INTO tool_context (session_id, context)
SELECT id, tool_context FROM sessions WHERE tool_context <> '';

CREATE INDEX tool_context_session_id_idx ON tool_context (session_id, id);

ALTER TABLE sessions
    DROP COLUMN tool_context,
    DROP COLUMN context;
