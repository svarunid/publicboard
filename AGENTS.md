# Project Overview

This project is a full-stack TypeScript application built with Bun, EffectTS, React, TailwindCSS, TanStack Start, Drizzle ORM, and SQLite.

The project follows feature-driven and test-driven development. Organize code by product feature, keep tests close to the code they verify, and prefer small, focused modules over large shared files.

Shared UI components live under `src/components/ui`. Shared utilities live in `src/lib/utils.ts`.

## Architecture

Use TanStack Start routes as entry points only. Route files should handle routing, loading, redirects, and page composition, but should not contain complex UI, business logic, or database logic.

Place feature-specific code inside feature modules. A feature may contain its own components, hooks, schemas, server functions, services, tests, and fixtures.

Keep server-only logic separate from client UI. Database access, authentication checks, mutations, and business workflows should run through server-side modules.

## User Interface

Use `shadcn/ui` components wherever possible. Prefer default component behavior and avoid unnecessary customization.

Use TailwindCSS utility classes for styling components, layouts, and pages. Do not write custom CSS rules unless there is no practical Tailwind-based alternative.

Keep reusable, domain-agnostic UI components in `src/lib/components`. Keep feature-specific UI inside the relevant feature folder.

## Business Logic

Keep business rules out of React components and route files. Place domain logic in feature-level service modules.

Use EffectTS for workflows that involve structured effects, dependency management, error handling, retries, or composable business logic.

Validate inputs at the boundary using schemas before executing mutations, database writes, or business workflows.

## Database

Use Drizzle ORM for all database interactions. Do not write raw SQL unless Drizzle cannot reasonably express the query.

Keep database schema, client setup, and migrations in server-only database modules.

Feature modules may define query and mutation functions, but they should access the database through server-side code only.

## Testing

Write tests alongside the code being tested using `*.test.ts` or `*.test.tsx`.

Test pure business logic with unit tests. Test React components through user-visible behavior. Test database queries against a real or isolated test database when correctness depends on schema, relations, or constraints.

Keep shared test helpers, factories, fixtures, and render utilities in a dedicated test utilities folder.

Every feature should include tests for its validation rules, business logic, important UI behavior, and database interactions where applicable.

## Code Style

Prefer small, explicit modules with clear names.

Use descriptive file names such as `*.service.ts`, `*.queries.ts`, `*.mutations.ts`, `*.schema.ts`, and `*.test.ts`.

Avoid deeply nested abstractions unless they solve a real duplication or architecture problem.

Prefer readable, boring code over clever code.
