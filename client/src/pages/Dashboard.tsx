import { useState, useEffect, useCallback, useRef } from 'react';
import { Layout } from '../components/Layout';
import api from '../api';
import toast from 'react-hot-toast';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
    FileIcon,
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
    Edit
} from 'lucide-react';

interface FileItem {
    id: any; // BigInt or String
    fileName: string;
    size: number;
    mimeType: string;
    date: number;
    driveId: string;
    hasThumbnail?: boolean;
}

export const Dashboard = () => {
    const [selectedDrive, setSelectedDrive] = useState('me');
    const [files, setFiles] = useState<FileItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [offsetId, setOffsetId] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);

    // Rename State
    const [renamingFile, setRenamingFile] = useState<FileItem | null>(null);
    const [newName, setNewName] = useState('');

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
                fetchFiles(selectedDrive, offsetId, searchQuery, false);
            }
        });
        if (node) observer.current.observe(node);
    }, [loading, hasMore, offsetId, selectedDrive, searchQuery]);

    useEffect(() => {
        // Reset state when drive changes
        setFiles([]);
        setOffsetId(null);
        setHasMore(true);
        setSearchQuery('');
        fetchFiles(selectedDrive, null, '', true);
    }, [selectedDrive]);

    // Debounce search
    useEffect(() => {
        if (searchQuery === '') {
            if (offsetId !== null || files.length > 0) {
                setFiles([]);
                setOffsetId(null);
                setHasMore(true);
                fetchFiles(selectedDrive, null, '', true);
            } else if (files.length === 0 && !loading) {
                fetchFiles(selectedDrive, null, '', true);
            }
            return;
        }

        const timeout = setTimeout(() => {
            setFiles([]);
            setOffsetId(null);
            setHasMore(true);
            fetchFiles(selectedDrive, null, searchQuery, true);
        }, 500);

        return () => clearTimeout(timeout);
    }, [searchQuery]);

    const fetchFiles = async (driveId: string, currentOffset: string | null, search: string, isNewSearch: boolean) => {
        setLoading(true);
        try {
            const params: any = { limit: 20 };
            if (currentOffset) params.offsetId = currentOffset;
            if (search) params.search = search;

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

        try {
            await api.post('/files/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                onUploadProgress: (progressEvent) => {
                    const total = progressEvent.total || 1;
                    const progress = Math.round((progressEvent.loaded * 100) / total);
                    setUploadProgress(progress);
                },
            });

            // Refresh files
            setFiles([]);
            setOffsetId(null);
            setHasMore(true);
            fetchFiles(selectedDrive, null, searchQuery, true);
        } catch (error) {
            console.error('Upload failed', error);
            alert('Failed to upload file.');
        } finally {
            setUploading(false);
            setUploadProgress(0);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleRenameClick = (file: FileItem) => {
        setRenamingFile(file);
        setNewName(file.fileName);
    };

    const handleRenameSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!renamingFile || !newName.trim()) return;

        const originalFileName = renamingFile.fileName;
        const targetFileId = renamingFile.id;
        const targetNewName = newName.trim();

        // Optimistic Update
        const previousFiles = [...files];
        setFiles(prev => prev.map(f =>
            f.id === targetFileId ? { ...f, fileName: targetNewName } : f
        ));
        setRenamingFile(null);
        setNewName('');

        const toastId = toast.loading('Renaming file...');

        try {
            await api.put(`/files/rename/${targetFileId}?driveId=${selectedDrive}`, {
                newName: targetNewName
            });
            toast.success('File renamed successfully', { id: toastId });
        } catch (error) {
            console.error('Rename failed', error);
            // Revert on error
            setFiles(previousFiles);
            toast.error('Failed to rename file', { id: toastId });
        }
    };

    const handleDelete = async (file: FileItem) => {
        if (!window.confirm(`Are you sure you want to delete "${file.fileName}"?`)) {
            return;
        }

        try {
            await api.delete(`/files/delete/${file.id}?driveId=${selectedDrive}`);

            // Remove from local state immediately
            setFiles(prev => prev.filter(f => f.id !== file.id));
        } catch (error) {
            console.error('Delete failed', error);
            alert('Failed to delete file.');
        }
    };

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
        return new Date(timestamp * 1000).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const isImage = (mimeType: string) => mimeType ? mimeType.startsWith('image/') : false;

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

    // Helper for smaller icons in the corner
    const getSmallFileIcon = (mimeType: string) => {
        if (!mimeType) return <FileIcon className="w-6 h-6" />;
        if (mimeType.startsWith('image/')) return <FileImage className="w-6 h-6" />;
        if (mimeType.startsWith('video/')) return <FileVideo className="w-6 h-6" />;
        if (mimeType.startsWith('audio/')) return <FileAudio className="w-6 h-6" />;
        if (mimeType.startsWith('text/')) return <FileText className="w-6 h-6" />;
        if (mimeType.includes('zip') || mimeType.includes('rar')) return <FileArchive className="w-6 h-6" />;
        return <FileIcon className="w-6 h-6" />;
    };

    const handleCardClick = (file: FileItem) => {
        if (isImage(file.mimeType)) {
            setPreviewFile(file);
        }
    };

    return (
        <Layout onDriveSelect={setSelectedDrive} selectedDriveId={selectedDrive}>
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
            />

            {/* Rename Modal */}
            {renamingFile && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setRenamingFile(null)}>
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-medium text-gray-800">Rename File</h3>
                            <button onClick={() => setRenamingFile(null)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleRenameSubmit} className="p-4">
                            <div className="mb-4">
                                <label className="block text-sm text-gray-600 mb-1">Name</label>
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    autoFocus
                                />
                            </div>
                            <div className="flex justify-end space-x-2">
                                <button
                                    type="button"
                                    onClick={() => setRenamingFile(null)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!newName.trim() || newName === renamingFile.fileName}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Rename
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Image Preview Modal */}
            {previewFile && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setPreviewFile(null)}>
                    <div className="max-w-5xl max-h-[90vh] w-full flex flex-col items-center" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setPreviewFile(null)}
                            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-50 p-2 bg-black/50 rounded-full"
                        >
                            <X className="w-8 h-8" />
                        </button>
                        <img
                            src={`/api/files/view/${previewFile.id}?driveId=${selectedDrive}`}
                            alt={previewFile.fileName}
                            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                        />
                        <div className="mt-4 text-white text-center">
                            <h3 className="text-xl font-medium">{previewFile.fileName}</h3>
                            <p className="text-gray-400 text-sm">{formatSize(previewFile.size)} • {formatExactDate(previewFile.date)}</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">My Files</h1>
                    <p className="text-gray-500 text-sm">Browsing files from {selectedDrive === 'me' ? 'Saved Messages' : 'Channel'}</p>
                </div>

                <div className="flex flex-col md:flex-row gap-3">
                    {/* Search Bar */}
                    <div className="relative w-full md:w-64">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="Search files..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <button
                        onClick={handleUploadClick}
                        disabled={uploading}
                        className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {uploading ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                <span>{uploadProgress}%</span>
                            </>
                        ) : (
                            <>
                                <Download className="w-4 h-4 rotate-180" /> {/* Upload icon (rotated download) */}
                                <span>Upload</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Upload Progress Bar */}
            {uploading && (
                <div className="mb-4">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                    </div>
                    <p className="text-xs text-right text-gray-500 mt-1">Uploading... {uploadProgress}%</p>
                </div>
            )}

            {files.length === 0 && !loading ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                    <Database className="w-12 h-12 mb-4 opacity-50" />
                    <p>{searchQuery ? 'No files match your search' : 'No files found in this drive'}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-4">
                    {files.map((file, index) => {
                        const isLastElement = files.length === index + 1;
                        return (
                            <div
                                ref={isLastElement ? lastFileElementRef : null}
                                key={`${file.id}-${index}`}
                                onClick={() => handleCardClick(file)}
                                className={`bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group flex flex-col h-full ${isImage(file.mimeType) ? 'cursor-pointer' : ''} relative`}
                            >
                                <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <DropdownMenu.Root>
                                        <DropdownMenu.Trigger asChild>
                                            <button
                                                className="p-1.5 bg-white/90 hover:bg-white text-gray-600 hover:text-blue-600 rounded-full shadow-sm backdrop-blur-sm transition-colors focus:outline-none"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <MoreVertical className="w-4 h-4" />
                                            </button>
                                        </DropdownMenu.Trigger>

                                        <DropdownMenu.Portal>
                                            <DropdownMenu.Content
                                                className="min-w-[160px] bg-white rounded-lg shadow-lg border border-gray-100 p-1 z-50 animate-in fade-in zoom-in-95 duration-100"
                                                sideOffset={5}
                                                align="end"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {isImage(file.mimeType) && (
                                                    <DropdownMenu.Item
                                                        className="flex items-center px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 rounded-md cursor-pointer outline-none"
                                                        onClick={() => setPreviewFile(file)}
                                                    >
                                                        <Eye className="w-4 h-4 mr-2" />
                                                        View
                                                    </DropdownMenu.Item>
                                                )}

                                                <DropdownMenu.Item
                                                    className="flex items-center px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 rounded-md cursor-pointer outline-none"
                                                    onClick={() => window.open(`/api/files/download/${file.id}?driveId=${selectedDrive}`, '_blank')}
                                                >
                                                    <Download className="w-4 h-4 mr-2" />
                                                    Download
                                                </DropdownMenu.Item>

                                                <DropdownMenu.Item
                                                    className="flex items-center px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 rounded-md cursor-pointer outline-none"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleRenameClick(file);
                                                    }}
                                                >
                                                    <Edit className="w-4 h-4 mr-2" />
                                                    Rename
                                                </DropdownMenu.Item>

                                                <DropdownMenu.Separator className="h-px bg-gray-100 my-1" />

                                                <DropdownMenu.Item
                                                    className="flex items-center px-2 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md cursor-pointer outline-none"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(file);
                                                    }}
                                                >
                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                    Delete
                                                </DropdownMenu.Item>
                                            </DropdownMenu.Content>
                                        </DropdownMenu.Portal>
                                    </DropdownMenu.Root>
                                </div>

                                <div className="relative mb-3 flex-grow flex items-center justify-center bg-gray-50 rounded-lg overflow-hidden min-h-[140px]">
                                    {/* Thumbnail Logic */}
                                    {file.hasThumbnail ? (
                                        <img
                                            src={`/api/files/thumbnail/${file.id}?driveId=${selectedDrive}`}
                                            alt={file.fileName}
                                            className="w-full h-full object-cover absolute inset-0"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                            }}
                                        />
                                    ) : null}
                                    <div className={`${file.hasThumbnail ? 'hidden' : ''} p-4 text-blue-600`}>
                                        {getFileIcon(file.mimeType)}
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-start justify-between mb-1">
                                        <h3 className="font-medium text-gray-800 truncate flex-1" title={file.fileName}>{file.fileName}</h3>
                                        {!file.hasThumbnail && (
                                            <div className="text-blue-600 opacity-50 ml-2">
                                                {getSmallFileIcon(file.mimeType)}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between text-xs text-gray-400">
                                        <span>{formatSize(file.size)}</span>
                                        <div className="flex items-center group/date relative cursor-help">
                                            <Clock className="w-3 h-3 mr-1" />
                                            <span>{formatRelativeTime(file.date)}</span>
                                            {/* Tooltip logic remains */}
                                            <div className="absolute bottom-full right-0 mb-2 hidden group-hover/date:block z-10 whitespace-nowrap">
                                                <div className="bg-gray-800 text-white text-xs py-1 px-2 rounded shadow-lg">
                                                    {formatExactDate(file.date)}
                                                </div>
                                                <div className="w-2 h-2 bg-gray-800 rotate-45 absolute bottom-[-4px] right-2"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                    {loading && (
                        <div className="col-span-full flex justify-center py-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    )}
                </div>
            )}
        </Layout>
    );
};
