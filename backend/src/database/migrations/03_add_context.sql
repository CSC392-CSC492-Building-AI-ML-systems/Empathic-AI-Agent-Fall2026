ALTER TABLE session
    ADD context TEXT,
    ADD tool_context TEXT,
    ADD terminated BOOLEAN DEFAULT false;

ALTER TABLE users RENAME COLUMN profile TO memory;
