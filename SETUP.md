# Add the Vendure AI assistant to an existing Vendure project

A step-by-step guide for adding the AI assistant to a **Vendure 3.x** project that already exists. It is written so you can hand it to an AI coding agent ("follow SETUP.md to add the AI assistant to this project") or follow it yourself. Each step says what to check first, what to change and how to verify it.

You end up with:

- **Server** — [`@rahul_vendure/ai-chat-plugin`](https://www.npmjs.com/package/@rahul_vendure/ai-chat-plugin): the storefront shopping assistant, the admin assistant (permission-gated tools, confirmations) and business insights (sales, forecast, inventory, competitor research).
- **Dashboard** — [`@rahul_vendure/ai-chat-dashboard`](https://www.npmjs.com/package/@rahul_vendure/ai-chat-dashboard): the **AI → AI Chat** page and a quick chat on every page.
- **Storefront** (optional) — [`@rahul_vendure/ai-chat-react`](https://www.npmjs.com/package/@rahul_vendure/ai-chat-react): a floating chat widget.

Reference implementation: [Vendure AI Starter](https://github.com/Ryrahul/Vendure-Ai-Starter), a fresh `@vendure/create` project with all of this already applied. When in doubt, compare with its `apps/server/src/vendure-config.ts`, `apps/server/vite.config.mts` and `apps/storefront/src/features/ai-chat/`.

---

## Rules for agents

- **Ask the human for API keys and put them in `.env` only.** Never write keys into source files, commit them, or print them. Add placeholder entries to `.env.example`.
- **Don't run destructive database commands** (dropping volumes, `synchronize: true` against real data, deleting rows) without the human's explicit OK.
- **Change only what a step asks for** and keep the project's existing style. Note anything unexpected and continue, or stop and ask if a step can't be completed.
- After each step, run its **Check** and only continue when it passes.

---

## Step 0 — Find out what you're working with

| Question | How to find out | Needed |
|---|---|---|
| Vendure version | `npm ls @vendure/core` (or `package.json`) | `>=3.1.0 <4` (tested 3.5–3.8) |
| Admin UI | `@vendure/dashboard` in `package.json` and `DashboardPlugin` in the config → React dashboard. `@vendure/admin-ui-plugin` / `AdminUiPlugin` → the older Angular Admin UI | The dashboard extension needs the **React dashboard** (`@vendure/dashboard >=3.5`). With the Angular Admin UI, skip Step 5; the assistant still works through its REST endpoints |
| Database | `dbConnectionOptions.type` in the Vendure config | **PostgreSQL** (pgvector). MySQL, MariaDB and SQLite are not supported |
| Schema management | `dbConnectionOptions.synchronize` and `migrations` | Either works; Step 4 covers both |
| Storefront | A separate app (Next.js, Remix, …) or none | Step 7 is optional |
| Node.js | `node -v` | 20.19+ or 22+ |
| Package manager | lockfile: `package-lock.json` → npm, `yarn.lock`, `pnpm-lock.yaml`, `bun.lock` | Use the project's own |

Also note where the Vendure config lives (usually `src/vendure-config.ts`, or `apps/server/src/vendure-config.ts` in a monorepo), and whether the project is a monorepo (npm/yarn/pnpm workspaces).

**Stop** if the database isn't PostgreSQL. Tell the human that the AI plugin needs PostgreSQL with pgvector.

---

## Step 1 — Make sure the database has pgvector

The plugin stores product embeddings in `vector` columns.

**Check** whether the extension is available, using the project's DB credentials:

```sql
SELECT name, default_version, installed_version FROM pg_available_extensions WHERE name = 'vector';
```

- **One row** → available. The migration in Step 4 enables it.
- **No row** → install it:
  - **Docker Compose:** change the Postgres image to the pgvector image with the **same major version**, e.g. `postgres:16-alpine` → `pgvector/pgvector:pg16` (or `pg15`, `pg17` …). For a development database with disposable data, recreating the container is fine. For data you need, ask the human first and `pg_dump` / restore, because the alpine and debian images differ in collation.
  - **Homebrew:** `brew install pgvector` (for the Postgres version in use), then restart Postgres.
  - **Managed** (AWS RDS / Aurora, Azure Database for PostgreSQL, Google Cloud SQL, Supabase, Neon, …): pgvector is available. The migration's `CREATE EXTENSION vector` works if the migration user is allowed to create extensions; otherwise ask the human to run `CREATE EXTENSION IF NOT EXISTS vector;` as an admin.
  - **Debian/Ubuntu:** `apt install postgresql-16-pgvector` (match the version).

**Check:** the query above returns a row.

---

## Step 2 — Install the packages

In the **server** package (the one that depends on `@vendure/core`):

```bash
npm install @rahul_vendure/ai-chat-plugin @rahul_vendure/ai-chat-dashboard
```

Skip `@rahul_vendure/ai-chat-dashboard` if the project uses the Angular Admin UI. In a monorepo, install into the server workspace (`npm install -w <server-workspace> …`). Use the project's package manager.

`npm` with `min-release-age` in `.npmrc` may refuse versions published in the last few days. Pick an older version (`@^0.6.0`) or ask the human.

**Check:** `npm ls @rahul_vendure/ai-chat-plugin` shows a version ≥ 0.6.

---

## Step 3 — Configure the plugin

### 3a. Choose the model provider

Ask the human which provider to use and for its credentials:

| Provider | `.env` variables | Gives |
|---|---|---|
| **OpenAI** (simplest) | `OPENAI_API_KEY` | Chat, embeddings, web search |
| **Azure OpenAI** | `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_RESOURCE_NAME`, `AZURE_OPENAI_DEPLOYMENT_NAME` (chat), `AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME`; plus `AZURE_OPENAI_EMBEDDING_RESOURCE_NAME` / `AZURE_OPENAI_EMBEDDING_API_KEY` if embeddings are on another resource | Chat, embeddings, web search |
| **Self-hosted / OpenAI-compatible** (Ollama, vLLM, LM Studio, DeepSeek, OpenRouter …) | `LLM_BASE_URL` (e.g. `http://localhost:11434/v1`), `LLM_CHAT_MODEL` (must support tool calling), `LLM_EMBEDDING_MODEL`, `LLM_EMBEDDING_DIMENSIONS`, optional `LLM_API_KEY` | Chat, embeddings (no built-in web search) |

Embedding size: OpenAI/Azure `text-embedding-3-small` = **1536** (the default). For any other embedding model, set its size (e.g. `nomic-embed-text` = 768) **before** Step 4. The migration creates the columns at that size.

### 3b. Add the plugins to the Vendure config

Add the imports and the plugins. This version reads every provider from env vars, so switching providers needs no code change, and it leaves the AI out when no provider is configured. Copy it as is unless the project has its own env-handling convention:

```ts
// vendure-config.ts
import { AiAssistantPlugin } from '@rahul_vendure/ai-chat-plugin';
import { AiChatDashboardPlugin } from '@rahul_vendure/ai-chat-dashboard'; // React dashboard only

export const config: VendureConfig = {
    // ...
    plugins: [
        // ...existing plugins (DashboardPlugin can stay where it is)
        ...aiPlugins(),
    ],
};

/** The AI assistant, with the provider chosen in .env; left out when none is configured. */
function aiPlugins() {
    const env = process.env;
    if (!env.OPENAI_API_KEY && !env.AZURE_OPENAI_API_KEY && !env.LLM_BASE_URL) {
        console.warn('AI assistant disabled: set OPENAI_API_KEY, AZURE_OPENAI_* or LLM_BASE_URL to enable it.');
        return [];
    }
    return [
        AiAssistantPlugin.init({
            openaiApiKey: env.OPENAI_API_KEY || undefined,
            chatModel: env.OPENAI_CHAT_MODEL || undefined, // default gpt-4o-mini
            azureOpenai: env.AZURE_OPENAI_API_KEY
                ? {
                      apiKey: env.AZURE_OPENAI_API_KEY,
                      resourceName: env.AZURE_OPENAI_RESOURCE_NAME,
                      deploymentName: env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4.1',
                      embeddingDeploymentName: env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME || undefined,
                      embedding:
                          env.AZURE_OPENAI_EMBEDDING_API_KEY || env.AZURE_OPENAI_EMBEDDING_RESOURCE_NAME
                              ? {
                                    apiKey: env.AZURE_OPENAI_EMBEDDING_API_KEY || undefined,
                                    resourceName: env.AZURE_OPENAI_EMBEDDING_RESOURCE_NAME || undefined,
                                }
                              : undefined,
                  }
                : undefined,
            openaiCompatible: env.LLM_BASE_URL
                ? {
                      baseURL: env.LLM_BASE_URL,
                      apiKey: env.LLM_API_KEY || undefined,
                      chatModel: env.LLM_CHAT_MODEL || undefined,
                      embeddingModel: env.LLM_EMBEDDING_MODEL || undefined,
                      embeddingDimensions: env.LLM_EMBEDDING_DIMENSIONS ? Number(env.LLM_EMBEDDING_DIMENSIONS) : undefined,
                  }
                : undefined,
            // Public URL of product images in production, e.g. https://shop.example.com/assets/
            assetBaseUrl: env.ASSET_URL_PREFIX || undefined,
        }),
        AiChatDashboardPlugin, // remove for the Angular Admin UI
    ];
}
```

If the project loads `.env` with `dotenv`, it already applies to these variables; otherwise use the project's mechanism. Every option is listed in the [plugin README](https://www.npmjs.com/package/@rahul_vendure/ai-chat-plugin#configuration-options).

### 3c. Allow Bearer tokens

The storefront widget sends the shopper's session as `Authorization: Bearer <token>`. Vendure's **default `tokenMethod` is `'cookie'` only**, so add `'bearer'` (cookies keep working):

```ts
authOptions: {
    // ...
    tokenMethod: ['bearer', 'cookie'],
},
```

Skip this only if there is no storefront chat, or the storefront and server share a domain with cookie sessions.

### 3d. Environment files

Add the provider variables (values empty) to `.env.example`, and the real values to `.env` (never commit `.env`):

```bash
# AI assistant — configure ONE provider (see SETUP.md)
OPENAI_API_KEY=
# AZURE_OPENAI_API_KEY=
# AZURE_OPENAI_RESOURCE_NAME=
# AZURE_OPENAI_DEPLOYMENT_NAME=
# AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME=
# LLM_BASE_URL=http://localhost:11434/v1
# LLM_CHAT_MODEL=qwen3:14b
# LLM_EMBEDDING_MODEL=nomic-embed-text
# LLM_EMBEDDING_DIMENSIONS=768
```

**Check:** the project still compiles (`npx tsc --noEmit -p <server tsconfig>` or the project's build).

---

## Step 4 — Create the database tables

The plugin adds `product_embedding`, `variant_embedding`, `collection_embedding` (vector columns), `ai_chat_session` and `ai_store_profile`.

- **`synchronize: true`** (development only): the tables appear on the next start, but run `CREATE EXTENSION IF NOT EXISTS vector;` in the database first.
- **Migrations** (normal for real projects):
  1. Generate a migration with the project's usual command, typically `npx vendure migrate --generate ai-assistant` (run in the server package), or the project's own script, e.g. `npm run migration:generate`.
  2. Open the generated file and add this as the **first line** of `up()`:
     ```ts
     await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector`, undefined);
     ```
  3. Check that it only creates the five tables above plus their indexes and foreign keys. If it touches unrelated tables, the project's schema was already out of sync: stop and tell the human.
  4. Run it: `npx vendure migrate --run`, or start the server if it runs migrations on startup (`runMigrations` in `index.ts`).

**Check:**

```sql
SELECT tablename FROM pg_tables WHERE tablename LIKE '%embedding' OR tablename LIKE 'ai_%';
-- product_embedding, variant_embedding, collection_embedding, ai_chat_session, ai_store_profile
```

---

## Step 5 — Dashboard (React dashboard only)

`AiChatDashboardPlugin` in the config (Step 3b) is enough for the dashboard's Vite plugin to find the extension. One addition is needed for **development mode**: the chat's Markdown renderer has CommonJS dependencies that Vite's dev server only loads when pre-bundled. Without this, `vendure dev` shows a **blank dashboard** (`style-to-js … does not provide an export named 'default'`). Add to the dashboard's `vite.config.mts`:

```ts
export default defineConfig({
    // ...existing config
    optimizeDeps: {
        include: ['@rahul_vendure/ai-chat-dashboard > react-markdown', '@rahul_vendure/ai-chat-dashboard > remark-gfm'],
    },
});
```

If the project already has `optimizeDeps.include`, append to it. If the packages are symlinked workspaces rather than installed from npm, see the [dashboard README](https://www.npmjs.com/package/@rahul_vendure/ai-chat-dashboard#workspace--monorepo-setup).

**Check:** start the dev server (or `vite build` the dashboard) and open the dashboard. The sidebar has an **AI** section with **AI Chat**, and a ✨ button sits bottom-right.

---

## Step 6 — Start, embed the catalog, check the server

1. Start the server **and the worker** (embeddings run in the worker's job queue).
2. Embed the catalog once: in the dashboard, **Settings → Global settings → Embed all**. Or via the Admin API:
   ```graphql
   mutation { triggerEmbedAll { jobId message } }
   ```
   After this, product and collection changes are embedded automatically.
3. Non-SuperAdmin roles that should use the admin assistant need the **UseAiAdminAssistant** permission (Settings → Roles).

**Check** (adjust the host and port; add `-H 'vendure-token: <channel token>'` for a non-default channel):

```bash
# Shop assistant: expect a JSON reply with a "message" and usually "products"
curl -s -X POST http://localhost:3000/ai-assistant/chat \
  -H 'content-type: application/json' \
  -d '{"message":"What products do you have?"}'

# Admin assistant: log in (cookie jar), then ask
curl -s -c /tmp/vendure-jar -X POST http://localhost:3000/admin-api -H 'content-type: application/json' \
  -d '{"query":"mutation { login(username: \"superadmin\", password: \"superadmin\") { __typename } }"}'
curl -s -b /tmp/vendure-jar -X POST http://localhost:3000/admin-ai-chat/chat \
  -H 'content-type: application/json' \
  -d '{"message":"How many products do we have?"}'
```

Use the project's real superadmin credentials. If the server log says *"AI assistant disabled"*, no provider is set in `.env`.

---

## Step 7 — Storefront chat (optional)

### 7a. Install

In the storefront package:

```bash
npm install @rahul_vendure/ai-chat-react ai@^6 @ai-sdk/react@^3
```

The versions matter: `ai` 7 / `@ai-sdk/react` 4 don't match the server's stream.

### 7b. Find three things in the storefront

1. **The session token.** How the storefront stores the Vendure session it gets from `vendure-auth-token` responses: often a cookie (e.g. `vendure-auth-token`) read on the server, or localStorage. The chat must receive the **current** token, also for guests after their first add-to-cart, so the assistant sees the same cart.
2. **The channel token**, if the storefront uses a non-default channel (often `VENDURE_CHANNEL_TOKEN`).
3. **The existing add-to-cart function** and how the storefront refreshes the cart afterwards (Next.js `revalidateTag` / `updateTag`, `router.refresh()`, a cart context, …).

### 7c. Render the widget

The widget is a client component that calls the Vendure server **directly from the browser**:

```tsx
'use client';
import { VendureAiChat } from '@rahul_vendure/ai-chat-react';
import '@rahul_vendure/ai-chat-react/styles.css';

export function AiChat({ authToken }: { authToken?: string }) {
    return (
        <VendureAiChat
            vendureUrl="https://api.my-shop.com"              // server base URL, without /shop-api
            authToken={authToken}                            // current session token (guests too)
            channelToken={process.env.NEXT_PUBLIC_VENDURE_CHANNEL_TOKEN} // non-default channels
            onAddToCart={async (variantId, quantity, productName) => {
                await addToCart(variantId, quantity);           // the storefront's own function
                refreshCartAndSession();                        // so the new token / cart badge update
            }}
            onCartUpdate={() => refreshCart()}               // the assistant changed the cart
            onNavigate={path => router.push(path)}           // e.g. /product/<slug>
        />
    );
}
```

**Next.js App Router:** read the token in a **server** component and pass it down, and mount it in the root/locale layout (inside `<Suspense>` if the app uses `cacheComponents`):

```tsx
// ai-chat.tsx (server component)
import { cookies } from 'next/headers';
import { AiChatClient } from './ai-chat-client';

export async function AiChat() {
    const authToken = (await cookies()).get('vendure-auth-token')?.value; // the storefront's cookie name
    return <AiChatClient authToken={authToken} />;
}
```

The starter's [`src/features/ai-chat/`](https://github.com/Ryrahul/Vendure-Ai-Starter/tree/main/apps/storefront/src/features/ai-chat) is a complete Next.js 16 example, wired to the storefront's server action, cache tags and locale router. More frameworks (Remix, Vite/CRA) are covered in the [widget README](https://www.npmjs.com/package/@rahul_vendure/ai-chat-react).

### 7d. CORS

The browser calls the Vendure server from the storefront's origin. Allow it in the server config (production):

```ts
apiOptions: {
    cors: { origin: ['https://my-shop.com'], credentials: true },
},
```

**Check:** in the storefront, open the chat (bottom-right) and try:

1. "What do you have in <a collection name>?" → product cards
2. "Add the first one to my cart" → the storefront's cart count updates
3. "What's in my cart?" → the same item and total

---

## Final checklist

- [ ] `pg_available_extensions` lists `vector`; the five AI tables exist
- [ ] The server starts without "configure a chat model" / "embeddings need …" errors, or logs "AI assistant disabled" only when intentionally unconfigured
- [ ] **Embed all** completed (worker running)
- [ ] Dashboard: **AI → AI Chat** answers "How many products do we have?"; asking it to delete something shows a **Confirm** card
- [ ] `tokenMethod` includes `'bearer'` if the storefront chat is used
- [ ] Storefront chat: search → add to cart → "what's in my cart?" shows the same cart
- [ ] `.env.example` lists the AI variables, `.env` is not committed, and no keys are in source files
- [ ] Migration committed (unless the project uses `synchronize`)

## Troubleshooting

| Symptom | Fix |
|---|---|
| `type "vector" does not exist` | pgvector isn't installed or enabled (Step 1, and the `CREATE EXTENSION` line in Step 4) |
| Server stops: "configure a chat model" / "embeddings need …" | Missing provider variables, or Azure without `AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME` (Step 3a) |
| "the embedding model returned N dimensions, but embeddingDimensions is M" | Set the size for the model, regenerate the migration (Step 4), run **Embed all** |
| Dashboard blank in dev | The `optimizeDeps.include` lines (Step 5) |
| No **AI** section in the dashboard | `AiChatDashboardPlugin` missing from `plugins`, or the dashboard wasn't rebuilt/restarted |
| HTTP 403 on `/admin-ai-chat/*` | The role needs **UseAiAdminAssistant** |
| Semantic search finds nothing | Run **Embed all**; make sure the worker runs |
| Storefront chat shows no reply | `ai@^6` / `@ai-sdk/react@^3`, plugin ≥ 0.5, CORS allows the storefront origin |
| "Your cart is empty" right after adding | `tokenMethod` lacks `'bearer'` (3c), or the widget isn't given the current session token (7b) |
| Prices in `$` instead of the store currency | Don't pass a `formatPrice` that hard-codes USD; the default formatter uses the store currency |
| Competitor research says web search is unavailable | Self-hosted models have no built-in web search; pass a `webSearch` function ([plugin README](https://www.npmjs.com/package/@rahul_vendure/ai-chat-plugin#model-providers)) |
| HTTP 429 | A usage limit was hit; see `limits` in the plugin README |

## Reference

- [Plugin README](https://www.npmjs.com/package/@rahul_vendure/ai-chat-plugin): every option, providers, endpoints, business insights, troubleshooting
- [Dashboard README](https://www.npmjs.com/package/@rahul_vendure/ai-chat-dashboard) · [Widget README](https://www.npmjs.com/package/@rahul_vendure/ai-chat-react)
- [Vendure AI Starter](https://github.com/Ryrahul/Vendure-Ai-Starter): a working example of everything above
