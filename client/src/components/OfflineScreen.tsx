import { WifiOff } from 'lucide-react';

export function OfflineScreen() {
    return (
        <div className="fixed inset-0 z-[100] bg-brand-bg flex flex-col items-center justify-center p-6 text-center">
            <div className="bg-brand-primary/10 p-6 rounded-full mb-6 relative">
                <WifiOff className="w-16 h-16 text-brand-primary relative z-10" />
                <div className="absolute inset-0 bg-brand-primary/20 rounded-full animate-ping" />
            </div>

            <h1 className="text-3xl font-bold text-brand-text mb-4">You're Offline</h1>
            <p className="text-brand-text/60 max-w-sm mb-8">
                It looks like you've lost your internet connection. Please check your network and try again.
            </p>

            <div className="flex space-x-2 items-center text-sm text-brand-text/40 bg-black/20 px-4 py-2 rounded-full">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span>Waiting for connection...</span>
            </div>
        </div>
    );
}
