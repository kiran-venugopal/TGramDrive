/// <reference lib="webworker" />
import { set } from 'idb-keyval';

declare let self: ServiceWorkerGlobalScope;

self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Intercept POST to /share-target
    if (event.request.method === 'POST' && url.pathname === '/share-target') {
        event.respondWith((async () => {
            try {
                const formData = await event.request.formData();
                const files = formData.getAll('files');

                // Save files to IndexedDB
                if (files && files.length > 0) {
                    await set('tg-drive-shared-files', files);
                }

                // Redirect back to the dashboard with the flag
                return Response.redirect('/?shared-target=true', 303);
            } catch (error) {
                console.error('Error handling share target:', error);
                return Response.redirect('/?shared-target=error', 303);
            }
        })());
    }
});
