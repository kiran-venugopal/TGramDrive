export interface FileItem {
    id: string | number;
    fileName: string;
    size: number;
    mimeType: string;
    date: number;
    driveId: string;
    hasThumbnail?: boolean;
    uploader?: string;
}

export interface FolderItem {
    _id: string;
    name: string;
    parentId: string | null;
    createdAt: string;
    driveId: string;
}

export interface FolderPathItem {
    id: string;
    name: string;
}
