// Meta and Google Ad spend arrives in the Admin automatically (PRD #103), so
// the same money typed in by hand is counted twice. The form warns rather than
// refuses: a blogger paid through Instagram, or a Google Workspace invoice, is a
// real manual Expense that merely shares a name.
//
// Pure, and imported by the client form: no dependencies.

export type AdPlatform = "Meta" | "Google";

// A name counts only as a whole word: "Metal buckles" is not Meta. `\b` knows
// only ASCII letters, so the boundaries are spelled out for Cyrillic too.
const word = (body: string) => new RegExp(`(?<![\\p{L}\\p{N}])(?:${body})(?![\\p{L}\\p{N}])`, "iu");

const ADS = "ads|таргет\\p{L}*|реклам\\p{L}*";
const INSTAGRAM = "instagram|інстаграм\\p{L}*|инстаграм\\p{L}*";

const PATTERNS: Array<[AdPlatform, RegExp]> = [
  // Not "мета": in Ukrainian that is "goal", and in a title it usually is.
  ["Meta", word("meta|facebook|фейсбук\\p{L}*|фб")],
  // Instagram alone is a blogger or a DM; Instagram *ads* is Meta.
  ["Meta", word(`(?:${INSTAGRAM})\\s+(?:${ADS})|(?:${ADS})\\s+(?:(?:в|у|in)\\s+)?(?:${INSTAGRAM})`)],
  ["Google", word("google|гугл\\p{L}*")],
];

/** The ad platform a title seems to be about, or null. */
export function adPlatformIn(title: string): AdPlatform | null {
  for (const [platform, pattern] of PATTERNS) if (pattern.test(title)) return platform;
  return null;
}
