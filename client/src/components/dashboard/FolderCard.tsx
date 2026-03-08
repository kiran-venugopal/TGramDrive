import type { FolderItem } from '../../types';
import { MoreVertical, Eye, Edit, Trash2, Folder as FolderIcon } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import type { FolderActionType } from '../../hooks/useFolderActions';

interface FolderCardProps {
    folder: FolderItem;
    onNavigate: (folderId: string, folderName: string) => void;
    onSetAction: (action: FolderActionType) => void;
    onSetNewFolderName: (name: string) => void;
}

export const FolderCard = ({ folder, onNavigate, onSetAction, onSetNewFolderName }: FolderCardProps) => {
    return (
        <div
            onClick={() => onNavigate(folder._id, folder.name)}
            className="bg-black/20 backdrop-blur-sm hover:bg-black/40 border border-brand-text/5 hover:border-brand-primary/30 transition-all rounded-xl p-3 flex items-center cursor-pointer group relative shadow-sm"
        >
            <div className="absolute top-2 right-2 opacity-100 md:opacity-0 group-hover:opacity-100 z-10 transition-opacity">
                <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                        <button className="p-1 bg-brand-bg/90 hover:bg-brand-text/10 rounded-md" onClick={(e) => e.stopPropagation()}>
                            <MoreVertical className="w-4 h-4 text-brand-text" />
                        </button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Portal>
                        <DropdownMenu.Content className="min-w-[140px] bg-brand-bg rounded-lg shadow-xl border border-brand-text/10 p-1 z-50">
                            <DropdownMenu.Item onClick={() => onNavigate(folder._id, folder.name)} className="flex items-center px-2 py-2 text-sm text-brand-text/90 hover:bg-brand-text/5 outline-none rounded-md cursor-pointer">
                                <Eye className="w-4 h-4 mr-2" /> Open
                            </DropdownMenu.Item>
                            <DropdownMenu.Item onClick={(e) => { e.stopPropagation(); onSetNewFolderName(folder.name); onSetAction({ type: 'rename', folder }); }} className="flex items-center px-2 py-2 text-sm text-brand-text/90 hover:bg-brand-text/5 outline-none rounded-md cursor-pointer">
                                <Edit className="w-4 h-4 mr-2" /> Rename
                            </DropdownMenu.Item>
                            <DropdownMenu.Separator className="h-px bg-brand-text/10 my-1" />
                            <DropdownMenu.Item onClick={(e) => { e.stopPropagation(); onSetAction({ type: 'delete', folder }); }} className="flex items-center px-2 py-2 text-sm text-brand-accent hover:bg-brand-accent/10 outline-none rounded-md cursor-pointer">
                                <Trash2 className="w-4 h-4 mr-2" /> Delete
                            </DropdownMenu.Item>
                        </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                </DropdownMenu.Root>
            </div>
            <FolderIcon className="w-8 h-8 text-brand-primary opacity-80 mr-3 flex-shrink-0" />
            <span className="font-medium text-brand-text truncate text-sm flex-1 select-none pointer-events-none" title={folder.name}>{folder.name}</span>
        </div>
    );
};
