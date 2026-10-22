import {getAuthToken} from '@/platform/vendure/auth-token';
import {AiChatClient} from './ai-chat-client';

/**
 * Base URL the browser uses to reach the Vendure server (the chat calls /ai-assistant/* on it
 * directly). Defaults to the Shop API URL without /shop-api; set NEXT_PUBLIC_VENDURE_URL when
 * the storefront reaches Vendure on an internal address the browser can't use.
 */
const VENDURE_URL = (
    process.env.NEXT_PUBLIC_VENDURE_URL ||
    process.env.VENDURE_SHOP_API_URL ||
    process.env.NEXT_PUBLIC_VENDURE_SHOP_API_URL ||
    ''
).replace(/\/shop-api\/?$/, '');

const CHANNEL_TOKEN = process.env.VENDURE_CHANNEL_TOKEN || process.env.NEXT_PUBLIC_VENDURE_CHANNEL_TOKEN;

/**
 * The AI shopping assistant (floating chat). Passes the shopper's session token, so the
 * assistant sees and changes the same cart as the storefront — for guests too.
 * Turn it off with NEXT_PUBLIC_AI_CHAT_ENABLED=false (e.g. when the server has no AI provider).
 */
export async function AiChat() {
    if (process.env.NEXT_PUBLIC_AI_CHAT_ENABLED === 'false' || !VENDURE_URL) {
        return null;
    }
    const authToken = await getAuthToken();
    return <AiChatClient vendureUrl={VENDURE_URL} authToken={authToken} channelToken={CHANNEL_TOKEN} />;
}
