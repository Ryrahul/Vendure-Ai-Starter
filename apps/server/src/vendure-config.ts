import {
    dummyPaymentHandler,
    DefaultJobQueuePlugin,
    DefaultSchedulerPlugin,
    DefaultSearchPlugin,
    VendureConfig,
} from '@vendure/core';
import { defaultEmailHandlers, EmailPlugin, FileBasedTemplateLoader } from '@vendure/email-plugin';
import { AssetServerPlugin } from '@vendure/asset-server-plugin';
import { DashboardPlugin } from '@vendure/dashboard/plugin';
import { GraphiqlPlugin } from '@vendure/graphiql-plugin';
import { AiAssistantPlugin } from '@rahul_vendure/ai-chat-plugin';
import { AiChatDashboardPlugin } from '@rahul_vendure/ai-chat-dashboard';
import 'dotenv/config';
import path from 'path';

const IS_DEV = process.env.APP_ENV === 'dev';
// PORT wins because hosting platforms inject it into the environment at runtime, and that
// must take precedence over any value baked into the .env file at scaffold time.
const serverPort = +process.env.PORT || +process.env.VENDURE_SERVER_PORT || 3000;

export const config: VendureConfig = {
    // A fixed token for the default channel, so the storefront's VENDURE_CHANNEL_TOKEN matches
    // on every fresh database (tokens are sent as a public header; they aren't secrets).
    defaultChannelToken: process.env.DEFAULT_CHANNEL_TOKEN || 'default-channel',
    apiOptions: {
        port: serverPort,
        adminApiPath: 'admin-api',
        shopApiPath: 'shop-api',
        trustProxy: IS_DEV ? false : 1,
        // Which browser origins may make credentialed requests to the Shop and Admin APIs.
        // In dev any origin is reflected, so a storefront on any port works. In production set
        // CORS_ORIGINS to a comma-separated list of the origins you serve, for example
        // "https://example.com,https://admin.example.com". An unset value blocks all
        // cross-origin browser requests, which is the safe default.
        cors: {
            origin: IS_DEV ? true : (process.env.CORS_ORIGINS?.split(',').map(o => o.trim()).filter(Boolean) ?? []),
            credentials: true,
        },
    },
    authOptions: {
        tokenMethod: ['bearer', 'cookie'],
        superadminCredentials: {
            identifier: process.env.SUPERADMIN_USERNAME,
            password: process.env.SUPERADMIN_PASSWORD,
        },
        cookieOptions: {
          secret: process.env.COOKIE_SECRET,
        },
    },
    dbConnectionOptions: {
        type: 'postgres',
        // See the README.md "Migrations" section for an explanation of
        // the `synchronize` and `migrations` options.
        synchronize: false,
        migrations: [path.join(__dirname, './migrations/*.+(js|ts)')],
        logging: false,
        database: process.env.DB_NAME,
        schema: process.env.DB_SCHEMA,
        host: process.env.DB_HOST,
        port: +process.env.DB_PORT,
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
    },
    paymentOptions: {
        paymentMethodHandlers: [dummyPaymentHandler],
    },
    // When adding or altering custom field definitions, the database will
    // need to be updated. See the "Migrations" section in README.md.
    customFields: {},
    plugins: [
        GraphiqlPlugin.init(),
        AssetServerPlugin.init({
            route: 'assets',
            assetUploadDir: path.join(__dirname, '../static/assets'),
            // For local dev, the correct value for assetUrlPrefix should
            // be guessed correctly, but for production it will usually need
            // to be set manually to match your production url.
            assetUrlPrefix: IS_DEV ? undefined : process.env.ASSET_URL_PREFIX || 'https://www.my-shop.com/assets/',
        }),
        DefaultSchedulerPlugin.init(),
        DefaultJobQueuePlugin.init({ useDatabaseForBuffer: true }),
        DefaultSearchPlugin.init({ bufferUpdates: false, indexStockStatus: true }),
        EmailPlugin.init({
            devMode: true,
            outputPath: path.join(__dirname, '../static/email/test-emails'),
            route: 'mailbox',
            handlers: defaultEmailHandlers,
            templateLoader: new FileBasedTemplateLoader(path.join(__dirname, '../static/email/templates')),
            globalTemplateVars: {
                // The following variables will change depending on your storefront implementation.
                // These point at the storefront created alongside this server, on the port it
                // was assigned. Change them if you move the storefront elsewhere.
                fromAddress: '"example" <noreply@example.com>',
                verifyEmailAddressUrl: 'http://localhost:3001/verify',
                passwordResetUrl: 'http://localhost:3001/reset-password',
                changeEmailAddressUrl: 'http://localhost:3001/account/verify-email',
                // The URL of the password reset page of the Vendure Dashboard.
                adminPasswordResetUrl: `http://localhost:${serverPort}/dashboard/reset-password`
            },
        }),
        ...aiPlugins(),
        DashboardPlugin.init({
            route: 'dashboard',
            appDir: IS_DEV
                ? path.join(__dirname, '../dist/dashboard')
                : path.join(__dirname, 'dashboard'),
        }),
    ],
};

/**
 * AI shopping assistant (storefront) + admin assistant and business insights (dashboard).
 * Pick a model provider in .env — OpenAI, Azure OpenAI or a self-hosted/OpenAI-compatible
 * API (see .env.example and https://www.npmjs.com/package/@rahul_vendure/ai-chat-plugin).
 * Without one, the store runs normally and the AI features are left out.
 */
export function aiPlugins() {
    const configured = process.env.OPENAI_API_KEY || process.env.AZURE_OPENAI_API_KEY || process.env.LLM_BASE_URL;
    if (!configured) {
        console.warn('AI assistant disabled: set OPENAI_API_KEY, AZURE_OPENAI_* or LLM_BASE_URL in apps/server/.env to enable it.');
        return [];
    }
    return [
        AiAssistantPlugin.init({
            openaiApiKey: process.env.OPENAI_API_KEY || undefined,
            chatModel: process.env.OPENAI_CHAT_MODEL || undefined,
            azureOpenai: process.env.AZURE_OPENAI_API_KEY
                ? {
                      apiKey: process.env.AZURE_OPENAI_API_KEY,
                      resourceName: process.env.AZURE_OPENAI_RESOURCE_NAME,
                      deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4.1',
                      embeddingDeploymentName: process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME || undefined,
                      embedding:
                          process.env.AZURE_OPENAI_EMBEDDING_API_KEY || process.env.AZURE_OPENAI_EMBEDDING_RESOURCE_NAME
                              ? {
                                    apiKey: process.env.AZURE_OPENAI_EMBEDDING_API_KEY || undefined,
                                    resourceName: process.env.AZURE_OPENAI_EMBEDDING_RESOURCE_NAME || undefined,
                                }
                              : undefined,
                  }
                : undefined,
            openaiCompatible: process.env.LLM_BASE_URL
                ? {
                      baseURL: process.env.LLM_BASE_URL,
                      apiKey: process.env.LLM_API_KEY || undefined,
                      chatModel: process.env.LLM_CHAT_MODEL || undefined,
                      embeddingModel: process.env.LLM_EMBEDDING_MODEL || undefined,
                      embeddingDimensions: process.env.LLM_EMBEDDING_DIMENSIONS ? Number(process.env.LLM_EMBEDDING_DIMENSIONS) : undefined,
                  }
                : undefined,
            // Public URL of product images; auto-detected in development.
            assetBaseUrl: IS_DEV ? undefined : process.env.ASSET_URL_PREFIX,
        }),
        AiChatDashboardPlugin,
    ];
}
