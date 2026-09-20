// Register (or inspect) the Telegram bot webhook.
//
//   pnpm telegram:webhook            → show what Telegram currently has
//   pnpm telegram:webhook --apply    → point it at SITE_URL/api/telegram/webhook
//   pnpm telegram:webhook --delete   → unregister
//
// Dry-run by default, like the repo's other one-off scripts. Registering is
// what turns the buttons on: without it Telegram has nowhere to deliver a
// press, and the buttons render but do nothing.

import fs from "node:fs";
import path from "node:path";

function loadEnv(): void {
  const file = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }
}

loadEnv();

const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_BOT_SECRET;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://invitus.com.ua";

if (!token) {
  console.error("TELEGRAM_BOT_TOKEN is not set (.env.local)");
  process.exit(1);
}

const api = (method: string, body?: unknown) =>
  fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  }).then((r) => r.json());

const apply = process.argv.includes("--apply");
const remove = process.argv.includes("--delete");

if (remove) {
  console.log(await api("deleteWebhook"));
  process.exit(0);
}

const url = `${siteUrl.replace(/\/+$/, "")}/api/telegram/webhook`;

if (!apply) {
  const info = await api("getWebhookInfo");
  console.log("Зараз зареєстровано:");
  console.log(JSON.stringify(info.result, null, 2));
  console.log(`\nБуде встановлено: ${url}`);
  console.log(`secret_token: ${secret ? "є" : "ВІДСУТНІЙ — спершу задай TELEGRAM_BOT_SECRET"}`);
  console.log("\nDry-run. Запусти з --apply, щоб застосувати.");
  process.exit(0);
}

if (!secret) {
  console.error("TELEGRAM_BOT_SECRET is not set — refusing to register an unguarded webhook");
  process.exit(1);
}

// allowed_updates is narrowed to callback_query on purpose: the bot has no
// reason to receive every message posted in the group, and not receiving them
// is the cheapest way to keep them out of the logs.
const result = await api("setWebhook", {
  url,
  secret_token: secret,
  allowed_updates: ["callback_query"],
  drop_pending_updates: true,
});
console.log(result);
