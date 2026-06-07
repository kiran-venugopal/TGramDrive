import { Subtitles } from 'lucide-react';
import type { FileItem } from '../../types';
import { useVideoSubtitles } from '../../hooks/useVideoSubtitles';

interface VideoPlayerProps {
    previewFile: FileItem;
    selectedDrive: string;
    files: FileItem[];
}

export const VideoPlayer = ({
    previewFile,
    selectedDrive,
    files,
}: VideoPlayerProps) => {
    const {
        availableSubtitles,
        activeSubtitle,
        localSubtitle,
        trackUrl,
        loading,
        error,
        handleSubtitleChange,
        handleLocalSubtitleUpload,
        localFileInputRef,
    } = useVideoSubtitles({
        previewFile,
        files,
        selectedDrive,
    });

    return (
        <div className="w-full h-full flex flex-col items-center justify-center min-h-0">
            {/* Video Container */}
            <div className="relative w-full flex-1 min-h-0 flex items-center justify-center">
                <video
                    src={`/api/files/view/${previewFile.id}?driveId=${selectedDrive}`}
                    controls
                    autoPlay
                    className="max-w-full max-h-[68vh] rounded-lg shadow-2xl bg-black/50"
                >
                    {trackUrl && (
                        <track
                            key={trackUrl}
                            kind="subtitles"
                            src={trackUrl}
                            srcLang="en"
                            label={activeSubtitle?.fileName || localSubtitle?.fileName || 'Subtitles'}
                            default
                        />
                    )}
                </video>
            </div>

            {/* Subtitle Control Panel */}
            <div className="mt-4 flex flex-col items-center w-full max-w-2xl px-4 flex-shrink-0">
                <div className="flex items-center justify-between w-full bg-black/40 border border-brand-text/10 rounded-xl p-3 text-sm text-brand-text/90 backdrop-blur-md">
                    <div className="flex items-center gap-2 overflow-hidden mr-2">
                        <Subtitles className="w-4 h-4 text-brand-primary shrink-0" />
                        <span className="font-medium text-xs sm:text-sm shrink-0">Subtitles:</span>
                        {loading ? (
                            <span className="text-brand-text/50 animate-pulse text-xs">Loading...</span>
                        ) : activeSubtitle ? (
                            <span
                                className="text-brand-primary font-semibold truncate max-w-[120px] sm:max-w-[220px] text-xs sm:text-sm"
                                title={activeSubtitle.fileName}
                            >
                                {activeSubtitle.fileName}
                            </span>
                        ) : localSubtitle ? (
                            <span
                                className="text-brand-primary font-semibold truncate max-w-[120px] sm:max-w-[220px] text-xs sm:text-sm"
                                title={localSubtitle.fileName}
                            >
                                {localSubtitle.fileName} (Local)
                            </span>
                        ) : (
                            <span className="text-brand-text/40 text-xs sm:text-sm">Off</span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <select
                            value={activeSubtitle ? activeSubtitle.id : (localSubtitle ? 'local-active' : 'off')}
                            onChange={(e) => handleSubtitleChange(e.target.value)}
                            className="bg-black/60 border border-brand-text/20 rounded-lg px-2 py-1 text-brand-text text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary max-w-[120px] sm:max-w-[180px] cursor-pointer"
                        >
                            <option value="off">Off</option>
                            {availableSubtitles.map((sub) => (
                                <option key={sub.id} value={sub.id}>
                                    {sub.fileName}
                                </option>
                            ))}
                            {localSubtitle && (
                                <option value="local-active">
                                    {localSubtitle.fileName} (Local)
                                </option>
                            )}
                            <option value="local-new">📁 Load from device...</option>
                        </select>

                        <button
                            onClick={() => localFileInputRef.current?.click()}
                            className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-brand-text text-xs rounded-lg transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                        >
                            Browse
                        </button>
                        <input
                            type="file"
                            ref={localFileInputRef}
                            onChange={handleLocalSubtitleUpload}
                            accept=".srt,.vtt"
                            className="hidden"
                        />
                    </div>
                </div>
                {error && (
                    <p className="text-xs text-brand-accent mt-1">{error}</p>
                )}
            </div>
        </div>
    );
};
