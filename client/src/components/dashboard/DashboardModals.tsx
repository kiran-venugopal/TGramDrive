import type { FileItem, FolderItem } from '../../types';
import { X, Trash2, Home, Folder as FolderIcon, Download, FileImage, FileVideo, FileAudio, FileText, FileArchive, FileIcon, UploadCloud } from 'lucide-react';
import type { FolderActionType } from '../../hooks/useFolderActions';

interface DashboardModalsProps {
    renamingFile: FileItem | null;
    setRenamingFile: (file: FileItem | null) => void;
    newName: string;
    setNewName: (name: string) => void;
    handleRenameSubmit: (e: React.FormEvent) => void;

    newFolderModalOpen: boolean;
    setNewFolderModalOpen: (open: boolean) => void;
    newFolderName: string;
    setNewFolderName: (name: string) => void;
    handleCreateFolder: (e: React.FormEvent) => void;
    selectedFilesSize: number;

    folderAction: FolderActionType;
    setFolderAction: (action: FolderActionType) => void;
    handleRenameFolder: (e: React.FormEvent) => void;
    handleDeleteFolder: () => void;

    moveTarget: string | null;
    setMoveTarget: (target: string | null) => void;
    folders: FolderItem[];
    handleMoveFiles: (e: React.FormEvent) => void;

    previewFile: FileItem | null;
    setPreviewFile: (file: FileItem | null) => void;
    selectedDrive: string;

    sharedFilesPending?: File[];
    setSharedFilesPending?: (files: File[]) => void;
    onConfirmSharedUpload?: () => void;
}

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

const formatSize = (bytes: number) => {
    if (!bytes || bytes <= 0) return '';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatExactDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const DashboardModals = ({
    renamingFile,
    setRenamingFile,
    newName,
    setNewName,
    handleRenameSubmit,
    newFolderModalOpen,
    setNewFolderModalOpen,
    newFolderName,
    setNewFolderName,
    handleCreateFolder,
    selectedFilesSize,
    folderAction,
    setFolderAction,
    handleRenameFolder,
    handleDeleteFolder,
    moveTarget,
    setMoveTarget,
    folders,
    handleMoveFiles,
    previewFile,
    setPreviewFile,
    selectedDrive,
    sharedFilesPending = [],
    setSharedFilesPending,
    onConfirmSharedUpload
}: DashboardModalsProps) => {
    return (
        <>
            {sharedFilesPending.length > 0 && setSharedFilesPending && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setSharedFilesPending([])}>
                    <div className="bg-brand-bg border border-brand-text/10 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-5 text-center">
                            <UploadCloud className="w-12 h-12 text-brand-primary mx-auto mb-3" />
                            <h3 className="font-medium text-lg text-brand-text mb-2">Upload Shared Files?</h3>
                            <p className="text-sm text-brand-text/70 mb-4">
                                You are about to upload {sharedFilesPending.length} file(s) shared from another app to your <b>Saved Messages</b>.
                            </p>
                            <div className="flex justify-center space-x-3 mt-6">
                                <button onClick={() => setSharedFilesPending([])} className="px-4 py-2 bg-black/20 text-brand-text rounded-lg hover:bg-black/40">Cancel</button>
                                <button onClick={onConfirmSharedUpload} className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 shadow-lg shadow-brand-primary/20">Upload Now</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {renamingFile && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setRenamingFile(null)}>
                    <div className="bg-brand-bg border border-brand-text/10 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-brand-text/10 flex justify-between items-center">
                            <h3 className="font-medium text-brand-text">Rename File</h3>
                        </div>
                        <form onSubmit={handleRenameSubmit} className="p-4">
                            <div className="flex items-center gap-2 mb-4">
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    className="w-full px-3 py-2 border border-brand-text/20 rounded-lg bg-black/20 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary placeholder-brand-text/30"
                                    autoFocus
                                />
                                {renamingFile.fileName.includes('.') && (
                                    <span className="px-2 py-2 rounded-lg bg-black/30 text-brand-text/70 text-sm select-none">
                                        {renamingFile.fileName.substring(renamingFile.fileName.lastIndexOf('.'))}
                                    </span>
                                )}
                            </div>
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
                            {selectedFilesSize > 0 && (
                                <p className="text-xs text-brand-text/50 mb-4">
                                    {selectedFilesSize} file(s) will be moved into this folder.
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

            {previewFile && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md" onClick={() => setPreviewFile(null)}>
                    <div className="max-w-5xl h-full max-h-[90vh] w-full flex flex-col items-center justify-center relative" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setPreviewFile(null)} className="absolute -top-4 -right-2 md:top-0 md:right-0 text-white p-2 bg-black/50 hover:bg-black/80 rounded-full z-50 transition-colors"><X className="w-6 h-6" /></button>

                        <div className="flex-1 w-full min-h-0 flex items-center justify-center pb-4">
                            {isImage(previewFile.mimeType) ? (
                                <img src={`/api/files/view/${previewFile.id}?driveId=${selectedDrive}`} alt={previewFile.fileName} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
                            ) : isVideo(previewFile.mimeType) ? (
                                <video src={`/api/files/view/${previewFile.id}?driveId=${selectedDrive}`} controls autoPlay className="max-w-full max-h-full rounded-lg shadow-2xl bg-black/50" />
                            ) : (
                                <div className="bg-brand-bg w-full max-w-md p-8 rounded-2xl flex flex-col items-center text-center relative border border-brand-text/10 shadow-2xl mt-8">
                                    <div className="p-5 bg-black/20 rounded-full text-brand-primary mb-6"><div className="scale-150">{getFileIcon(previewFile.mimeType)}</div></div>
                                    <p className="text-brand-text/50 text-sm mb-6">Preview not supported in browser</p>
                                    <button onClick={() => window.open(`/api/files/download/${previewFile.id}?driveId=${selectedDrive}`, '_blank')} className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-brand-primary text-white rounded-xl shadow-lg hover:bg-brand-primary/90 transition-colors">
                                        <Download className="w-4 h-4" /> <span>Download File</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="w-full flex-shrink-0 pt-4 flex flex-col items-center mt-2 group">
                            <h2 className="text-white text-lg md:text-xl font-semibold mb-2 text-center max-w-2xl px-4 truncate w-full" title={previewFile.fileName}>{previewFile.fileName}</h2>
                            <div className="flex flex-wrap justify-center items-center gap-x-3 gap-y-2 text-white/70 text-xs md:text-sm">
                                {previewFile.size > 0 && (
                                    <>
                                        <span className="font-medium">{formatSize(previewFile.size)}</span>
                                        <span className="hidden sm:inline opacity-30">•</span>
                                    </>
                                )}
                                <span className="uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/10 text-white/90 font-medium">{previewFile.mimeType || 'unknown'}</span>
                                <span className="hidden sm:inline opacity-30">•</span>
                                <span>Uploaded by {previewFile.uploader || 'Unknown'}</span>
                                <span className="hidden sm:inline opacity-30">•</span>
                                <span>{formatExactDate(previewFile.date)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
