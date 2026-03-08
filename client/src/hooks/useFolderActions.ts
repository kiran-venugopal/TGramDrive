import { useState } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import type { FolderItem, FileItem } from '../types';

export type FolderActionType = { type: 'rename' | 'delete' | 'move', folder?: FolderItem, targetFiles?: FileItem[] } | null;

interface UseFolderActionsProps {
    selectedDrive: string;
    currentFolder: string | null;
    selectedFiles: Set<string | number>;
    clearSelection: () => void;
    fetchFolders: (driveId: string, parentId: string | null) => void;
    fetchFiles: (driveId: string, offset: string | null, search: string, isNew: boolean, folderId: string | null) => void;
    resetFilesState: () => void;
    setFiles: React.Dispatch<React.SetStateAction<FileItem[]>>;
}

export const useFolderActions = ({
    selectedDrive,
    currentFolder,
    selectedFiles,
    clearSelection,
    fetchFolders,
    fetchFiles,
    resetFilesState,
    setFiles
}: UseFolderActionsProps) => {
    const [newFolderModalOpen, setNewFolderModalOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [folderAction, setFolderAction] = useState<FolderActionType>(null);
    const [moveTarget, setMoveTarget] = useState<string | null>(null);

    const handleCreateFolder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newFolderName.trim()) return;

        const toastId = toast.loading('Creating folder...');
        try {
            await api.post('/folders', {
                name: newFolderName,
                driveId: selectedDrive,
                parentId: currentFolder,
                fileIds: Array.from(selectedFiles)
            });

            setNewFolderModalOpen(false);
            setNewFolderName('');
            clearSelection();

            fetchFolders(selectedDrive, currentFolder);
            if (selectedFiles.size > 0) {
                resetFilesState();
                fetchFiles(selectedDrive, null, '', true, currentFolder);
            }
            toast.success('Folder created', { id: toastId });
        } catch {
            toast.error('Failed to create folder', { id: toastId });
        }
    };

    const handleRenameFolder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (folderAction?.type !== 'rename' || !folderAction.folder || !newFolderName.trim()) return;

        const toastId = toast.loading('Renaming folder...');
        try {
            await api.put(`/folders/${folderAction.folder._id}`, { name: newFolderName });
            fetchFolders(selectedDrive, currentFolder);
            setFolderAction(null);
            toast.success('Folder renamed', { id: toastId });
        } catch {
            toast.error('Failed to rename folder', { id: toastId });
        }
    };

    const handleDeleteFolder = async () => {
        if (folderAction?.type !== 'delete' || !folderAction.folder) return;

        const toastId = toast.loading('Deleting folder...');
        try {
            await api.delete(`/folders/${folderAction.folder._id}`);
            fetchFolders(selectedDrive, currentFolder);
            setFolderAction(null);
            toast.success('Folder deleted', { id: toastId });
        } catch {
            toast.error('Failed to delete folder', { id: toastId });
        }
    };

    const handleMoveFiles = async (e: React.FormEvent) => {
        e.preventDefault();
        if (folderAction?.type !== 'move' || !folderAction.targetFiles) return;

        const toastId = toast.loading('Moving files...');
        try {
            await api.post('/folders/move', {
                fileIds: folderAction.targetFiles.map(f => f.id),
                driveId: selectedDrive,
                targetFolderId: moveTarget === 'root' ? null : moveTarget
            });

            // Optimistic removal from view
            const movingIds = new Set(folderAction.targetFiles.map(f => f.id));
            setFiles(prev => prev.filter(f => !movingIds.has(f.id)));

            clearSelection();
            setFolderAction(null);
            toast.success('Files moved successfully', { id: toastId });
        } catch {
            toast.error('Failed to move files', { id: toastId });
        }
    };

    return {
        newFolderModalOpen,
        setNewFolderModalOpen,
        newFolderName,
        setNewFolderName,
        folderAction,
        setFolderAction,
        moveTarget,
        setMoveTarget,
        handleCreateFolder,
        handleRenameFolder,
        handleDeleteFolder,
        handleMoveFiles
    };
};
