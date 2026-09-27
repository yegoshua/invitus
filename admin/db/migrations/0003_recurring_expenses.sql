-- Recurring payments (#121): subscriptions billed monthly or yearly — Strapi
-- Cloud, KeyCRM, Vercel, the domain — entered once as a template, and written
-- into the Expenses journal by a daily cron on the day they are due.
--
-- What the cron writes is an ordinary manual Expense (source 'manual', the
-- template's author as its author), so it is edited and deleted like any
-- other and the CHECKs on `expenses` hold unchanged.

CREATE TABLE recurring_expenses (
  id           bigint   GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title        text     NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  -- What the subscription is billed in. A dollar one is converted at the
  -- NBU rate of the day it is due; the card's real charge (the bank's rate
  -- and fees) is corrected on the Expense itself.
  currency     text     NOT NULL DEFAULT 'UAH' CHECK (currency IN ('UAH', 'USD')),
  -- Kopecks or cents, per `currency`.
  amount_minor bigint   NOT NULL CHECK (amount_minor > 0),
  -- A manual category (lib/expenses/categories.ts), like expenses.category.
  category     text     NOT NULL,
  cadence      text     NOT NULL CHECK (cadence IN ('monthly', 'yearly')),
  -- Past the month's end means the month's last day (lib/recurring/schedule.ts).
  day_of_month smallint NOT NULL CHECK (day_of_month BETWEEN 1 AND 31),
  month        smallint CHECK (month BETWEEN 1 AND 12),
  starts_on    date     NOT NULL,
  ends_on      date,
  paused       boolean  NOT NULL DEFAULT false,
  comment      text     CHECK (char_length(comment) <= 1000),
  -- The last Kyiv day a generator run covered; null before the first. The
  -- next run starts the day after, which is what makes a missed night catch
  -- up and an edited template change only what is still to come.
  generated_through date,
  author_id       bigint NOT NULL,
  author_name     text   NOT NULL,
  updated_by_id   bigint,
  updated_by_name text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CHECK ((cadence = 'yearly') = (month IS NOT NULL)),
  CHECK (ends_on IS NULL OR ends_on >= starts_on)
);

-- Every (template, due day) the generator has ever written. This, not the
-- Expense, is the uniqueness: the Expense can be re-dated after the bank
-- charged a day late, or deleted because the charge never happened, and
-- neither may make the cron write that occurrence again.
CREATE TABLE recurring_occurrences (
  recurring_id bigint NOT NULL REFERENCES recurring_expenses (id) ON DELETE CASCADE,
  due_on       date   NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (recurring_id, due_on)
);

-- Which template an Expense came from: the journal's «регулярний» marker.
-- Deleting the template keeps the money that already left.
ALTER TABLE expenses ADD COLUMN recurring_id bigint REFERENCES recurring_expenses (id) ON DELETE SET NULL;
ALTER TABLE expenses ADD CHECK (recurring_id IS NULL OR source = 'manual');
CREATE INDEX expenses_recurring_id ON expenses (recurring_id) WHERE recurring_id IS NOT NULL;
