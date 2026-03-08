import { useState, useCallback, useRef, useEffect } from 'react';
import api from '../api';
import type { FileItem, FolderItem, FolderPathItem } from '../types';

export const useFileSystem = (selectedDrive: string) => {
    const [files, setFiles] = useState<FileItem[]>([]);
    const [folders, setFolders] = useState<FolderItem[]>([]);
    const [currentFolder, setCurrentFolder] = useState<string | null>(null);
    const [folderPath, setFolderPath] = useState<FolderPathItem[]>([]);

    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [offsetId, setOffsetId] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);

    const observer = useRef<IntersectionObserver | null>(null);

    const resetFilesState = useCallback(() => {
        setFiles([]);
        setOffsetId(null);
        setHasMore(true);
    }, []);

    const fetchFolders = useCallback(async (driveId: string, parentId: string | null) => {
        try {
            const res = await api.get(`/folders/${driveId}${parentId ? `?parentId=${parentId}` : ''}`);
            setFolders(res.data);
        } catch (error) {
            console.error('Failed to fetch folders', error);
        }
    }, []);

    const fetchFiles = useCallback(async (
        driveId: string,
        currentOffset: string | null,
        search: string,
        isNewSearch: boolean,
        folderId: string | null
    ) => {
        setLoading(true);
        try {
            const params: Record<string, string | number> = { limit: 20 };
            if (currentOffset) params.offsetId = currentOffset;
            if (search) params.search = search;
            if (folderId) params.folderId = folderId;

            const res = await api.get(`/files/${driveId}`, { params });

            const newFiles = res.data.files;
            const nextOffset = res.data.nextOffsetId;

            setFiles(prev => isNewSearch ? newFiles : [...prev, ...newFiles]);
            setOffsetId(nextOffset);
            setHasMore(!!nextOffset);
        } catch (error) {
            console.error('Failed to fetch files', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleNavigate = useCallback((folderId: string | null, folderName?: string) => {
        setCurrentFolder(folderId);
        if (folderId && folderName) {
            setFolderPath(prev => {
                const index = prev.findIndex(p => p.id === folderId);
                if (index !== -1) {
                    return prev.slice(0, index + 1);
                } else {
                    return [...prev, { id: folderId, name: folderName }];
                }
            });
        } else {
            setFolderPath([]);
        }
        setSearchQuery('');
    }, []);

    const lastFileElementRef = useCallback((node: HTMLDivElement | null) => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                fetchFiles(selectedDrive, offsetId, searchQuery, false, currentFolder);
            }
        });
        if (node) observer.current.observe(node);
    }, [loading, hasMore, offsetId, selectedDrive, searchQuery, currentFolder, fetchFiles]);

    // Handle drive changes: Reset navigation state
    useEffect(() => {
        setCurrentFolder(null);
        setFolderPath([]);
        setSearchQuery('');
    }, [selectedDrive]);

    // Single source of truth for fetching data with cascade-prevention debounce
    useEffect(() => {
        let active = true;

        const timeout = setTimeout(() => {
            if (!active) return;

            resetFilesState();

            if (searchQuery === '') {
                fetchFolders(selectedDrive, currentFolder);
                fetchFiles(selectedDrive, null, '', true, currentFolder);
            } else {
                setFolders([]); // hide folders when searching
                fetchFiles(selectedDrive, null, searchQuery, true, currentFolder);
            }
        }, searchQuery !== '' ? 500 : 20);

        return () => {
            active = false;
            clearTimeout(timeout);
        };
    }, [selectedDrive, currentFolder, searchQuery, fetchFolders, fetchFiles, resetFilesState]);

    return {
        files,
        setFiles,
        folders,
        currentFolder,
        folderPath,
        loading,
        searchQuery,
        setSearchQuery,
        handleNavigate,
        lastFileElementRef,
        fetchFolders,
        fetchFiles,
        resetFilesState
    };
};
