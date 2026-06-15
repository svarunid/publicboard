# Product

## Register

product

## Users

General citizens use PublicBoard to understand public incidents as a durable civic record. They come to the product to see what happened, where it happened, which public responsibility category it belongs to, and how public opinion clusters around it over time.

Users may browse incidents casually, search for a specific area or ministry, submit new incident records, or add their perspective to an existing incident. They should not need specialist mapping, journalism, or policy knowledge to use the core flows.

## Product Purpose

PublicBoard records public incidents on a map and organizes them by civic responsibility so incidents remain discoverable after the news cycle moves on.

The product exists to preserve a neutral, source-aware view of public events without becoming a social feed. A post should describe an incident plainly and raw, with enough structure to classify, locate, and de-duplicate it. Duplicate semantic posts should be prevented where possible and allowed only with explicit confirmation when ambiguity remains.

Public comments should inform public understanding without exposing raw comment streams. Opinions are collected, moderated, and clustered into descriptive summaries so readers can understand major viewpoints without amplifying repetition, spam, or low-signal arguments.

Success means citizens can inspect a public incident record, understand its location and responsibility context, and contribute information or opinion without the product rewarding performance, outrage, or personality.

## Brand Personality

PublicBoard should not feel like it has a personality. The interface should be subtle, neutral, minimal, strict, and purpose built. It should behave like a civic record system: precise, restrained, predictable, and resistant to expressive excess.

The product voice should be plain and evidentiary. It should prefer factual nouns, neutral verbs, dates, locations, sources, categories, and confirmation states over emotional framing, activist language, sensational phrasing, or social-media idioms.

## Anti-references

PublicBoard should not feel like:

- a social-media feed where expression, virality, identity, and raw comment threads dominate
- a sensational news site that rewards outrage, urgency, or dramatic framing
- a decorative civic campaign with slogans and personality-led branding
- a loose discussion forum where duplicate posts and off-topic opinions accumulate
- a sterile GIS tool that only specialists can understand

Avoid UI patterns that imply unlimited posting freedom, popularity contests, public comment performance, or entertainment browsing. Incident creation should feel deliberate. Duplicate detection, confirmation, classification, and source preservation should feel like core product behavior, not friction added later.

## Design Principles

1. Incident first, opinion second. The record of what happened must remain clearer and more durable than the discussion around it.
2. Neutral by default. Labels, layouts, and voice should avoid implying blame, outrage, endorsement, or certainty beyond the available evidence.
3. Structure before expression. Submission, classification, map placement, de-duplication, and confirmation flows should guide users toward clean civic records.
4. No raw noise as public output. Public comments should be transformed into moderated opinion clusters, not displayed as a social thread.
5. Strict, reversible confidence. When the system is uncertain about duplicates, categories, or locations, it should show the uncertainty and ask for confirmation rather than silently guessing.

## Accessibility & Inclusion

Target WCAG 2.2 AA for product surfaces.

Core interactions must support keyboard navigation, visible focus states, readable contrast in both light and dark themes, and reduced-motion preferences. The map canvas should support keyboard panning and zooming with standard shortcuts, including Ctrl/Cmd with plus and minus for zoom, plus arrow keys and WASD-style directional panning where appropriate.

Color must not be the only carrier of incident status, opinion cluster state, moderation state, or duplicate confidence. Map and canvas interactions should provide text alternatives, structured lists, and non-pointer workflows for users who cannot rely on drag or precise pointer input.
