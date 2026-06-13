# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
pnpm dev      # Start development server at http://localhost:3000
pnpm build    # Production build
pnpm start    # Start production server
pnpm lint     # Run ESLint
```

## Architecture

Next.js 16 App Router application for INVITUS — a Ukrainian powerlifting equipment e-commerce brand. React 19, TypeScript, Tailwind CSS v4, pnpm.

### Tech Stack
- **Framework**: Next.js 16 (App Router, RSC by default)
- **UI**: React 19, Tailwind CSS v4, shadcn/ui (new-york style, add via `npx shadcn@latest add <component>`)
- **Animation**: Framer Motion (`motion` package) + `react-scroll-parallax`
- **State**: Zustand with persist middleware (cart store in `stores/cart.ts`, persisted to localStorage as `invitus-cart`)
- **Icons**: lucide-react
- **Carousel**: embla-carousel-react
- **Package Manager**: pnpm

### Component Organization
- `components/sections/` — Full-page landing sections (hero, product showcase, FAQ, testimonials, etc.). Each is a self-contained section with its own mock data.
- `components/ui/` — Reusable UI primitives (shadcn/ui base + custom: `product-card`, `cta-link`, `pointer`, `scroll-based-velocity`)
- `components/layout/` — Header (fixed nav with scroll effects, mobile menu, cart badge) and Footer

### Key Patterns
- **Dark mode is always on** — `<html>` has `className="dark"` hardcoded in root layout
- **Two font families**: Golos Text (body, `font-sans`) and Druk (headings, `font-heading`) loaded in `app/layout.tsx`
- **Path alias**: `@/*` maps to project root
- **Providers**: `app/providers.tsx` wraps the app with `ParallaxProvider` (client component boundary)
- **Type definitions**: `types/index.ts` defines `Product`, `CartItem`, `CartState`

### Styling
- Tailwind CSS v4 with CSS variables for theming in `app/globals.css`
- Custom typography utilities: `text-h1`, `text-h2`, `text-h3`, `text-body-1`, `text-body-2`
- Custom layout utility: `container-main` (centered container, max 88rem, `clamp(1.5rem, 5vw, 2rem)` padding — min 24px on mobile). Override via `[--container-px:value]`.
- Custom theme variable: `--radius-section` for section border radius — 32px on mobile, 48px on md+ (768px+)
- Primary brand color: `#E74223` (coral)
- Animation utilities from `tw-animate-css`
- Class merging via `cn()` from `lib/utils.ts` (clsx + tailwind-merge)

### Content & Locale
- All UI text is in Ukrainian
- Prices formatted in UAH (₴) using Ukrainian locale
- SEO metadata in Ukrainian

### Checkout
- Page route: `app/checkout/page.tsx`. Components in `components/checkout/`. Reusable form primitives in `components/ui/` (`labeled-field`, `icon-input`, `searchable-select`, `radio-card`).
- Form validation via React Hook Form + Zod. Schema lives in `lib/checkout-schema.ts`.
- Delivery uses Nova Poshta. Browser hits a server proxy at `app/api/nova-poshta/route.ts` → forwards to `api.novaposhta.ua` (NP blocks direct browser fetches). Client code in `lib/nova-poshta.ts` + hooks in `hooks/use-nova-poshta.ts`. Requires `NOVA_POSHTA_API_KEY` in `.env.local` (server-only, never reaches the client bundle).
- Submit currently logs the order to console + shows success state + clears the cart (no backend yet).
- **Online payments** — `paymentMethod === "online"` redirects through Monobank acquiring. Client → `app/api/monobank/create-invoice` → Monobank → `app/payment-result` (status check + cart clear on success). Server-side client in `lib/monobank.ts`. Requires `MONOBANK_TOKEN` in `.env.local` (server-only). Status endpoint at `app/api/monobank/status`. Test tokens available at https://api.monobank.ua/.

Pexels api key - AQT9iudesPqlSQYM2L4gVI39ypXc07BTJUNOmNAEk5Nk73bLn5LyPiz6