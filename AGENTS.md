# Project Overview

This project is a full-stack TypeScript application built with Bun, EffectTS, React, TailwindCSS, TanStack Start, Drizzle ORM, and SQLite.

The project follows feature-driven and test-driven development. Organize code by product feature, keep tests close to the code they verify, and prefer small, focused modules over large shared files.

## Project Structure

Use the existing folder layout as the default shape for new work:

- `src/routes`: TanStack Start route entry points and page composition.
- `src/features/<feature>`: feature-owned schemas, types, utilities, components, hooks, server functions, services, queries, mutations, tests, fixtures, and documentation.
- `src/features/<feature>/components`: feature-specific React UI and component tests.
- `src/features/<feature>/server`: server-only feature workflows, queries, mutations, and services.
- `src/features/<feature>/docs`: feature documentation artifacts, including `FEATURE.html` and `HISTORY.html`.
- `src/components/ui`: shared `shadcn/ui` primitives.
- `src/lib`: shared domain-agnostic utilities and reusable non-feature code.
- `src/server`: shared server-only infrastructure such as database setup and schema.
- `src/test`: shared test helpers, render utilities, fixtures, and factories.
- `src/styles`: global styling entry points.

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

## Workflow

Before acting on a user's prompt, understand the request and the environment first. Think through the approach, draw a private mind map of the steps needed to complete the work, and identify the information required before making changes.

Explore the codebase for answers before asking the user. When clarification is still needed, use the [$grilling](.agents/skills/grill-me/SKILL.md) skill to interview the user one question at a time, with a recommended answer for each question.

After collecting the necessary details, prefer launching a sub-agent to plan the execution when the work is substantial or critical. Review the plan, judge the consequences of implementing it, and approve it only when it is sound. If the plan has gaps or unacceptable tradeoffs, iterate before implementation.

For every major or critical feature, element, or component, use the [$tdd](.agents/skills/tdd/SKILL.md) skill. Follow a vertical red-green-refactor loop: one behavior test, minimal implementation, passing test, then the next behavior. Avoid writing all tests before implementation.

For every implemented feature, maintain two visual documentation files inside `src/features/<feature>/docs`:

- `FEATURE.html`: explains the feature's technical journey end-to-end, including data sources, functions and workflows, working logic, outputs, and how those outputs are used by other processors or presented to the user. Update it whenever the feature is added, modified, refactored, or otherwise touched.
- `HISTORY.html`: records implementation decisions, iterations, and later changes to feature-related code. Treat it as mostly append-only so the decision trail remains intact.
