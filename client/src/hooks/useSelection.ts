import { useState, useCallback } from 'react';
import type { FileItem } from '../types';

export const useSelection = (files: FileItem[]) => {
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<Set<string | number>>(new Set());

    const toggleSelectionMode = useCallback((file: FileItem) => {
        if (!selectionMode) {
            setSelectionMode(true);
            setSelectedFiles(new Set([file.id]));
        } else {
            setSelectedFiles(prev => {
                const newSet = new Set(prev);
                if (newSet.has(file.id)) newSet.delete(file.id);
                else newSet.add(file.id);

                if (newSet.size === 0) {
                    setSelectionMode(false);
                }
                return newSet;
            });
        }
    }, [selectionMode]);

    const selectAll = useCallback(() => {
        if (selectedFiles.size === files.length) {
            setSelectedFiles(new Set());
            setSelectionMode(false);
        } else {
            setSelectedFiles(new Set(files.map(f => f.id)));
        }
    }, [files, selectedFiles.size]);

    const clearSelection = useCallback(() => {
        setSelectedFiles(new Set());
        setSelectionMode(false);
    }, []);

    return {
        selectionMode,
        setSelectionMode,
        selectedFiles,
        setSelectedFiles,
        toggleSelectionMode,
        selectAll,
        clearSelection
    };
};
