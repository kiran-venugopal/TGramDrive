import type { FolderItem } from '../../types';
import { FolderCard } from './FolderCard';
import type { FolderActionType } from '../../hooks/useFolderActions';

interface FolderGridProps {
    folders: FolderItem[];
    onNavigate: (folderId: string, folderName: string) => void;
    onSetAction: (action: FolderActionType) => void;
    onSetNewFolderName: (name: string) => void;
}

export const FolderGrid = ({ folders, onNavigate, onSetAction, onSetNewFolderName }: FolderGridProps) => {
    if (folders.length === 0) return null;

    return (
        <div className="mb-8">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-text/50 mb-3 ml-1">Folders</h2>
            <div className="grid grid-cols-2 p-2 py-0 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                {folders.map((folder) => (
                    <FolderCard
                        key={folder._id}
                        folder={folder}
                        onNavigate={onNavigate}
                        onSetAction={onSetAction}
                        onSetNewFolderName={onSetNewFolderName}
                    />
                ))}
            </div>
        </div>
    );
};
