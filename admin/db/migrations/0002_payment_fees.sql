-- Payment fees (#110, CONTEXT: Payment fee): the rate per payment method the
-- estimate uses, the actual fees read from Monobank's statement, and the
-- journal of ingest runs that says how fresh they are.

-- Percent of the order total the bank keeps, per KeyCRM payment method id.
-- Seeded with lib/finance/fees.ts DEFAULT_FEE_PERCENT; edited on the Expenses page.
CREATE TABLE fee_rates (
  payment_method_id integer      PRIMARY KEY,
  percent           numeric(4,2) NOT NULL CHECK (percent >= 0 AND percent < 100),
  updated_by_id     bigint,
  updated_by_name   text,
  updated_at        timestamptz  NOT NULL DEFAULT now()
);

INSERT INTO fee_rates (payment_method_id, percent) VALUES
  (1, 0),    -- Готівка
  (2, 1.3),  -- Карта
  (3, 0),    -- Переказ
  (6, 0),    -- Накладений платіж
  (7, 1.3),  -- Apple/Google Pay
  (9, 3.5);  -- Оплата частинами

-- One row per paid Monobank invoice. The ingest re-reads the last 30 days
-- every night and upserts on invoice_id, so a re-run duplicates nothing.
CREATE TABLE payment_fees (
  invoice_id     text        PRIMARY KEY,
  -- The invoice's `reference`, which the site sets to the KeyCRM order id.
  -- Null when a payment was not made through the site's checkout.
  order_id       integer,
  amount_kop     bigint      NOT NULL CHECK (amount_kop > 0),
  -- amount − profitAmount: what the bank kept.
  fee_kop        bigint      NOT NULL CHECK (fee_kop >= 0 AND fee_kop <= amount_kop),
  paid_at        timestamptz NOT NULL,
  -- The Kyiv day of paid_at, stored so a query by day needs no time zone.
  paid_on        date        NOT NULL,
  payment_scheme text,
  ingested_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX payment_fees_order_id ON payment_fees (order_id);
CREATE INDEX payment_fees_paid_on ON payment_fees (paid_on);

-- Every ingest run, per source, success or failure. The «Дані станом на …»
-- banner reads the latest run and the latest successful one. #111 (Meta) and
-- #112 (GA4) write here under their own source.
CREATE TABLE ingest_runs (
  id          bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source      text        NOT NULL,
  started_at  timestamptz NOT NULL,
  finished_at timestamptz NOT NULL,
  ok          boolean     NOT NULL,
  row_count   integer,
  error       text,
  CHECK (ok = (error IS NULL))
);

CREATE INDEX ingest_runs_latest ON ingest_runs (source, started_at DESC);
