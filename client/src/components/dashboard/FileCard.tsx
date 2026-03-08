import type { FileItem } from '../../types';
import { MoreVertical, Eye, Download, ArrowRightLeft, Edit, Trash2, CheckSquare, Square, FileIcon, FileImage, FileVideo, FileAudio, FileText, FileArchive } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import type { FolderActionType } from '../../hooks/useFolderActions';

interface FileCardProps {
    file: FileItem;
    isSelected: boolean;
    isLast: boolean;
    selectedDrive: string;
    onToggleSelection: (file: FileItem) => void;
    onCardClick: (file: FileItem) => void;
    onSetPreviewFile: (file: FileItem) => void;
    onSetFolderAction: (action: FolderActionType) => void;
    onSetMoveTarget: (target: string | null) => void;
    onRenameClick: (file: FileItem) => void;
    onDelete: (file: FileItem) => void;
    lastElementRef: (node: HTMLDivElement | null) => void;
}

const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatExactDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
};

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

export const FileCard = ({
    file,
    isSelected,
    isLast,
    selectedDrive,
    onToggleSelection,
    onCardClick,
    onSetPreviewFile,
    onSetFolderAction,
    onSetMoveTarget,
    onRenameClick,
    onDelete,
    lastElementRef
}: FileCardProps) => {
    return (
        <div
            ref={isLast ? lastElementRef : null}
            onClick={() => onCardClick(file)}
            onContextMenu={(e) => { e.preventDefault(); onToggleSelection(file); }}
            className={`bg-black/20 backdrop-blur-sm transition-all group flex flex-col h-full cursor-pointer relative overflow-hidden rounded-md border ${isSelected ? 'border-brand-primary' : 'border-brand-text/5 hover:border-brand-primary/50'}`}
        >
            <div className={`absolute top-2 left-2 z-10 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-100 md:opacity-0 group-hover:opacity-100'}`} onClick={e => e.stopPropagation()}>
                <button onClick={(e) => { e.stopPropagation(); onToggleSelection(file); }} className={`p-1 rounded-sm backdrop-blur-sm transition-colors ${isSelected ? 'bg-brand-primary text-white' : 'bg-black/40 hover:bg-brand-primary text-white'}`}>
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
                            <DropdownMenu.Item onClick={() => onSetPreviewFile(file)} className="flex items-center px-2 py-2 text-sm hover:bg-brand-text/5 cursor-pointer outline-none"><Eye className="w-4 h-4 mr-2" /> View</DropdownMenu.Item>
                            <DropdownMenu.Item onClick={() => window.open(`/api/files/download/${file.id}?driveId=${selectedDrive}`, '_blank')} className="flex items-center px-2 py-2 text-sm hover:bg-brand-text/5 cursor-pointer outline-none"><Download className="w-4 h-4 mr-2" /> Download</DropdownMenu.Item>
                            <DropdownMenu.Item onClick={(e) => { e.stopPropagation(); onSetFolderAction({ type: 'move', targetFiles: [file] }); onSetMoveTarget(null); }} className="flex items-center px-2 py-2 text-sm hover:bg-brand-text/5 cursor-pointer outline-none"><ArrowRightLeft className="w-4 h-4 mr-2" /> Move To...</DropdownMenu.Item>
                            <DropdownMenu.Item onClick={(e) => { e.stopPropagation(); onRenameClick(file); }} className="flex items-center px-2 py-2 text-sm hover:bg-brand-text/5 cursor-pointer outline-none"><Edit className="w-4 h-4 mr-2" /> Rename</DropdownMenu.Item>
                            <DropdownMenu.Separator className="h-px bg-brand-text/10 my-1" />
                            <DropdownMenu.Item onClick={(e) => { e.stopPropagation(); onDelete(file); }} className="flex items-center px-2 py-2 text-sm text-brand-accent hover:bg-brand-accent/10 cursor-pointer outline-none"><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenu.Item>
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
                    <span className="truncate max-w-[50%] text-right" title={file.uploader || 'Unknown User'}>{file.uploader || 'Unknown User'}</span>
                </div>
                <div className="px-1 text-[10px] text-brand-text/30 mt-0.5">
                    {formatExactDate(file.date)}
                </div>
            </div>
        </div>
    );
};
