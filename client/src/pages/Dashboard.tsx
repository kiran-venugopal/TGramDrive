import { useState, useEffect } from 'react';
import { get, del } from 'idb-keyval';
import { Layout } from '../components/Layout';
import { Database, UploadCloud, CheckCircle2, Loader2 } from 'lucide-react';
import type { FileItem } from '../types';

// Custom Hooks
import { useFileSystem } from '../hooks/useFileSystem';
import { useSelection } from '../hooks/useSelection';
import { useFileActions } from '../hooks/useFileActions';
import { useFolderActions } from '../hooks/useFolderActions';

// Components
import { DashboardToolbar } from '../components/dashboard/DashboardToolbar';
import { FolderGrid } from '../components/dashboard/FolderGrid';
import { FileGrid } from '../components/dashboard/FileGrid';
import { DashboardModals } from '../components/dashboard/DashboardModals';

export const Dashboard = () => {
    const [selectedDrive, setSelectedDrive] = useState('me');
    const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [sharedFilesPending, setSharedFilesPending] = useState<File[]>([]);

    // 1. File System State (Fetching & Navigation)
    const {
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
    } = useFileSystem(selectedDrive);

    // 2. Selection State
    const {
        selectionMode,
        setSelectionMode,
        selectedFiles,
        setSelectedFiles,
        toggleSelectionMode,
        selectAll,
        clearSelection
    } = useSelection(files);

    // 3. File Actions
    const {
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
    } = useFileActions({
        selectedDrive,
        currentFolder,
        files,
        setFiles,
        selectedFiles,
        clearSelection,
        fetchFiles,
        resetFilesState
    });

    // 4. Folder Actions
    const {
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
    } = useFolderActions({
        selectedDrive,
        currentFolder,
        selectedFiles,
        clearSelection,
        fetchFolders,
        fetchFiles,
        resetFilesState,
        setFiles,
    });

    // Handle Escape Key Global Reset
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setPreviewFile(null);
                setRenamingFile(null);
                setNewFolderModalOpen(false);
                setFolderAction(null);
                clearSelection();
                setSharedFilesPending([]);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [clearSelection, setRenamingFile, setNewFolderModalOpen, setFolderAction]);

    // Handle Share Target SDK
    useEffect(() => {
        const checkSharedFiles = async () => {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('shared-target') === 'true') {
                try {
                    const files = await get('tg-drive-shared-files');
                    if (files && files.length > 0) {
                        setSharedFilesPending(files);
                    }
                    await del('tg-drive-shared-files');
                    window.history.replaceState({}, document.title, window.location.pathname);
                } catch (error) {
                    console.error('Error fetching shared files:', error);
                }
            }
        };
        checkSharedFiles();
    }, []);

    // Render Handlers
    const handleCardClick = (file: FileItem) => {
        if (selectionMode) {
            toggleSelectionMode(file);
        } else {
            setPreviewFile(file);
        }
    };

    // Drag & Drop Handlers
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (selectedDrive === 'me') {
            setIsDragging(true);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (selectedDrive !== 'me') {
            alert('Uploads are only allowed in Saved Messages.');
            return;
        }

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            // Handle only the first file for now, similar to normal upload behavior
            await handleFileChange({ target: { files: e.dataTransfer.files } } as unknown as React.ChangeEvent<HTMLInputElement>);
        }
    };

    return (
        <Layout
            onDriveSelect={(id) => {
                setSelectedDrive(id);
                setSelectionMode(false);
                setSelectedFiles(new Set());
            }}
            selectedDriveId={selectedDrive}
        >
            <div
                className="relative flex flex-col min-h-[calc(100vh-theme(spacing.16))]"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {isDragging && (
                    <div className="absolute inset-0 z-50 bg-brand-bg/80 backdrop-blur-sm border-2 border-dashed border-brand-primary/50 m-4 rounded-2xl flex flex-col items-center justify-center animate-in fade-in duration-200 pointer-events-none">
                        <div className="bg-brand-primary/10 p-6 rounded-full mb-4 animate-bounce">
                            <UploadCloud className="w-12 h-12 text-brand-primary" />
                        </div>
                        <h2 className="text-2xl font-bold text-brand-primary mb-2">Drop files to upload</h2>
                        <p className="text-brand-text/50">Files will be uploaded to {selectedDrive === 'me' ? 'Saved Messages' : 'Channel'}</p>
                    </div>
                )}
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />

                <DashboardModals
                    renamingFile={renamingFile}
                    setRenamingFile={setRenamingFile}
                    newName={newName}
                    setNewName={setNewName}
                    handleRenameSubmit={handleRenameSubmit}

                    newFolderModalOpen={newFolderModalOpen}
                    setNewFolderModalOpen={setNewFolderModalOpen}
                    newFolderName={newFolderName}
                    setNewFolderName={setNewFolderName}
                    handleCreateFolder={handleCreateFolder}
                    selectedFilesSize={selectedFiles.size}

                    folderAction={folderAction}
                    setFolderAction={setFolderAction}
                    handleRenameFolder={handleRenameFolder}
                    handleDeleteFolder={handleDeleteFolder}

                    moveTarget={moveTarget}
                    setMoveTarget={setMoveTarget}
                    folders={folders}
                    handleMoveFiles={handleMoveFiles}

                    previewFile={previewFile}
                    setPreviewFile={setPreviewFile}
                    selectedDrive={selectedDrive}

                    sharedFilesPending={sharedFilesPending}
                    setSharedFilesPending={setSharedFilesPending}
                    onConfirmSharedUpload={async () => {
                        const fakeEvent = {
                            target: { files: sharedFilesPending }
                        } as unknown as React.ChangeEvent<HTMLInputElement>;
                        setSelectedDrive('me');

                        // Wait for next tick so selectedDrive is updated in useFileActions
                        setTimeout(async () => {
                            await handleFileChange(fakeEvent);
                            setSharedFilesPending([]);
                        }, 0);
                    }}
                />

                <DashboardToolbar
                    selectedDrive={selectedDrive}
                    folderPath={folderPath}
                    onNavigate={handleNavigate}
                    selectionMode={selectionMode}
                    selectedFiles={selectedFiles}
                    files={files}
                    onSelectAll={selectAll}
                    onClearSelection={clearSelection}
                    onSetFolderAction={setFolderAction}
                    onSetMoveTarget={setMoveTarget}
                    onDeleteSelected={handleDeleteSelected}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    onNewFolderClick={() => { setNewFolderName(''); setNewFolderModalOpen(true); }}
                    onUploadClick={handleUploadClick}
                    uploading={uploading}
                />

                {uploading && (
                    <div className="fixed bottom-6 right-6 z-50 w-80 bg-brand-bg border border-brand-text/10 rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5">
                        <div className="p-4 flex items-center justify-between border-b border-brand-text/5 bg-black/20">
                            <div className="flex items-center space-x-3 overflow-hidden">
                                {uploadProgress === 100 ? (
                                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                                ) : (
                                    <Loader2 className="w-5 h-5 text-brand-primary shrink-0 animate-spin" />
                                )}
                                <div className="overflow-hidden">
                                    <h4 className="text-sm font-semibold text-brand-text truncate">{uploadFileName || 'Uploading file...'}</h4>
                                    <p className="text-xs text-brand-text/50">{uploadProgress === 100 ? 'Finalizing...' : `${uploadProgress}% uploaded`}</p>
                                </div>
                            </div>
                        </div>
                        <div className="h-1.5 w-full bg-black/40 relative overflow-hidden">
                            <div
                                className="absolute top-0 left-0 h-full bg-brand-primary transition-all duration-300 ease-out"
                                style={{ width: `${uploadProgress}%` }}
                            />
                        </div>
                    </div>
                )}

                {files.length === 0 && folders.length === 0 && !loading ? (
                    <div className="flex flex-col items-center justify-center h-64 text-brand-text/30">
                        <Database className="w-12 h-12 mb-4 opacity-50" />
                        <p>{searchQuery ? 'No results' : 'This folder is empty'}</p>
                    </div>
                ) : (
                    <div className="px-4 pb-8">
                        <FolderGrid
                            folders={folders}
                            onNavigate={handleNavigate}
                            onSetAction={setFolderAction}
                            onSetNewFolderName={setNewFolderName}
                        />

                        <FileGrid
                            files={files}
                            selectedFiles={selectedFiles}
                            selectedDrive={selectedDrive}
                            onToggleSelection={toggleSelectionMode}
                            onCardClick={handleCardClick}
                            onSetPreviewFile={setPreviewFile}
                            onSetFolderAction={setFolderAction}
                            onSetMoveTarget={setMoveTarget}
                            onRenameClick={(file) => {
                                const lastDot = file.fileName.lastIndexOf('.');
                                const baseName = lastDot > 0 ? file.fileName.slice(0, lastDot) : file.fileName;
                                setRenamingFile(file);
                                setNewName(baseName);
                            }}
                            onDelete={handleDelete}
                            lastElementRef={lastFileElementRef}
                        />

                        {loading && (
                            <div className="flex justify-center py-6">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Layout>
    );
};
