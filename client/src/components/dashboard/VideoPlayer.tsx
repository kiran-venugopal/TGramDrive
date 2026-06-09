import { useState } from 'react';
import { Monitor, Check, Copy, Loader2, Link } from 'lucide-react';
import type { FileItem } from '../../types';
import api from '../../api';

interface VideoPlayerProps {
    previewFile: FileItem;
    selectedDrive: string;
}

export const VideoPlayer = ({
    previewFile,
    selectedDrive,
}: VideoPlayerProps) => {
    const [vlcState, setVlcState] = useState<'idle' | 'loading' | 'copied' | 'error'>('idle');
    const [copyState, setCopyState] = useState<'idle' | 'loading' | 'copied' | 'error'>('idle');
    const [showTooltip, setShowTooltip] = useState(false);

    const getStreamUrl = async () => {
        const res = await api.get('/auth/stream-token');
        const { token } = res.data;
        return `${window.location.origin}/api/files/view/${previewFile.id}?driveId=${encodeURIComponent(selectedDrive)}&token=${encodeURIComponent(token)}`;
    };

    const handleVlcStream = async () => {
        setVlcState('loading');
        try {
            const streamUrl = await getStreamUrl();

            // Open via vlc:// protocol with full URL including scheme
            const vlcUrl = `vlc://${streamUrl}`;
            window.open(vlcUrl, '_blank');

            setVlcState('copied');
            setTimeout(() => setVlcState('idle'), 3000);
        } catch (err) {
            console.error('Failed to generate VLC stream URL:', err);
            setVlcState('error');
            setTimeout(() => setVlcState('idle'), 3000);
        }
    };

    const handleCopyStreamUrl = async () => {
        setCopyState('loading');
        try {
            const streamUrl = await getStreamUrl();
            await navigator.clipboard.writeText(streamUrl);
            setCopyState('copied');
            setTimeout(() => setCopyState('idle'), 3000);
        } catch (err) {
            console.error('Failed to copy stream URL:', err);
            setCopyState('error');
            setTimeout(() => setCopyState('idle'), 3000);
        }
    };

    return (
        <div className="w-full h-full flex flex-col items-center justify-center min-h-0">
            {/* Video Container */}
            <div className="relative w-full flex-1 min-h-0 flex items-center justify-center">
                <video
                    src={`/api/files/view/${previewFile.id}?driveId=${selectedDrive}`}
                    controls
                    autoPlay
                    className="w-full h-full max-h-[80vh] rounded-lg shadow-2xl bg-black/50 object-contain"
                />
            </div>

            {/* Action Buttons */}
            <div className="mt-3 flex items-center gap-2 flex-shrink-0 flex-wrap justify-center">
                {/* Open in VLC Button */}
                <button
                    onClick={handleVlcStream}
                    disabled={vlcState === 'loading'}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 backdrop-blur-md border cursor-pointer ${
                        vlcState === 'copied'
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                            : vlcState === 'error'
                            ? 'bg-red-500/20 border-red-500/40 text-red-400'
                            : 'bg-white/5 border-brand-text/10 text-brand-text/90 hover:bg-white/10 hover:border-brand-primary/30'
                    }`}
                    title="Open in VLC media player"
                >
                    {vlcState === 'loading' ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Opening...</span>
                        </>
                    ) : vlcState === 'copied' ? (
                        <>
                            <Check className="w-4 h-4" />
                            <span>Opening VLC...</span>
                        </>
                    ) : vlcState === 'error' ? (
                        <>
                            <Monitor className="w-4 h-4" />
                            <span>Failed</span>
                        </>
                    ) : (
                        <>
                            <Monitor className="w-4 h-4" />
                            <span>Open in VLC</span>
                        </>
                    )}
                </button>

                {/* Copy Stream URL Button */}
                <div
                    className="relative"
                    onMouseEnter={() => setShowTooltip(true)}
                    onMouseLeave={() => setShowTooltip(false)}
                >
                    <button
                        onClick={handleCopyStreamUrl}
                        disabled={copyState === 'loading'}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 backdrop-blur-md border cursor-pointer ${
                            copyState === 'copied'
                                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                                : copyState === 'error'
                                ? 'bg-red-500/20 border-red-500/40 text-red-400'
                                : 'bg-white/5 border-brand-text/10 text-brand-text/90 hover:bg-white/10 hover:border-brand-primary/30'
                        }`}
                    >
                        {copyState === 'loading' ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Copying...</span>
                            </>
                        ) : copyState === 'copied' ? (
                            <>
                                <Check className="w-4 h-4" />
                                <span>Copied!</span>
                            </>
                        ) : copyState === 'error' ? (
                            <>
                                <Link className="w-4 h-4" />
                                <span>Failed</span>
                            </>
                        ) : (
                            <>
                                <Copy className="w-4 h-4" />
                                <span>Copy Stream URL</span>
                            </>
                        )}
                    </button>

                    {/* Tooltip */}
                    {showTooltip && copyState === 'idle' && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-black/90 border border-brand-text/20 rounded-lg text-xs text-brand-text/80 whitespace-nowrap backdrop-blur-md pointer-events-none z-10">
                            Stream URL expires in 1 hour
                            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black/90" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
