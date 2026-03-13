import { useState } from 'react';
import { HardDrive, Hash, Users, User, Bot } from 'lucide-react';
import api from '../api';
import type { Drive } from './Layout';

export const TYPE_LABEL: Record<Drive['type'], string> = {
    saved: 'Saved Messages',
    channel: 'Channel',
    group: 'Group',
    user: 'User',
    bot: 'Bot',
};

const DriveIcon = ({ type, className = 'w-4 h-4' }: { type: Drive['type']; className?: string }) => {
    switch (type) {
        case 'saved':   return <HardDrive className={className} />;
        case 'channel': return <Hash className={className} />;
        case 'group':   return <Users className={className} />;
        case 'user':    return <User className={className} />;
        case 'bot':     return <Bot className={className} />;
    }
};

// Shared across both DriveAvatar (list) and BreadcrumbAvatar so one failure covers both
const failedAvatars = new Set<string>();

/**
 * Small avatar used in the sidebar drive list (28×28, rounded-md w/ icon fallback)
 */
export const DriveAvatar = ({ drive, isSelected = false }: { drive: Drive; isSelected?: boolean }) => {
    const [failed, setFailed] = useState(() => failedAvatars.has(drive.id));

    if (drive.type === 'saved' || failed) {
        return (
            <div className={`flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center ${
                isSelected ? 'bg-brand-primary/10 text-brand-primary' : 'bg-brand-text/[0.08] text-brand-text/50'
            }`}>
                <DriveIcon type={drive.type} />
            </div>
        );
    }

    return (
        <div className="flex-shrink-0 w-7 h-7 rounded-full overflow-hidden bg-brand-text/10">
            <img
                src={`${api.defaults.baseURL}/files/avatar/${drive.id}`}
                alt=""
                className="w-full h-full object-cover"
                onError={() => { failedAvatars.add(drive.id); setFailed(true); }}
            />
        </div>
    );
};

/**
 * Larger avatar used inside the breadcrumb (36×36, rounded-full)
 */
export const BreadcrumbAvatar = ({ drive }: { drive: Drive }) => {
    const [failed, setFailed] = useState(() => failedAvatars.has(drive.id));

    if (drive.type === 'saved' || failed) {
        return (
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-primary/15 text-brand-primary flex items-center justify-center">
                <DriveIcon type={drive.type} className="w-4 h-4" />
            </div>
        );
    }

    return (
        <div className="flex-shrink-0 w-6 h-6 rounded-full overflow-hidden bg-brand-text/10">
            <img
                src={`${api.defaults.baseURL}/files/avatar/${drive.id}`}
                alt=""
                className="w-full h-full object-cover"
                onError={() => { failedAvatars.add(drive.id); setFailed(true); }}
            />
        </div>
    );
};

interface DriveBreadcrumbProps {
    drive: Drive | undefined;
}

export const DriveBreadcrumb = ({ drive }: DriveBreadcrumbProps) => {
    if (!drive) return null;

    return (
        <div className="px-3 py-2.5 flex-shrink-0 border-b border-brand-text/5 bg-brand-primary/[0.03]">
            <p className="text-[9px] font-bold uppercase tracking-widest text-brand-text/30 mb-1.5">
                Currently Viewing
            </p>
            <div className="flex items-center space-x-2.5">
                <BreadcrumbAvatar drive={drive} />
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-brand-text truncate leading-snug">
                        {drive.name}
                    </p>
                    <p className="text-[11px] text-brand-text/40 leading-tight">
                        {TYPE_LABEL[drive.type]}
                    </p>
                </div>
            </div>
        </div>
    );
};
