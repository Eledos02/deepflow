# DeepFlow

DeepFlow is a server-first productivity platform foundation for focus timers,
Pomodoro workflows, countdown tools, and content-led acquisition.

## Stack

- Next.js App Router
- React and TypeScript
- CSS design tokens with no client-side styling runtime
- Vitest for timer-domain unit tests

## Architecture

```text
src/
  app/                  Route composition and metadata endpoints
  components/           Shared UI, marketing, product, and SEO components
  content/              Typed editorial and programmatic SEO registries
  features/timer/       Timer domain logic and client runtime
  lib/                  Site configuration, metadata, and utilities
  styles/               Global design system
```

Marketing and SEO routes are rendered as Server Components and statically
generated. Interactive code is constrained to the timer experience. New timer
intent pages can be added to `src/config/timers.ts` without creating new page
implementations. Each configured duration generates a canonical `/timer/[minutes]`
page with metadata, structured FAQ data, related timers, and internal links.

Timer state, sound preferences, and completed-session analytics are stored
locally in versioned browser storage. Running timers restore from a fixed
deadline after refresh, while completed sessions feed today, week, focus-time,
and streak metrics without requiring an account.

## Commands

```bash
npm install
npm run dev
npm run test
npm run typecheck
npm run lint
npm run build
```

## Growth path

The current foundation leaves explicit boundaries for authentication, billing,
analytics, durable focus history, teams, and ad inventory. Those systems should
be added behind feature-level interfaces instead of imported into page
components.
