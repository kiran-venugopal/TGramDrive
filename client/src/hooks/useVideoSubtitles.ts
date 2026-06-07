import { useState, useEffect, useRef, useCallback } from 'react';
import type { FileItem } from '../types';
import api from '../api';

const convertSrtToVtt = (srtText: string): string => {
    const trimmed = srtText.trim();
    if (trimmed.startsWith('WEBVTT') || trimmed.includes('WEBVTT\n')) {
        return srtText;
    }

    const lines = srtText.split(/\r?\n/);
    let vttText = 'WEBVTT\n\n';

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        if (line.includes('-->')) {
            // Replace commas with dots in timestamp lines
            line = line.replace(/,/g, '.');
        }
        // Remove HTML font tags to prevent formatting issues
        line = line.replace(/<font[^>]*>/gi, '').replace(/<\/font>/gi, '');
        vttText += line + '\n';
    }

    return vttText;
};

interface UseVideoSubtitlesProps {
    previewFile: FileItem | null;
    files: FileItem[];
    selectedDrive: string;
}

export const useVideoSubtitles = ({
    previewFile,
    files,
    selectedDrive,
}: UseVideoSubtitlesProps) => {
    const [availableSubtitles, setAvailableSubtitles] = useState<FileItem[]>([]);
    const [activeSubtitle, setActiveSubtitle] = useState<FileItem | null>(null);
    const [localSubtitle, setLocalSubtitle] = useState<{ id: string; fileName: string; trackUrl: string } | null>(null);
    const [trackUrl, setTrackUrl] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const localFileInputRef = useRef<HTMLInputElement>(null);

    const loadRemoteSubtitle = useCallback(async (subFile: FileItem) => {
        setLoading(true);
        setError('');
        try {
            // Revoke current object URL before creating a new one
            setTrackUrl(prev => {
                if (prev) URL.revokeObjectURL(prev);
                return '';
            });

            const response = await api.get(`/files/view/${subFile.id}?driveId=${selectedDrive}`, {
                responseType: 'text',
            });

            const text = response.data;
            const vtt = convertSrtToVtt(text);
            const blob = new Blob([vtt], { type: 'text/vtt' });
            const url = URL.createObjectURL(blob);

            setTrackUrl(url);
            setActiveSubtitle(subFile);
        } catch (err: any) {
            console.error('Error loading subtitles:', err);
            setError('Failed to load subtitle file');
            setActiveSubtitle(null);
        } finally {
            setLoading(false);
        }
    }, [selectedDrive]);

    const handleLocalSubtitleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setError('');
        setLoading(true);

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                if (!text) {
                    throw new Error('Empty file');
                }

                const vtt = convertSrtToVtt(text);
                const blob = new Blob([vtt], { type: 'text/vtt' });
                const url = URL.createObjectURL(blob);

                setTrackUrl(prev => {
                    if (prev) URL.revokeObjectURL(prev);
                    return url;
                });

                setActiveSubtitle(null); // Clear active remote subtitle
                setLocalSubtitle({
                    id: 'local-active',
                    fileName: file.name,
                    trackUrl: url,
                });
            } catch (err) {
                console.error('Error parsing local subtitle:', err);
                setError('Failed to parse local subtitle file');
            } finally {
                setLoading(false);
            }
        };
        reader.onerror = () => {
            setError('Failed to read local subtitle file');
            setLoading(false);
        };
        reader.readAsText(file);
    };

    const handleSubtitleChange = async (value: string) => {
        if (value === 'off') {
            setActiveSubtitle(null);
            setLocalSubtitle(null);
            setTrackUrl(prev => {
                if (prev) URL.revokeObjectURL(prev);
                return '';
            });
        } else if (value === 'local-new') {
            localFileInputRef.current?.click();
        } else if (value === 'local-active') {
            if (localSubtitle) {
                setActiveSubtitle(null);
                setTrackUrl(prev => {
                    if (prev) URL.revokeObjectURL(prev);
                    return localSubtitle.trackUrl;
                });
            }
        } else {
            const subFile = availableSubtitles.find(s => s.id.toString() === value);
            if (subFile) {
                setLocalSubtitle(null);
                await loadRemoteSubtitle(subFile);
            }
        }
    };

    // Effect to clean up URL and auto-detect subtitles on file load
    useEffect(() => {
        // Reset states
        setActiveSubtitle(null);
        setLocalSubtitle(null);
        setError('');
        setAvailableSubtitles([]);
        setTrackUrl(prev => {
            if (prev) URL.revokeObjectURL(prev);
            return '';
        });

        if (!previewFile) return;

        // 1. Find all subtitle files in the current files array
        const isSubtitleFile = (fileName: string) => {
            const ext = fileName.split('.').pop()?.toLowerCase();
            return ext === 'srt' || ext === 'vtt' || ext === 'ass';
        };

        const subs = files.filter(f => isSubtitleFile(f.fileName));
        setAvailableSubtitles(subs);

        // 2. Try to auto-load subtitle with matching base name
        const getVideoBaseName = (fileName: string) => {
            const lastDot = fileName.lastIndexOf('.');
            return lastDot > 0 ? fileName.substring(0, lastDot) : fileName;
        };

        const videoBase = getVideoBaseName(previewFile.fileName).toLowerCase();
        const matchingSub = subs.find(sub => {
            const subBase = getVideoBaseName(sub.fileName).toLowerCase();
            return subBase === videoBase;
        });

        if (matchingSub) {
            loadRemoteSubtitle(matchingSub);
        }
    }, [previewFile, files, loadRemoteSubtitle]);

    // Final cleanup on unmount
    useEffect(() => {
        return () => {
            setTrackUrl(prev => {
                if (prev) URL.revokeObjectURL(prev);
                return '';
            });
        };
    }, []);

    return {
        availableSubtitles,
        activeSubtitle,
        localSubtitle,
        trackUrl,
        loading,
        error,
        handleSubtitleChange,
        handleLocalSubtitleUpload,
        localFileInputRef,
    };
};
