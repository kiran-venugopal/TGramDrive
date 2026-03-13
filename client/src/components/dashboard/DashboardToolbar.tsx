import type { FolderPathItem, FileItem } from '../../types';
import { Home, ChevronRight, ArrowRightLeft, Trash2, X, Search, FolderPlus, Download } from 'lucide-react';
import type { FolderActionType } from '../../hooks/useFolderActions';
import { useCurrentDrive } from '../Layout';
import { BreadcrumbAvatar } from '../DriveBreadcrumb';

interface DashboardToolbarProps {
    selectedDrive: string;
    folderPath: FolderPathItem[];
    onNavigate: (folderId: string | null, folderName?: string) => void;
    selectionMode: boolean;
    selectedFiles: Set<string | number>;
    files: FileItem[];
    onSelectAll: () => void;
    onClearSelection: () => void;
    onSetFolderAction: (action: FolderActionType) => void;
    onSetMoveTarget: (target: string | null) => void;
    onDeleteSelected: () => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    onNewFolderClick: () => void;
    onUploadClick: () => void;
    uploading: boolean;
}

export const DashboardToolbar = ({
    folderPath,
    onNavigate,
    selectionMode,
    selectedFiles,
    files,
    onSelectAll,
    onClearSelection,
    onSetFolderAction,
    onSetMoveTarget,
    onDeleteSelected,
    searchQuery,
    onSearchChange,
    onNewFolderClick,
    onUploadClick,
    uploading
}: DashboardToolbarProps) => {
    const { currentDrive } = useCurrentDrive();

    return (
        <div className="sticky top-0 z-20 bg-brand-bg/95 backdrop-blur-md p-4 -mt-2 mb-6 flex flex-col gap-4 border-b border-brand-text/5">
            <div className="flex flex-col gap-3">
                <div>
                    <h1 className="text-base font-bold text-brand-text flex items-center gap-2 flex-wrap min-w-0">
                        <span
                            className="cursor-pointer hover:text-brand-primary transition-colors flex items-center"
                            onClick={() => onNavigate(null)}
                        >
                            <Home className="w-6 h-6 mr-2" />
                        </span>
                        {folderPath.map((path) => (
                            <span key={path.id} className="flex items-center text-brand-text">
                                <ChevronRight className="w-6 h-6 text-brand-text/30 mx-1" />
                                <span
                                    className="cursor-pointer hover:text-brand-primary transition-colors text-base font-medium"
                                    onClick={() => onNavigate(path.id, path.name)}
                                >
                                    {path.name}
                                </span>
                            </span>
                        ))}
                        {currentDrive && (
                            <span className="flex items-center text-brand-text ml-1 gap-2 text-lg">
                                <ChevronRight className="w-6 h-6 text-brand-text/30" />
                                <span className="flex items-center gap-2">
                                    <BreadcrumbAvatar drive={currentDrive} />
                                    <span className="font-medium truncate max-w-[180px] sm:max-w-xs text-base">
                                        {currentDrive.name}
                                    </span>
                                </span>
                            </span>
                        )}
                    </h1>
                </div>

                <div className="flex flex-wrap gap-3 mt-2">
                    {selectionMode ? (
                        <div className="flex items-center bg-brand-primary/10 border border-brand-primary/20 rounded-lg px-3 py-1.5 animate-in fade-in">
                            <span className="text-brand-primary font-medium mr-4 text-sm hidden sm:inline">{selectedFiles.size} selected</span>
                            <button
                                onClick={onSelectAll}
                                className="text-sm text-brand-primary hover:bg-brand-primary/20 rounded-md px-2 py-1 transition-colors font-medium mr-2"
                            >
                                {selectedFiles.size === files.length ? 'Deselect All' : 'Select All'}
                            </button>
                            <button
                                onClick={() => {
                                    onSetFolderAction({ type: 'move', targetFiles: files.filter(f => selectedFiles.has(f.id)) });
                                    onSetMoveTarget(null);
                                }}
                                className="p-1.5 text-brand-primary hover:bg-brand-primary/20 rounded-md mr-1 tooltip" title="Move Selected"
                            >
                                <ArrowRightLeft className="w-4 h-4" />
                            </button>
                            <button onClick={onDeleteSelected} className="p-1.5 text-brand-accent hover:bg-brand-accent/20 rounded-md mr-1"><Trash2 className="w-4 h-4" /></button>
                            <button onClick={onClearSelection} className="p-1.5 text-brand-text/50 hover:bg-black/20 rounded-md"><X className="w-4 h-4" /></button>
                        </div>
                    ) : (
                        <div className="relative w-full md:w-64">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="h-5 w-5 text-brand-text/50" /></div>
                            <input type="text" className="block w-full pl-10 pr-3 py-2 border border-brand-text/10 rounded-sm bg-black/20 text-brand-text placeholder-brand-text/50 focus:outline-none focus:ring-1 focus:ring-brand-primary sm:text-sm" placeholder="Search files..." value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} />
                        </div>
                    )}

                    <button onClick={onNewFolderClick} className="flex items-center space-x-2 px-3 py-2 bg-black/20 text-brand-text border border-brand-text/10 rounded-sm hover:bg-black/40 transition-colors">
                        <FolderPlus className="w-4 h-4" /> <span className="font-medium text-sm">New Folder</span>
                    </button>

                    <button onClick={onUploadClick} disabled={uploading} className="flex items-center space-x-2 px-4 py-2 bg-brand-primary text-white rounded-sm hover:bg-brand-primary/80 transition-colors shadow-lg shadow-brand-primary/20">
                        {uploading ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : <Download className="w-4 h-4 rotate-180" />}
                        <span className="font-medium text-sm">Upload</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
