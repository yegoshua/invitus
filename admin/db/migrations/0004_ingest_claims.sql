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
