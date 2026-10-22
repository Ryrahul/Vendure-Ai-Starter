export {};

// Here we declare the members of the process.env object, so that we
// can use them in our application code in a type-safe manner.
declare global {
    namespace NodeJS {
        interface ProcessEnv {
            APP_ENV: string;
            VENDURE_SERVER_PORT: string;
            PORT: string;
            COOKIE_SECRET: string;
            SUPERADMIN_USERNAME: string;
            SUPERADMIN_PASSWORD: string;
            CORS_ORIGINS?: string;
            DB_HOST: string;
            DB_PORT: number;
            DB_NAME: string;
            DB_USERNAME: string;
            DB_PASSWORD: string;
            DB_SCHEMA: string;
            ASSET_URL_PREFIX?: string;
            DEFAULT_CHANNEL_TOKEN?: string;
            // AI assistant — see .env.example
            OPENAI_API_KEY?: string;
            OPENAI_CHAT_MODEL?: string;
            AZURE_OPENAI_API_KEY?: string;
            AZURE_OPENAI_RESOURCE_NAME?: string;
            AZURE_OPENAI_DEPLOYMENT_NAME?: string;
            AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME?: string;
            AZURE_OPENAI_EMBEDDING_RESOURCE_NAME?: string;
            AZURE_OPENAI_EMBEDDING_API_KEY?: string;
            LLM_BASE_URL?: string;
            LLM_API_KEY?: string;
            LLM_CHAT_MODEL?: string;
            LLM_EMBEDDING_MODEL?: string;
            LLM_EMBEDDING_DIMENSIONS?: string;
        }
    }
}
