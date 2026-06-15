# PublicBoard

PublicBoard is an open news collective for recording public incidents on a map.
It is being built for people who want a more durable, source-preserving view of
what happened, where it happened, and how the public understands it over time.

## Purpose

News coverage often reflects the perspective, incentives, and framing of the
publisher. PublicBoard aims to preserve the nature of an incident closer to its
original public record by letting people post incidents directly, classify them
by civic responsibility, and keep them discoverable beyond the daily news cycle.

The project focuses on:

- mapping national and regional incidents by location
- organizing incidents into public boards based on ministries
- supporting public opinion without turning comment sections into raw noise
- summarizing comments into AI-assisted opinion clusters
- keeping historical incidents visible after media attention moves on

## Core Concepts

### Incidents

An incident is a public event submitted as a news post. Incidents can be national
or regional. The map groups incidents at country or state level so that people
can scan the public record without needing to inspect every individual marker.

### Boards

Boards are ministry-based categories. National incidents are categorized under
central ministries, while regional incidents are categorized under the relevant
state ministries.

### Opinions

People can comment with their perspective on an incident. Comments are not
published directly as a raw feed. Instead, AI consolidates comments into
descriptive opinion clusters so readers can understand the major viewpoints
without amplifying spam, repetition, or low-signal arguments.

## Status

PublicBoard is in early development. This repository currently contains the
initial application foundation and will evolve as the product model, moderation
rules, data model, and map experience are refined.

## Tech Stack

- Bun
- React
- TanStack Start
- TypeScript
- Tailwind CSS
- Drizzle ORM
- SQLite by default

## Getting Started

Install dependencies:

```sh
bun install
```

Create a local environment file:

```sh
cp .env.example .env
```

Start the development server:

```sh
bun run dev
```

The default SQLite database path is `data/app.sqlite`. Override it with
`DATABASE_URL` when needed.

## Scripts

```sh
bun run dev
bun run build
bun run preview
bun run typecheck
bun run lint
bun run format
bun run test
bun run check
bun run db:generate
bun run db:migrate
bun run db:push
```

TanStack Start currently uses Vite for its framework dev/build pipeline. The
project runs that layer through Bun with `bun --bun vite ...`; linting,
formatting, type checking, and tests are available as standalone scripts.

## License

No open source license has been selected yet. Until a license is added, all
rights are reserved by the project owner.
