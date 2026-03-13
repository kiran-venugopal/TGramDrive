import type { FileItem } from '../../types';
import { FileCard } from './FileCard';
import type { FolderActionType } from '../../hooks/useFolderActions';

interface FileGridProps {
    files: FileItem[];
    selectedFiles: Set<string | number>;
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

export const FileGrid = ({
    files,
    selectedFiles,
    selectedDrive,
    onToggleSelection,
    onCardClick,
    onSetPreviewFile,
    onSetFolderAction,
    onSetMoveTarget,
    onRenameClick,
    onDelete,
    lastElementRef
}: FileGridProps) => {
    if (files.length === 0) return null;

    return (
        <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-text/50 mb-3 ml-1">Files</h2>
            <div className="grid grid-cols-2 p-1 py-0 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3 border border-transparent">
                {files.map((file, index) => {
                    const isLast = files.length === index + 1;
                    const isSelected = selectedFiles.has(file.id);

                    return (
                        <FileCard
                            key={`${file.id}-${index}`}
                            file={file}
                            isSelected={isSelected}
                            isLast={isLast}
                            selectedDrive={selectedDrive}
                            onToggleSelection={onToggleSelection}
                            onCardClick={onCardClick}
                            onSetPreviewFile={onSetPreviewFile}
                            onSetFolderAction={onSetFolderAction}
                            onSetMoveTarget={onSetMoveTarget}
                            onRenameClick={onRenameClick}
                            onDelete={onDelete}
                            lastElementRef={lastElementRef}
                        />
                    );
                })}
            </div>
        </div>
    );
};
