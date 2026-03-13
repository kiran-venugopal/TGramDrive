import { useState, useRef } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import type { FileItem } from '../types';

interface UseFileActionsProps {
    selectedDrive: string;
    currentFolder: string | null;
    files: FileItem[];
    setFiles: React.Dispatch<React.SetStateAction<FileItem[]>>;
    selectedFiles: Set<string | number>;
    clearSelection: () => void;
    fetchFiles: (driveId: string, offset: string | null, search: string, isNew: boolean, folderId: string | null) => void;
    resetFilesState: () => void;
}

export const useFileActions = ({
    selectedDrive,
    currentFolder,
    files,
    setFiles,
    selectedFiles,
    clearSelection,
    fetchFiles,
    resetFilesState
}: UseFileActionsProps) => {
    // Upload State
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadFileName, setUploadFileName] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Rename State
    const [renamingFile, setRenamingFile] = useState<FileItem | null>(null);
    const [newName, setNewName] = useState('');

    const handleUploadClick = () => {
        if (selectedDrive !== 'me') {
            alert('Uploads are only allowed in Saved Messages.');
            return;
        }
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement> | { target: { files: FileList | null } }) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setUploadProgress(0);
        setUploadFileName(file.name);

        const formData = new FormData();
        formData.append('file', file);
        if (currentFolder) formData.append('folderId', currentFolder);

        try {
            await api.post('/files/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    const total = progressEvent.total || 1;
                    const progress = Math.round((progressEvent.loaded * 100) / total);
                    setUploadProgress(progress);
                },
            });

            resetFilesState();
            fetchFiles(selectedDrive, null, '', true, currentFolder);
        } catch (error) {
            console.error('Upload failed', error);
            alert('Failed to upload file.');
        } finally {
            setUploading(false);
            setUploadProgress(0);
            setUploadFileName('');
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleRenameSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!renamingFile || !newName.trim()) return;

        const targetFileId = renamingFile.id;
        const originalName = renamingFile.fileName;
        const lastDot = originalName.lastIndexOf('.');
        const extension = lastDot > 0 ? originalName.slice(lastDot) : '';
        const targetNewName = `${newName.trim()}${extension}`;
        const previousFiles = [...files];

        // Optimistic update
        setFiles(prev => prev.map(f => f.id === targetFileId ? { ...f, fileName: targetNewName } : f));
        setRenamingFile(null);
        setNewName('');

        const toastId = toast.loading('Renaming file...');
        try {
            await api.put(`/files/rename/${targetFileId}?driveId=${selectedDrive}`, { newName: targetNewName });
            toast.success('File renamed successfully', { id: toastId });
        } catch (error) {
            console.error('Rename failed', error);
            setFiles(previousFiles); // Rollback
            toast.error('Failed to rename file', { id: toastId });
        }
    };

    const handleDelete = async (file: FileItem) => {
        if (!window.confirm(`Are you sure you want to delete "${file.fileName}"?`)) return;
        try {
            await api.delete(`/files/delete/${file.id}?driveId=${selectedDrive}`);
            setFiles(prev => prev.filter(f => f.id !== file.id));
        } catch (error) {
            console.error('Delete failed', error);
            alert('Failed to delete file.');
        }
    };

    const handleDeleteSelected = async () => {
        if (!window.confirm(`Are you sure you want to delete ${selectedFiles.size} files?`)) return;
        const toastId = toast.loading('Deleting files...');
        try {
            for (const fileId of selectedFiles) {
                await api.delete(`/files/delete/${fileId}?driveId=${selectedDrive}`);
            }
            setFiles(prev => prev.filter(f => !selectedFiles.has(f.id)));
            clearSelection();
            toast.success('Files deleted successfully', { id: toastId });
        } catch (error) {
            console.error('Delete failed', error);
            toast.error('Failed to delete some files', { id: toastId });
        }
    };

    return {
        uploading,
        uploadProgress,
        uploadFileName,
        fileInputRef,
        renamingFile,
        setRenamingFile,
        newName,
        setNewName,
        handleUploadClick,
        handleFileChange,
        handleRenameSubmit,
        handleDelete,
        handleDeleteSelected
    };
};
