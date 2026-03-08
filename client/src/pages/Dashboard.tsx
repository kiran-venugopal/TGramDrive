import { useState, useEffect, useCallback, useRef } from 'react';
import { Layout } from '../components/Layout';
import api from '../api';
import toast from 'react-hot-toast';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
    FileIcon,
    Dot,
    Download,
    Clock,
    Database,
    FileImage,
    FileVideo,
    FileAudio,
    FileText,
    FileArchive,
    X,
    Search,
    MoreVertical,
    Trash2,
    Eye,
    Edit,
    Folder as FolderIcon,
    FolderPlus,
    ChevronRight,
    Home,
    CheckSquare,
    Square,
    ArrowRightLeft,
    CornerLeftUp
} from 'lucide-react';

interface FileItem {
    id: any;
    fileName: string;
    size: number;
    mimeType: string;
    date: number;
    driveId: string;
    hasThumbnail?: boolean;
    uploader?: string;
}

interface FolderItem {
    _id: string;
    name: string;
    parentId: string | null;
    createdAt: string;
    driveId: string;
}

export const Dashboard = () => {
    const [selectedDrive, setSelectedDrive] = useState('me');
    const [files, setFiles] = useState<FileItem[]>([]);
    const [folders, setFolders] = useState<FolderItem[]>([]);
    const [currentFolder, setCurrentFolder] = useState<string | null>(null);
    const [folderPath, setFolderPath] = useState<{ id: string, name: string }[]>([]);

    const [loading, setLoading] = useState(false);
    const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [offsetId, setOffsetId] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);

    // Selection
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<Set<any>>(new Set());

    // Rename State
    const [renamingFile, setRenamingFile] = useState<FileItem | null>(null);
    const [newName, setNewName] = useState('');

    // Folder Actions
    const [newFolderModalOpen, setNewFolderModalOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [folderAction, setFolderAction] = useState<{ type: 'rename' | 'delete' | 'move', folder?: FolderItem, targetFiles?: FileItem[] } | null>(null);
    const [moveTarget, setMoveTarget] = useState<string | null>(null); // null = root

    // Upload State
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Observer for infinite scroll
    const observer = useRef<IntersectionObserver | null>(null);
    const lastFileElementRef = useCallback((node: HTMLDivElement) => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                fetchFiles(selectedDrive, offsetId, searchQuery, false, currentFolder);
            }
        });
        if (node) observer.current.observe(node);
    }, [loading, hasMore, offsetId, selectedDrive, searchQuery, currentFolder]);

    const resetFilesState = () => {
        setFiles([]);
        setOffsetId(null);
        setHasMore(true);
        setSelectedFiles(new Set());
    };

    useEffect(() => {
        setCurrentFolder(null);
        setFolderPath([]);
        resetFilesState();
        setSearchQuery('');
        fetchFolders(selectedDrive, null);
        fetchFiles(selectedDrive, null, '', true, null);
    }, [selectedDrive]);

    // Navigate to a folder
    const handleNavigate = (folderId: string | null, folderName?: string) => {
        setCurrentFolder(folderId);
        if (folderId && folderName) {
            const index = folderPath.findIndex(p => p.id === folderId);
            if (index !== -1) {
                setFolderPath(folderPath.slice(0, index + 1));
            } else {
                setFolderPath([...folderPath, { id: folderId, name: folderName }]);
            }
        } else {
            setFolderPath([]);
        }
        setSearchQuery('');
        resetFilesState();
        fetchFolders(selectedDrive, folderId);
        fetchFiles(selectedDrive, null, '', true, folderId);
    };

    // Debounce search
    useEffect(() => {
        if (searchQuery === '') {
            if (offsetId !== null || files.length > 0) {
                resetFilesState();
                fetchFolders(selectedDrive, currentFolder);
                fetchFiles(selectedDrive, null, '', true, currentFolder);
            } else if (files.length === 0 && !loading) {
                fetchFolders(selectedDrive, currentFolder);
                fetchFiles(selectedDrive, null, '', true, currentFolder);
            }
            return;
        }

        const timeout = setTimeout(() => {
            resetFilesState();
            setFolders([]); // hide folders when searching
            fetchFiles(selectedDrive, null, searchQuery, true, currentFolder);
        }, 500);

        return () => clearTimeout(timeout);
    }, [searchQuery]);

    // Escape handling
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setPreviewFile(null);
                setRenamingFile(null);
                setNewFolderModalOpen(false);
                setFolderAction(null);
                if (selectionMode) {
                    setSelectionMode(false);
                    setSelectedFiles(new Set());
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectionMode, previewFile, renamingFile]);

    const fetchFolders = async (driveId: string, parentId: string | null) => {
        try {
            const res = await api.get(`/folders/${driveId}${parentId ? `?parentId=${parentId}` : ''}`);
            setFolders(res.data);
        } catch (error) {
            console.error('Failed to fetch folders', error);
        }
    };

    const fetchFiles = async (driveId: string, currentOffset: string | null, search: string, isNewSearch: boolean, folderId: string | null) => {
        setLoading(true);
        try {
            const params: any = { limit: 20 };
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
    };

    const handleUploadClick = () => {
        if (selectedDrive !== 'me') {
            alert('Uploads are only allowed in Saved Messages.');
            return;
        }
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setUploadProgress(0);

        const formData = new FormData();
        formData.append('file', file);
        if (currentFolder) {
            formData.append('folderId', currentFolder);
        }

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
            fetchFiles(selectedDrive, null, searchQuery, true, currentFolder);
        } catch (error) {
            console.error('Upload failed', error);
            alert('Failed to upload file.');
        } finally {
            setUploading(false);
            setUploadProgress(0);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // --- File Actions ---

    const handleRenameSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!renamingFile || !newName.trim()) return;

        const targetFileId = renamingFile.id;
        const targetNewName = newName.trim();
        const previousFiles = [...files];
        setFiles(prev => prev.map(f => f.id === targetFileId ? { ...f, fileName: targetNewName } : f));

        setRenamingFile(null);
        setNewName('');

        const toastId = toast.loading('Renaming file...');
        try {
            await api.put(`/files/rename/${targetFileId}?driveId=${selectedDrive}`, { newName: targetNewName });
            toast.success('File renamed successfully', { id: toastId });
        } catch (error) {
            console.error('Rename failed', error);
            setFiles(previousFiles);
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
            setSelectedFiles(new Set());
            setSelectionMode(false);
            toast.success('Files deleted successfully', { id: toastId });
        } catch (error) {
            console.error('Delete failed', error);
            toast.error('Failed to delete some files', { id: toastId });
        }
    };

    // --- Folder Actions ---

    const handleCreateFolder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newFolderName.trim()) return;

        const toastId = toast.loading('Creating folder...');
        try {
            await api.post('/folders', {
                name: newFolderName,
                driveId: selectedDrive,
                parentId: currentFolder,
                fileIds: Array.from(selectedFiles) // Immediately move selected files into it
            });

            setNewFolderModalOpen(false);
            setNewFolderName('');
            setSelectedFiles(new Set());
            setSelectionMode(false);

            fetchFolders(selectedDrive, currentFolder);
            if (selectedFiles.size > 0) {
                resetFilesState();
                fetchFiles(selectedDrive, null, searchQuery, true, currentFolder);
            }
            toast.success('Folder created', { id: toastId });
        } catch (error) {
            console.error('Create error', error);
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
        } catch (error) {
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
        } catch (error) {
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

            // Remove moved files from current view
            const movingIds = new Set(folderAction.targetFiles.map(f => f.id));
            setFiles(prev => prev.filter(f => !movingIds.has(f.id)));

            setSelectedFiles(new Set());
            setSelectionMode(false);
            setFolderAction(null);
            toast.success('Files moved successfully', { id: toastId });
        } catch (error) {
            toast.error('Failed to move files', { id: toastId });
        }
    };

    // --- Formatters ---

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatRelativeTime = (timestamp: number) => {
        const now = Date.now();
        const date = new Date(timestamp * 1000);
        const diffInSeconds = Math.floor((now - date.getTime()) / 1000);

        if (diffInSeconds < 60) return 'just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
        if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
        if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} months ago`;
        return `${Math.floor(diffInSeconds / 31536000)} years ago`;
    };

    const formatExactDate = (timestamp: number) => {
        return new Date(timestamp * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    const isImage = (mimeType: string) => mimeType ? mimeType.startsWith('image/') : false;
    const isVideo = (mimeType: string) => mimeType ? mimeType.startsWith('video/') : false;

    const getFileIcon = (mimeType: string) => {
        if (!mimeType) return <FileIcon className="w-12 h-12" />;
        if (mimeType.startsWith('image/')) return <FileImage className="w-12 h-12" />;
        if (mimeType.startsWith('video/')) return <FileVideo className="w-12 h-12" />;
        if (mimeType.startsWith('audio/')) return <FileAudio className="w-12 h-12" />;
        if (mimeType.startsWith('text/')) return <FileText className="w-12 h-12" />;
        if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar') || mimeType.includes('7z')) return <FileArchive className="w-12 h-12" />;
        if (mimeType.includes('pdf')) return <FileText className="w-12 h-12" />;
        return <FileIcon className="w-12 h-12" />;
    };

    const handleCardClick = (file: FileItem) => {
        if (selectionMode) {
            const newSet = new Set(selectedFiles);
            if (newSet.has(file.id)) newSet.delete(file.id);
            else newSet.add(file.id);
            setSelectedFiles(newSet);
            if (newSet.size === 0) setSelectionMode(false);
        } else {
            setPreviewFile(file);
        }
    };

    const toggleSelectionMode = (file: FileItem) => {
        if (!selectionMode) {
            setSelectionMode(true);
            setSelectedFiles(new Set([file.id]));
        } else {
            const newSet = new Set(selectedFiles);
            if (newSet.has(file.id)) newSet.delete(file.id);
            else newSet.add(file.id);
            setSelectedFiles(newSet);
            if (newSet.size === 0) setSelectionMode(false);
        }
    };

    return (
        <Layout onDriveSelect={(id) => { setSelectedDrive(id); setSelectionMode(false); setSelectedFiles(new Set()); }} selectedDriveId={selectedDrive}>
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />

            {/* Modals */}
            {renamingFile && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setRenamingFile(null)}>
                    <div className="bg-brand-bg border border-brand-text/10 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-brand-text/10 flex justify-between items-center">
                            <h3 className="font-medium text-brand-text">Rename File</h3>
                        </div>
                        <form onSubmit={handleRenameSubmit} className="p-4">
                            <input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                className="w-full px-3 py-2 border border-brand-text/20 rounded-lg bg-black/20 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary placeholder-brand-text/30 mb-4"
                                autoFocus
                            />
                            <div className="flex justify-end space-x-2">
                                <button type="button" onClick={() => setRenamingFile(null)} className="px-4 py-2 text-brand-text/70 hover:bg-brand-text/5 rounded-lg">Cancel</button>
                                <button type="submit" disabled={!newName.trim()} className="px-4 py-2 bg-brand-primary text-white rounded-lg disabled:opacity-50">Rename</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {newFolderModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setNewFolderModalOpen(false)}>
                    <div className="bg-brand-bg border border-brand-text/10 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-brand-text/10 flex justify-between items-center">
                            <h3 className="font-medium text-brand-text">Create Folder</h3>
                        </div>
                        <form onSubmit={handleCreateFolder} className="p-4">
                            <input
                                type="text"
                                placeholder="Folder Name"
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                className="w-full px-3 py-2 border border-brand-text/20 rounded-lg bg-black/20 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary mb-4"
                                autoFocus
                            />
                            {selectedFiles.size > 0 && (
                                <p className="text-xs text-brand-text/50 mb-4">
                                    {selectedFiles.size} file(s) will be moved into this folder.
                                </p>
                            )}
                            <div className="flex justify-end space-x-2">
                                <button type="button" onClick={() => setNewFolderModalOpen(false)} className="px-4 py-2 text-brand-text/70 rounded-lg">Cancel</button>
                                <button type="submit" disabled={!newFolderName.trim()} className="px-4 py-2 bg-brand-primary text-white rounded-lg disabled:opacity-50">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {folderAction?.type === 'rename' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setFolderAction(null)}>
                    <div className="bg-brand-bg border border-brand-text/10 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-brand-text/10">
                            <h3 className="font-medium text-brand-text">Rename Folder</h3>
                        </div>
                        <form onSubmit={handleRenameFolder} className="p-4">
                            <input
                                type="text"
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                className="w-full px-3 py-2 border border-brand-text/20 rounded-lg bg-black/20 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary mb-4"
                                autoFocus
                            />
                            <div className="flex justify-end space-x-2">
                                <button type="button" onClick={() => setFolderAction(null)} className="px-4 py-2 text-brand-text/70 rounded-lg">Cancel</button>
                                <button type="submit" disabled={!newFolderName.trim()} className="px-4 py-2 bg-brand-primary text-white rounded-lg disabled:opacity-50">Rename</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {folderAction?.type === 'delete' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setFolderAction(null)}>
                    <div className="bg-brand-bg border border-brand-accent/50 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-5 text-center">
                            <Trash2 className="w-12 h-12 text-brand-accent mx-auto mb-3" />
                            <h3 className="font-medium text-lg text-brand-text mb-2">Delete Folder?</h3>
                            <p className="text-sm text-brand-text/70">
                                This will permanently delete the folder "{folderAction.folder?.name}" and <b>all files and subfolders</b> inside it from Telegram. This action cannot be undone.
                            </p>
                            <div className="mt-6 flex justify-center space-x-3">
                                <button onClick={() => setFolderAction(null)} className="px-4 py-2 bg-black/20 text-brand-text rounded-lg hover:bg-black/40">Cancel</button>
                                <button onClick={handleDeleteFolder} className="px-4 py-2 bg-brand-accent text-white rounded-lg hover:bg-red-600 shadow-lg shadow-brand-accent/20">Delete Forever</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {folderAction?.type === 'move' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setFolderAction(null)}>
                    <div className="bg-brand-bg border border-brand-text/10 rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-brand-text/10 flex justify-between items-center">
                            <h3 className="font-medium text-brand-text">Move {folderAction.targetFiles?.length} File(s)</h3>
                            <button onClick={() => setFolderAction(null)}><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
                            <p className="text-sm text-brand-text/70 mb-3">Select destination:</p>

                            <button
                                onClick={() => setMoveTarget('root')}
                                className={`w-full flex items-center p-3 rounded-lg border text-left mb-2 transition-colors ${moveTarget === 'root' ? 'border-brand-primary bg-brand-primary/10 text-brand-primary' : 'border-brand-text/10 text-brand-text hover:bg-black/20'}`}
                            >
                                <Home className="w-5 h-5 mr-3" />
                                <span className="font-medium">Root Directory</span>
                            </button>

                            {/* Render folders in root to move to. For simplicity, just listing root folders. Optional: recursive fetching. */}
                            {folders.length > 0 && <div className="text-xs uppercase text-brand-text/50 my-2 font-medium">Folders Here</div>}
                            {folders.map(f => (
                                <button
                                    key={f._id}
                                    onClick={() => setMoveTarget(f._id)}
                                    className={`w-full flex items-center p-3 rounded-lg border text-left mb-2 transition-colors ${moveTarget === f._id ? 'border-brand-primary bg-brand-primary/10 text-brand-primary' : 'border-brand-text/10 text-brand-text hover:bg-black/20'}`}
                                >
                                    <FolderIcon className="w-5 h-5 mr-3" />
                                    <span className="font-medium truncate">{f.name}</span>
                                </button>
                            ))}
                        </div>
                        <div className="p-4 border-t border-brand-text/10 flex justify-end">
                            <button disabled={!moveTarget} onClick={handleMoveFiles} className="px-4 py-2 bg-brand-primary text-white rounded-lg disabled:opacity-50">Move Here</button>
                        </div>
                    </div>
                </div>
            )}


            {/* File Preview Modal */}
            {previewFile && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                    <div className="max-w-5xl max-h-[90vh] w-full flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setPreviewFile(null)} className="absolute top-4 right-4 text-white p-2 bg-black/50 rounded-full z-50"><X className="w-8 h-8" /></button>
                        {isImage(previewFile.mimeType) ? (
                            <img src={`/api/files/view/${previewFile.id}?driveId=${selectedDrive}`} alt={previewFile.fileName} className="max-w-full max-h-[85vh] object-contain rounded-lg" />
                        ) : isVideo(previewFile.mimeType) ? (
                            <video src={`/api/files/view/${previewFile.id}?driveId=${selectedDrive}`} controls autoPlay className="max-w-full max-h-[85vh] rounded-lg" />
                        ) : (
                            <div className="bg-brand-bg w-full max-w-md p-8 rounded-2xl flex flex-col items-center text-center relative">
                                <div className="p-5 bg-black/20 rounded-full text-brand-primary mb-6"><div className="scale-150">{getFileIcon(previewFile.mimeType)}</div></div>
                                <h3 className="text-xl font-semibold mb-1 break-all">{previewFile.fileName}</h3>
                                <p className="text-brand-text/50 text-sm mb-6">Preview not supported</p>
                                <button onClick={() => window.open(`/api/files/download/${previewFile.id}?driveId=${selectedDrive}`, '_blank')} className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-brand-primary text-white rounded-xl">
                                    <Download className="w-4 h-4" /> <span>Download File</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="sticky top-0 z-20 bg-brand-bg/95 backdrop-blur-md p-4 -mt-2 mb-6 flex flex-col gap-4 border-b border-brand-text/5">
                <div className="flex flex-col md:flex-row md:items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-brand-text flex items-center flex-wrap gap-2">
                            <span
                                className="cursor-pointer hover:text-brand-primary transition-colors flex items-center"
                                onClick={() => handleNavigate(null)}
                            >
                                <Home className="w-6 h-6 mr-2" />
                            </span>
                            {folderPath.map((path, idx) => (
                                <span key={path.id} className="flex items-center text-brand-text">
                                    <ChevronRight className="w-5 h-5 text-brand-text/30 mx-1" />
                                    <span
                                        className="cursor-pointer hover:text-brand-primary transition-colors text-lg"
                                        onClick={() => handleNavigate(path.id, path.name)}
                                    >
                                        {path.name}
                                    </span>
                                </span>
                            ))}
                        </h1>
                        <p className="text-brand-text/50 text-sm mt-1">Browsing {selectedDrive === 'me' ? 'Saved Messages' : 'Channel'}</p>
                    </div>

                    <div className="flex flex-wrap gap-3 mt-4 md:mt-0">
                        {selectionMode ? (
                            <div className="flex items-center bg-brand-primary/10 border border-brand-primary/20 rounded-lg px-3 py-1.5 animate-in fade-in">
                                <span className="text-brand-primary font-medium mr-4 text-sm hidden sm:inline">{selectedFiles.size} selected</span>
                                <button
                                    onClick={() => {
                                        if (selectedFiles.size === files.length) {
                                            setSelectedFiles(new Set());
                                            setSelectionMode(false);
                                        } else {
                                            setSelectedFiles(new Set(files.map(f => f.id)));
                                        }
                                    }}
                                    className="text-sm text-brand-primary hover:bg-brand-primary/20 rounded-md px-2 py-1 transition-colors font-medium mr-2"
                                >
                                    {selectedFiles.size === files.length ? 'Deselect All' : 'Select All'}
                                </button>
                                <button
                                    onClick={() => {
                                        setFolderAction({ type: 'move', targetFiles: files.filter(f => selectedFiles.has(f.id)) });
                                        setMoveTarget(null);
                                    }}
                                    className="p-1.5 text-brand-primary hover:bg-brand-primary/20 rounded-md mr-1 tooltip" title="Move Selected"
                                >
                                    <ArrowRightLeft className="w-4 h-4" />
                                </button>
                                <button onClick={handleDeleteSelected} className="p-1.5 text-brand-accent hover:bg-brand-accent/20 rounded-md mr-1"><Trash2 className="w-4 h-4" /></button>
                                <button onClick={() => { setSelectionMode(false); setSelectedFiles(new Set()); }} className="p-1.5 text-brand-text/50 hover:bg-black/20 rounded-md"><X className="w-4 h-4" /></button>
                            </div>
                        ) : (
                            <div className="relative w-full md:w-64">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="h-5 w-5 text-brand-text/50" /></div>
                                <input type="text" className="block w-full pl-10 pr-3 py-2 border border-brand-text/10 rounded-sm bg-black/20 text-brand-text placeholder-brand-text/50 focus:outline-none focus:ring-1 focus:ring-brand-primary sm:text-sm" placeholder="Search files..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                            </div>
                        )}

                        <button onClick={() => { setNewFolderName(''); setNewFolderModalOpen(true); }} className="flex items-center space-x-2 px-3 py-2 bg-black/20 text-brand-text border border-brand-text/10 rounded-sm hover:bg-black/40 transition-colors">
                            <FolderPlus className="w-4 h-4" /> <span className="font-medium text-sm">New Folder</span>
                        </button>

                        <button onClick={handleUploadClick} disabled={uploading} className="flex items-center space-x-2 px-4 py-2 bg-brand-primary text-white rounded-sm hover:bg-brand-primary/80 transition-colors shadow-lg shadow-brand-primary/20">
                            {uploading ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : <Download className="w-4 h-4 rotate-180" />}
                            <span className="font-medium text-sm">Upload</span>
                        </button>
                    </div>
                </div>
            </div>

            {uploading && (
                <div className="mb-4 mx-4">
                    <div className="w-full bg-black/20 rounded-full h-2.5"><div className="bg-brand-primary h-2.5 rounded-full transition-all" style={{ width: `${uploadProgress}%` }}></div></div>
                </div>
            )}

            {files.length === 0 && folders.length === 0 && !loading ? (
                <div className="flex flex-col items-center justify-center h-64 text-brand-text/30">
                    <Database className="w-12 h-12 mb-4 opacity-50" />
                    <p>{searchQuery ? 'No results' : 'This folder is empty'}</p>
                </div>
            ) : (
                <div className="px-4 pb-8">
                    {/* Folders Grid */}
                    {folders.length > 0 && (
                        <>
                            <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-text/50 mb-3 ml-1">Folders</h2>
                            <div className="grid grid-cols-2 p-2 py-0 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 mb-8">
                                {folders.map((folder) => (
                                    <div
                                        key={folder._id}
                                        onClick={() => handleNavigate(folder._id, folder.name)}
                                        className="bg-black/20 backdrop-blur-sm hover:bg-black/40 border border-brand-text/5 hover:border-brand-primary/30 transition-all rounded-xl p-3 flex items-center cursor-pointer group relative shadow-sm"
                                    >
                                        <div className="absolute top-2 right-2 opacity-100 md:opacity-0 group-hover:opacity-100 z-10 transition-opacity">
                                            <DropdownMenu.Root>
                                                <DropdownMenu.Trigger asChild>
                                                    <button className="p-1 bg-brand-bg/90 hover:bg-brand-text/10 rounded-md" onClick={(e) => e.stopPropagation()}><MoreVertical className="w-4 h-4 text-brand-text" /></button>
                                                </DropdownMenu.Trigger>
                                                <DropdownMenu.Portal>
                                                    <DropdownMenu.Content className="min-w-[140px] bg-brand-bg rounded-lg shadow-xl border border-brand-text/10 p-1 z-50">
                                                        <DropdownMenu.Item onClick={() => handleNavigate(folder._id, folder.name)} className="flex items-center px-2 py-2 text-sm text-brand-text/90 hover:bg-brand-text/5 outline-none rounded-md cursor-pointer"><Eye className="w-4 h-4 mr-2" /> Open</DropdownMenu.Item>
                                                        <DropdownMenu.Item onClick={(e) => { e.stopPropagation(); setNewFolderName(folder.name); setFolderAction({ type: 'rename', folder }); }} className="flex items-center px-2 py-2 text-sm text-brand-text/90 hover:bg-brand-text/5 outline-none rounded-md cursor-pointer"><Edit className="w-4 h-4 mr-2" /> Rename</DropdownMenu.Item>
                                                        <DropdownMenu.Separator className="h-px bg-brand-text/10 my-1" />
                                                        <DropdownMenu.Item onClick={(e) => { e.stopPropagation(); setFolderAction({ type: 'delete', folder }); }} className="flex items-center px-2 py-2 text-sm text-brand-accent hover:bg-brand-accent/10 outline-none rounded-md cursor-pointer"><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenu.Item>
                                                    </DropdownMenu.Content>
                                                </DropdownMenu.Portal>
                                            </DropdownMenu.Root>
                                        </div>
                                        <FolderIcon className="w-8 h-8 text-brand-primary opacity-80 mr-3 flex-shrink-0" />
                                        <span className="font-medium text-brand-text truncate text-sm flex-1 select-none pointer-events-none" title={folder.name}>{folder.name}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {/* Files Grid */}
                    {files.length > 0 && (
                        <>
                            <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-text/50 mb-3 ml-1">Files</h2>
                            <div className="grid grid-cols-2 p-1 py-0 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2 border border-transparent">
                                {files.map((file, index) => {
                                    const isLast = files.length === index + 1;
                                    const isSelected = selectedFiles.has(file.id);

                                    return (
                                        <div
                                            ref={isLast ? lastFileElementRef : null}
                                            key={`${file.id}-${index}`}
                                            onClick={() => handleCardClick(file)}
                                            onContextMenu={(e) => { e.preventDefault(); toggleSelectionMode(file); }}
                                            className={`bg-black/20 backdrop-blur-sm transition-all group flex flex-col h-full cursor-pointer relative overflow-hidden rounded-md border ${isSelected ? 'border-brand-primary' : 'border-brand-text/5 hover:border-brand-primary/50'}`}
                                        >
                                            <div className={`absolute top-2 left-2 z-10 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-100 md:opacity-0 group-hover:opacity-100'}`} onClick={e => e.stopPropagation()}>
                                                <button onClick={(e) => { e.stopPropagation(); toggleSelectionMode(file); }} className={`p-1 rounded-sm backdrop-blur-sm transition-colors ${isSelected ? 'bg-brand-primary text-white' : 'bg-black/40 hover:bg-brand-primary text-white'}`}>
                                                    {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                                                </button>
                                            </div>

                                            <div className="absolute top-2 right-2 z-10 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                                <DropdownMenu.Root>
                                                    <DropdownMenu.Trigger asChild>
                                                        <button className="p-1.5 bg-brand-bg/90 hover:bg-brand-bg text-brand-text hover:text-brand-primary rounded-md shadow-sm border border-brand-text/10" onClick={(e) => e.stopPropagation()}>
                                                            <MoreVertical className="w-4 h-4" />
                                                        </button>
                                                    </DropdownMenu.Trigger>
                                                    <DropdownMenu.Portal>
                                                        <DropdownMenu.Content className="min-w-[160px] bg-brand-bg rounded-lg shadow-xl border border-brand-text/10 p-1 z-50">
                                                            <DropdownMenu.Item onClick={() => setPreviewFile(file)} className="flex items-center px-2 py-2 text-sm hover:bg-brand-text/5 cursor-pointer outline-none"><Eye className="w-4 h-4 mr-2" /> View</DropdownMenu.Item>
                                                            <DropdownMenu.Item onClick={() => window.open(`/api/files/download/${file.id}?driveId=${selectedDrive}`, '_blank')} className="flex items-center px-2 py-2 text-sm hover:bg-brand-text/5 cursor-pointer outline-none"><Download className="w-4 h-4 mr-2" /> Download</DropdownMenu.Item>
                                                            <DropdownMenu.Item onClick={(e) => { e.stopPropagation(); setFolderAction({ type: 'move', targetFiles: [file] }); setMoveTarget(null); }} className="flex items-center px-2 py-2 text-sm hover:bg-brand-text/5 cursor-pointer outline-none"><ArrowRightLeft className="w-4 h-4 mr-2" /> Move To...</DropdownMenu.Item>
                                                            <DropdownMenu.Item onClick={(e) => { e.stopPropagation(); handleRenameClick(file); }} className="flex items-center px-2 py-2 text-sm hover:bg-brand-text/5 cursor-pointer outline-none"><Edit className="w-4 h-4 mr-2" /> Rename</DropdownMenu.Item>
                                                            <DropdownMenu.Separator className="h-px bg-brand-text/10 my-1" />
                                                            <DropdownMenu.Item onClick={(e) => { e.stopPropagation(); handleDelete(file); }} className="flex items-center px-2 py-2 text-sm text-brand-accent hover:bg-brand-accent/10 cursor-pointer outline-none"><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenu.Item>
                                                        </DropdownMenu.Content>
                                                    </DropdownMenu.Portal>
                                                </DropdownMenu.Root>
                                            </div>

                                            <div className="relative flex-grow flex items-center justify-center bg-black/20 min-h-[160px]">
                                                {file.hasThumbnail ? (
                                                    <img src={`/api/files/thumbnail/${file.id}?driveId=${selectedDrive}`} alt={file.fileName} className="w-full bg-black/20 h-full object-cover absolute inset-0" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                                ) : <div className="p-4 text-brand-primary opacity-50">{getFileIcon(file.mimeType)}</div>}
                                            </div>

                                            <div className="py-2 px-2 border-t border-brand-text/5">
                                                <h3 className="font-medium text-brand-text truncate text-sm px-1 mb-1" title={file.fileName}>{file.fileName}</h3>
                                                <div className="flex items-center justify-between px-1 text-xs text-brand-text/50">
                                                    <span>{formatSize(file.size)}</span>
                                                    <span>{formatExactDate(file.date)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </>
                    )}
                    {loading && <div className="flex justify-center py-6"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div></div>}
                </div>
            )}
        </Layout>
    );
};
