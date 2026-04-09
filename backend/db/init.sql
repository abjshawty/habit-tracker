CREATE TABLE IF NOT EXISTS habits (
    id   SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS logs (
    habit_id  INT  REFERENCES habits(id) ON DELETE CASCADE,
    date      DATE NOT NULL DEFAULT CURRENT_DATE,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (habit_id, date)
);

-- Seed some default habits
INSERT INTO habits (name) VALUES
    ('Meditation'),
    ('Exercise'),
    ('Reading')
ON CONFLICT DO NOTHING;
