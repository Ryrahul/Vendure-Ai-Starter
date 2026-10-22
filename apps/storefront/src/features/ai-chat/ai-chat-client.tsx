'use client';

import {VendureAiChat} from '@rahul_vendure/ai-chat-react';
import '@rahul_vendure/ai-chat-react/styles.css';
import {toast} from 'sonner';
import {useRouter} from '@/platform/i18n/navigation';
import {addToCart} from '@/features/products/add-to-cart';
import {refreshCart} from './actions';

interface AiChatClientProps {
    vendureUrl: string;
    authToken?: string;
    channelToken?: string;
}

export function AiChatClient({vendureUrl, authToken, channelToken}: AiChatClientProps) {
    const router = useRouter();

    return (
        <VendureAiChat
            vendureUrl={vendureUrl}
            authToken={authToken}
            channelToken={channelToken}
            title="Shopping assistant"
            // A guest without a session yet: add through the storefront, which creates the
            // session; the refresh then hands the new token to the chat.
            onAddToCart={async (variantId, quantity, productName) => {
                const result = await addToCart(variantId, quantity);
                if (result.success) {
                    toast.success(`${productName} added to your cart`);
                    router.refresh();
                } else {
                    toast.error(result.error || 'Could not add to cart');
                }
            }}
            // The assistant changed the cart on the server: refresh the cart badge and pages.
            onCartUpdate={async () => {
                await refreshCart();
                router.refresh();
            }}
            onNavigate={path => router.push(path)}
        />
    );
}
