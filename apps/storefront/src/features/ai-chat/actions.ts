'use server';

import {updateTag} from 'next/cache';

/** Invalidates the cached cart after the assistant changed it. */
export async function refreshCart() {
    updateTag('cart');
    updateTag('active-order');
}
