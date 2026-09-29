---
name: invitus-article
description: Writes an INVITUS blog article in the brand voice — brief approved by the owner, text in docs/brand-voice.md voice, unslop pass, fact check against primary sources, then a Strapi draft via pnpm publish:article. Use whenever the user asks to write, draft or generate an article, blog post or «статтю» for INVITUS or its blog, including «напиши статтю про…». Always use this instead of aaron-seo-geo:seo-content-writer for this site.
---

# INVITUS article

One article, from topic to Strapi draft. Two checkpoints belong to the owner: the **brief** and the **finished Markdown**. Never write text before the brief is approved, never `--apply` before the Markdown is.

Vocabulary (Topic, Article brief, Brand voice, Photo library) is defined in `CONTEXT.md` → «Блог».

## Before anything

Read all three in full: `docs/brand-voice.md`, `content/articles/yak-obraty-atletychnyy-poyas.md` (voice sample, **not** a structure template), and the «Blog» section of `CLAUDE.md` (what the converter refuses).

## 1. Topic

A Topic is a search query plus the intent behind it (choose / compare / learn technique).

- The user named one → use it, and propose the target query.
- The user said «наступну» or gave nothing → take the top open topic from `memory/` (aaron-seo-geo research: `memory/hot-cache.md`, `memory/research/`).
- Nothing there → ask. Suggest running `aaron-seo-geo:research` for a topic list. Do not invent a keyword and present it as researched.

## 2. Gather, then brief

- **Our products**: URLs from `https://invitus.com.ua/sitemap.xml`; what the site says about a product from its live page. Only link to URLs found there.
- **Photos**: search `content/photo-library/INDEX.md` (built by `pnpm photos:index`). Open each candidate with Read and confirm the product is actually in the frame. Missing library → say so and point to [BRIEF.md](BRIEF.md#photo-library).
- Photo rules: a product in the frame → Photo library only. A scene without our product → Pexels is allowed (key in `CLAUDE.md`). Generated images → never. Nothing fits → write «потрібне фото: …», do not substitute.
- Existing articles in `content/articles/` → candidates for 1–2 internal links.

Draft the brief in the [BRIEF.md](BRIEF.md) format and show it. **Stop and wait for an explicit «так».** Corrections change the brief, not a text that does not exist yet.

## 3. Write

Create `content/articles/<slug>.md` — slug is the transliterated Ukrainian title, like the sample. Front matter: `title`, `slug`, `category`, `excerpt`, `cover`, `images` (src → caption), `seoTitle` (≤ 60 chars), `seoDescription` (≤ 160). `category` is one of ЕКІПІРУВАННЯ, ТЕХНІКА, ТРЕНУВАННЯ, ЗМАГАННЯ, ДОГЛЯД. Copy the approved photos next to the file (they are gitignored); `cover` is mandatory.

Converter limits: no `#` (the title is the h1), no `---`, code fences, tables or raw HTML; an image sits alone on its line.

Everything the brief asserts goes in. Nothing the brief did not assert about **our** product goes in.

## 4. Unslop, then the Ukrainian pass

1. Run `/pstack:unslop` over the body with the override from `docs/brand-voice.md` → «Поправка для unslop»: dashes and «ялинки» stay.
2. Re-read against «Українські AI-маркери» in the same file and fix every hit.
3. Check the INVITUS limits: 2–3 mentions, one `>` quote, 1–2 product links.

## 5. Fact check

List every concrete claim not taken from the brief — numbers, federation rules, physiology — with a primary source (the IPF technical rules, not someone's blog). Mark ⚠ where none was found. This list goes in the chat only, never into the article or the repo.

## 6. Hand over

Run `pnpm publish:article content/articles/<slug>.md` (dry-run) — it must pass. Then give the owner: a link to the file, the fact list, anything that deviates from the brief. **Stop.** The owner reads and edits the Markdown; edits happen there and nowhere else — a later publish overwrites edits made in Strapi.

## 7. Publish the draft

Only after an explicit go: `pnpm publish:article content/articles/<slug>.md --apply`. It writes a **draft** to the production CMS; pressing Publish in the Strapi admin stays with the owner. The `.md` is the source of truth for the text, so it gets committed — and the repo is public, so it is visible on GitHub from that moment.
