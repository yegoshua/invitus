-- Who is topping up a source right now (#124). A page opened while a source's
-- data is over ten minutes old reads today and yesterday again; two pages
-- opened together — on two server instances — must not both do it. The claim
-- is taken with one conditional upsert, released when the run ends, and
-- expires on its own after two minutes in case the instance holding it died.
-- The nightly cron takes no claim: it owns the long window and always runs.
CREATE TABLE ingest_claims (
  source     text        PRIMARY KEY,
  -- Null once released.
  claimed_at timestamptz,
  -- Which holder, so a run whose claim expired cannot release its successor's.
  token      text
);

-- A run is `full` (the nightly cron's long window, or a `?since=` backfill)
-- or a `top-up` (today and yesterday, on page open). Both keep the data
-- fresh; only a full run catches changes back in time, so its age is warned
-- about on its own (fullSyncWarning in lib/ingest/run.ts). Every run before
-- this migration was the cron's.
ALTER TABLE ingest_runs
  ADD COLUMN kind text NOT NULL DEFAULT 'full' CHECK (kind IN ('full', 'top-up'));
