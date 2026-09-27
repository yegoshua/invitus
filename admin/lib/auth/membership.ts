// Is this Telegram user in the Finance chat right now? (ADR 0002)

export type Membership = "member" | "not-member" | "unknown";

/** getChatMember statuses that mean "in the chat". */
const IN_CHAT = new Set(["creator", "administrator", "member"]);

export function membershipFromStatus(
  status: string | undefined,
  isMember?: boolean
): Membership {
  if (!status) return "unknown";
  if (IN_CHAT.has(status)) return "member";
  // A restricted user is still in the chat unless Telegram says otherwise.
  if (status === "restricted") return isMember ? "member" : "not-member";
  return "not-member";
}

/**
 * "unknown" means Telegram could not answer (timeout, 5xx, bad config). The
 * caller decides: a fresh login is refused, an existing session keeps its
 * last known answer — a Telegram outage must not lock the owners out, and
 * must not let a stranger in either.
 */
export async function checkFinanceChatMembership(userId: number): Promise<Membership> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_FINANCE_CHAT_ID;
  if (!token || !chatId) {
    console.error("[auth] TELEGRAM_BOT_TOKEN or TELEGRAM_FINANCE_CHAT_ID is not set");
    return "unknown";
  }
  try {
    const url = new URL(`https://api.telegram.org/bot${token}/getChatMember`);
    url.searchParams.set("chat_id", chatId);
    url.searchParams.set("user_id", String(userId));
    const res = await fetch(url, { signal: AbortSignal.timeout(5000), cache: "no-store" });
    const body = (await res.json()) as {
      ok: boolean;
      description?: string;
      result?: { status?: string; is_member?: boolean };
    };
    if (!body.ok) {
      // Telegram answers a user who never joined with a 400, not a status.
      // Anything else — "chat not found" above all — is our config, and
      // reporting it as "not a member" would hide it behind a locked door.
      if (/user not found|PARTICIPANT_ID_INVALID/i.test(body.description ?? "")) {
        return "not-member";
      }
      console.error("[auth] getChatMember failed:", body.description);
      return "unknown";
    }
    return membershipFromStatus(body.result?.status, body.result?.is_member);
  } catch (error) {
    console.error("[auth] getChatMember threw:", error);
    return "unknown";
  }
}
