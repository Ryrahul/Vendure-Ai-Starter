# Vendure AI Starter

A full-stack [Vendure](https://www.vendure.io/) 3.8 store — backend, admin dashboard and Next.js storefront — with an AI assistant built in:

- **Shopping assistant in the storefront** — a chat that finds products (keyword and semantic search), adds them to the cart for guests and customers, applies coupons, helps through checkout and tracks orders.
- **Admin assistant in the dashboard** — manages products, orders, customers, promotions and settings in plain language, limited to the administrator's permissions, with a Confirm button before anything destructive.
- **Business insights** — sales summaries, a 30-day forecast, what to reorder, where customers are, and competitor prices researched on the web, with charts and tables in the chat.

Runs on **OpenAI**, **Azure OpenAI**, or a **self-hosted / OpenAI-compatible** model (Ollama, vLLM, LM Studio, DeepSeek, OpenRouter…), chosen in `.env`.

Scaffolded with [`@vendure/create`](https://github.com/vendurehq/vendure/tree/master/packages/create) (`--db postgres --storefront nextjs`). The AI comes from [`@rahul_vendure/ai-chat-plugin`](https://www.npmjs.com/package/@rahul_vendure/ai-chat-plugin), [`@rahul_vendure/ai-chat-dashboard`](https://www.npmjs.com/package/@rahul_vendure/ai-chat-dashboard) and [`@rahul_vendure/ai-chat-react`](https://www.npmjs.com/package/@rahul_vendure/ai-chat-react).

## Quick start

Requirements: Node.js 22 (or 20.19+), Docker (for Postgres with pgvector), and an API key for one model provider.

```bash
git clone https://github.com/Ryrahul/Vendure-Ai-Starter.git
cd Vendure-Ai-Starter
npm install

cp apps/server/.env.example apps/server/.env
cp apps/storefront/.env.example apps/storefront/.env.local
# In apps/server/.env: set DB_PASSWORD, COOKIE_SECRET and an AI provider (e.g. OPENAI_API_KEY)

npm run setup   # starts Postgres (Docker) and imports the sample catalog
npm run dev     # server, worker, dashboard and storefront
```

Then, once:

1. Open the dashboard → **Settings → Global settings** → **Embed all**. This indexes the catalog for semantic search in the background.
2. Try it:
   - **Storefront** http://localhost:3001 → chat bubble, bottom right
   - **Dashboard** http://localhost:3000/dashboard (superadmin / superadmin) → **AI → AI Chat**, or the ✨ button in the toolbar

| | URL |
|---|---|
| Storefront | http://localhost:3001 |
| Dashboard | http://localhost:3000/dashboard |
| Shop API / Admin API | http://localhost:3000/shop-api · /admin-api |
| Dev mailbox | http://localhost:3000/mailbox |

## Choosing a model provider

Set **one** in `apps/server/.env`; all variables are listed in [`.env.example`](apps/server/.env.example).

| Provider | Variables | Notes |
|---|---|---|
| OpenAI | `OPENAI_API_KEY` (optional `OPENAI_CHAT_MODEL`, default `gpt-4o-mini`) | Chat, embeddings and web search |
| Azure OpenAI | `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_RESOURCE_NAME`, `AZURE_OPENAI_DEPLOYMENT_NAME`, `AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME` (+ `AZURE_OPENAI_EMBEDDING_RESOURCE_NAME` / `_API_KEY` if embeddings live on another resource) | Chat, embeddings and web search |
| Ollama, vLLM, LM Studio, DeepSeek, OpenRouter… | `LLM_BASE_URL`, `LLM_CHAT_MODEL`, `LLM_EMBEDDING_MODEL`, `LLM_EMBEDDING_DIMENSIONS` (+ `LLM_API_KEY` for hosted APIs) | The chat model must support tool calling; no built-in web search |

Local example with [Ollama](https://ollama.com):

```bash
ollama pull qwen3:14b && ollama pull nomic-embed-text
```

```bash
# apps/server/.env
LLM_BASE_URL=http://localhost:11434/v1
LLM_CHAT_MODEL=qwen3:14b
LLM_EMBEDDING_MODEL=nomic-embed-text
LLM_EMBEDDING_DIMENSIONS=768
```

The included migration creates 1536-dimensional vectors (OpenAI/Azure `text-embedding-3-small`). For a model with another size, set its dimensions, generate a migration (`npx vendure migrate --generate embedding-size` in `apps/server`) and run **Embed all** again.

Without any provider the store runs normally and the AI features are off; the server logs a reminder. Set `NEXT_PUBLIC_AI_CHAT_ENABLED=false` in the storefront to hide the chat bubble in that case.

## Things to ask

**Storefront:** "I need a gift for someone who likes photography", "Add the cheapest one to my cart", "What's in my cart?", "Any coupons?", "What shipping options do I have?"

**Dashboard:**

- "Which of our products are electronics, and how much stock do we have?"
- "Set the price of the Tripod to 19.99" · "Disable the Ethernet Cable" · "Delete the product X" (→ Confirm card)
- "How did sales go in the last 30 days, and what will the next 30 days look like?"
- "What should I reorder?" · "Our supplier takes 20 days to deliver."
- "Research competitor prices for our cameras and compare them with ours."

Insights need order history, so place a few orders in the storefront first. The sample "Standard Payment" method is a dummy that authorizes any payment.

## What's in this repo

```
apps/
├── server/                       Vendure server, worker and dashboard
│   ├── src/vendure-config.ts     aiPlugins(): AI provider from .env
│   ├── src/migrations/           init + ai-assistant (pgvector extension and AI tables)
│   ├── src/populate.ts           `npm run populate`: migrations + sample catalog
│   ├── populate/                 sample data from @vendure/create
│   ├── docker-compose.yml        Postgres 16 with pgvector (port 6543)
│   └── vite.config.mts           dashboard (pre-bundles the chat's Markdown renderer for `vendure dev`)
└── storefront/                   Next.js 16 storefront
    └── src/features/ai-chat/     <VendureAiChat> with the storefront's session, cart and router
```

Changes on top of the `@vendure/create` scaffold:

- **Server:**
  - `AiAssistantPlugin` and `AiChatDashboardPlugin`, configured from `.env`.
  - A fixed `DEFAULT_CHANNEL_TOKEN`, so the storefront's channel token matches on every fresh database.
  - A migration for the AI tables.
  - `npm run populate`, so a fresh clone gets the same sample catalog.
  - The Postgres image with pgvector, with its credentials taken from `.env`.
- **Storefront:** the chat widget, wired to:
  - the shopper's session cookie (guest carts work)
  - the storefront's add-to-cart action and cart cache
  - its locale-aware router

## Scripts

| Command | What it does |
|---|---|
| `npm run setup` | `db:up` + `populate` |
| `npm run db:up` | Starts Postgres with pgvector in Docker and waits until it's ready |
| `npm run populate` | Runs migrations and imports the sample catalog (skipped if products exist; `npm run populate -w server -- --force` re-imports) |
| `npm run dev` | Server, worker, dashboard (Vite) and storefront |
| `npm run build` / `npm run start` | Production build / start |

## Production notes

- **Server env:** set `APP_ENV=production`, a real `COOKIE_SECRET` and superadmin credentials, `CORS_ORIGINS` (your storefront origin) and `ASSET_URL_PREFIX`.
- **Storefront:** point it at the server with `VENDURE_SHOP_API_URL`. If browsers reach the server on a different address, also set `NEXT_PUBLIC_VENDURE_URL`.
- **Installs:** dependencies are locked in the root `package-lock.json` (npm workspaces), so install from the repo root, also when deploying only the storefront.
- **Schema changes** go through migrations (`npx vendure migrate --generate <name>` in `apps/server`).
- **Admin users** other than SuperAdmins need the **UseAiAdminAssistant** permission on their role.

## Learn more

- [AI plugin reference](https://www.npmjs.com/package/@rahul_vendure/ai-chat-plugin): options, providers, endpoints, how forecasts and inventory plans work, troubleshooting
- [Vendure documentation](https://docs.vendure.io) · [Next.js documentation](https://nextjs.org/docs)
