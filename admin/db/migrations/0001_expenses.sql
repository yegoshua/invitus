-- Expenses: every hryvnia the business spent, typed in by hand or, from #111,
-- written by the daily Ad spend ingest (CONTEXT: Expense, Ad spend).

CREATE TABLE expenses (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title       text   NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  -- Kopecks. A sum of integers does not drift; a sum of floats does.
  amount_kop  bigint NOT NULL CHECK (amount_kop > 0),
  -- The Kyiv day the money left: the Expense belongs to that period.
  spent_on    date   NOT NULL,
  -- The list lives in code (lib/expenses/categories.ts), not in a CHECK:
  -- one place to add a category, not two.
  category    text   NOT NULL,
  order_id    integer,
  comment     text   CHECK (char_length(comment) <= 1000),
  source      text   NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'meta', 'google')),
  -- Ad spend only: with the day and the source, what makes a re-run an upsert.
  campaign    text,
  -- A person's Telegram user id, and the name they had then; null for the ingest.
  author_id   bigint,
  author_name text,
  -- Who last edited it, when that was someone: the journal says so.
  updated_by_id   bigint,
  updated_by_name text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CHECK ((source = 'manual') = (author_id IS NOT NULL)),
  CHECK ((source = 'manual') = (campaign IS NULL))
);

CREATE INDEX expenses_spent_on ON expenses (spent_on);

-- The ingest re-reads the last days (Meta back-fills them), so the same
-- (day, source, campaign) must land on the same row.
CREATE UNIQUE INDEX expenses_ad_spend_key ON expenses (spent_on, source, campaign) WHERE source <> 'manual';
