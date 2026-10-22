# vendure-ai-starter Project Instructions

This project was generated with `@vendure/create`.

## Workspace Layout

- Vendure backend: `apps/server`
- Next.js storefront: `apps/storefront`
- Start both apps: `npm run dev`
- Start only the server: `npm run dev:server`
- Start only the storefront: `npm run dev:storefront`
- Backend custom code belongs in `apps/server/src/plugins`
- Backend runtime configuration is in `apps/server/src/vendure-config.ts`
- Backend static assets and email templates live in `apps/server/static`

## Vendure Development

- Prefer implementing custom functionality as a Vendure plugin.
- Use `npx vendure add` to scaffold plugins, entities, services, API extensions, and job queues.
- Read environment variables in `vendure-config.ts` and pass values into plugins through `Plugin.init()` options.
- Create job queues in `onModuleInit()` or `onApplicationBootstrap()`, then reuse the queue when adding jobs.
- Pass `RequestContext` to Vendure services and `TransactionalConnection` methods when it is available.
- Do not commit `.env` values or generated runtime data.
- Do not use `dbConnectionOptions.synchronize: true` for production data.

## AI assistant

- Server: `@rahul_vendure/ai-chat-plugin` (models, tools, embeddings) and `@rahul_vendure/ai-chat-dashboard` (admin chat UI), configured in `aiPlugins()` in `apps/server/src/vendure-config.ts` from `.env` (OpenAI, Azure OpenAI or `LLM_*` for an OpenAI-compatible API). Without a provider the AI plugins are left out.
- Storefront: `apps/storefront/src/features/ai-chat` renders `<VendureAiChat>` from `@rahul_vendure/ai-chat-react`, mounted in `src/site/locale-layout.tsx`.
- Schema changes go through migrations (`apps/server/src/migrations`); the AI tables and the pgvector extension are created by the `ai-assistant` migration.
- After importing products, run "Embed all" (Settings → Global settings) so semantic search knows the catalog.
- Package docs: https://www.npmjs.com/package/@rahul_vendure/ai-chat-plugin

## Commands

- First-time setup (database + sample data): `npm run setup`
- Start development: `npm run dev`
- Build: `npm run build`

## Quality Checks

- Run `npm run build` after changing backend code.
- Run targeted tests for the package or feature you changed.
