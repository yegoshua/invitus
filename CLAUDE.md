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

This is a Next.js 16 application using the App Router with React 19 and TypeScript.

### Tech Stack
- **Framework**: Next.js 16 (App Router)
- **UI**: React 19, Tailwind CSS v4, shadcn/ui (new-york style)
- **Icons**: lucide-react
- **Package Manager**: pnpm

### Project Structure
- `app/` - Next.js App Router pages and layouts
- `components/ui/` - shadcn/ui components (add via `npx shadcn@latest add <component>`)
- `lib/utils.ts` - Utility functions including `cn()` for class merging

### Path Aliases
- `@/*` maps to project root (e.g., `@/components`, `@/lib/utils`)

### Styling
- Tailwind CSS v4 with CSS variables for theming
- Color tokens defined in `app/globals.css` using OKLCH color space
- Dark mode via `.dark` class
- Animation utilities from `tw-animate-css`

Pexels api key - AQT9iudesPqlSQYM2L4gVI39ypXc07BTJUNOmNAEk5Nk73bLn5LyPiz6