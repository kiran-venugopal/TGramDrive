import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, HardDrive, MessageSquare, Menu, Search, Loader2 } from 'lucide-react';
import api from '../api';

interface Drive {
    id: string;
    name: string;
    type: 'saved' | 'channel' | 'group';
}

interface LayoutProps {
    children: React.ReactNode;
    onDriveSelect: (driveId: string) => void;
    selectedDriveId: string;
}

export const Layout = ({ children, onDriveSelect, selectedDriveId }: LayoutProps) => {
    const { logout, user } = useAuth();
    const [drives, setDrives] = useState<Drive[]>([]);
    const [loading, setLoading] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Search and Pagination State
    const [searchQuery, setSearchQuery] = useState('');
    const [offsetDate, setOffsetDate] = useState<number | null>(null);
    const [offsetId, setOffsetId] = useState<number | null>(null);
    const [hasMore, setHasMore] = useState(true);

    const observer = useRef<IntersectionObserver | null>(null);

    // Loading Ref to access current loading state inside observer without recreating it
    const loadingRef = useRef(loading);
    useEffect(() => {
        loadingRef.current = loading;
    }, [loading]);

    // Consolidated fetch function
    const fetchDrives = useCallback(async (isInitial = false, overrideSearch?: string) => {
        if (loadingRef.current && !isInitial) return; // Prevent duplicate fetch

        const currentSearch = overrideSearch !== undefined ? overrideSearch : searchQuery;

        setLoading(true);
        try {
            const params: any = { limit: 20 };
            if (!isInitial) {
                if (offsetDate) params.offsetDate = offsetDate;
                if (offsetId) params.offsetId = offsetId;
            }
            if (currentSearch) params.search = currentSearch;

            const res = await api.get('/files/drives', { params });
            const newDrives = res.data.drives;
            const nextOffset = res.data.nextOffset;

            setDrives(prev => {
                if (isInitial) return newDrives;

                const existingIds = new Set(prev.map(d => d.id));
                const uniqueNew = newDrives.filter((d: Drive) => !existingIds.has(d.id));
                return [...prev, ...uniqueNew];
            });

            if (nextOffset) {
                setOffsetDate(nextOffset.offsetDate);
                setOffsetId(nextOffset.offsetId);
                setHasMore(true);
            } else {
                setHasMore(false);
            }

        } catch (error) {
            console.error('Failed to fetch drives', error);
        } finally {
            setLoading(false);
        }
    }, [searchQuery, offsetDate, offsetId]);

    // Sentinel Ref for Infinite Scroll
    const sentinelRef = useCallback((node: HTMLDivElement | null) => {
        if (observer.current) observer.current.disconnect();

        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore && !loadingRef.current) {
                fetchDrives(false);
            }
        });

        if (node) observer.current.observe(node);
    }, [hasMore, fetchDrives]);

    // Initial Load & Search Debounce
    useEffect(() => {
        const timeout = setTimeout(() => {
            // Reset and fetch
            setOffsetDate(null);
            setOffsetId(null);
            setHasMore(true);
            setDrives([]); // Clear immediately for search feedback

            fetchDrives(true, searchQuery);
        }, 500);

        return () => clearTimeout(timeout);
    }, [searchQuery]); // fetchDrives excluded to avoid loop

    return (
        <div className="flex h-screen bg-brand-bg overflow-hidden text-brand-text">
            {/* Sidebar */}
            <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-brand-bg border-r border-brand-text/10 transform transition-transform duration-200 ease-in-out ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 flex flex-col`}>
                <div className="flex items-center justify-between p-4 border-b border-brand-text/10 flex-shrink-0">
                    <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center text-white font-bold">
                            TG
                        </div>
                        <span className="text-xl font-bold text-brand-text">TGramDrive</span>
                    </div>
                    <button onClick={() => setMobileMenuOpen(false)} className="md:hidden">
                        <Menu className="w-6 h-6 text-brand-text/70" />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="p-3 border-b border-brand-text/5 flex-shrink-0">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-brand-text/50" />
                        </div>
                        <input
                            type="text"
                            className="block w-full pl-9 pr-3 py-1.5 border border-brand-text/10 rounded-md leading-5 bg-black/20 text-brand-text placeholder-brand-text/30 focus:outline-none focus:bg-black/30 focus:ring-1 focus:ring-brand-primary focus:border-brand-primary sm:text-xs"
                            placeholder="Search channels..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="p-2 space-y-1 overflow-y-auto flex-1 custom-scrollbar">
                    <h3 className="text-xs font-semibold text-brand-text/50 uppercase tracking-wider mb-2 px-2 mt-2">Drives</h3>

                    {drives.map((drive) => (
                        <button
                            key={drive.id}
                            onClick={() => {
                                onDriveSelect(drive.id);
                                setMobileMenuOpen(false);
                            }}
                            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${selectedDriveId === drive.id ? 'bg-brand-primary/10 text-brand-primary font-medium' : 'text-brand-text/70 hover:bg-brand-text/5'}`}
                        >
                            <div className="flex-shrink-0">
                                {drive.type === 'saved' ? <HardDrive className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
                            </div>
                            <span className="truncate text-sm text-left">{drive.name}</span>
                        </button>
                    ))}

                    {/* Sentinel Element */}
                    <div ref={sentinelRef} className="h-4 w-full flex items-center justify-center">
                        {loading && hasMore && <Loader2 className="w-4 h-4 text-brand-primary animate-spin" />}
                    </div>

                    {!loading && drives.length === 0 && (
                        <div className="text-center py-4 text-brand-text/30 text-xs">
                            No channels found
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-brand-text/10 bg-brand-bg flex-shrink-0">
                    <div className="flex items-center space-x-3 mb-3 px-2">
                        <div className="w-8 h-8 rounded-full bg-brand-primary/20 flex items-center justify-center text-brand-primary font-bold text-sm">
                            {user?.firstName?.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-brand-text truncate">{user?.firstName}</p>
                            <p className="text-xs text-brand-text/50 truncate">{user?.phone}</p>
                        </div>
                    </div>
                    <button onClick={logout} className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm text-brand-accent hover:bg-brand-accent/10 rounded-lg transition-colors">
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-brand-bg">
                {/* Mobile Header */}
                <div className="md:hidden flex items-center justify-between p-4 bg-brand-bg border-b border-brand-text/10">
                    <span className="font-bold text-brand-text">TGramDrive</span>
                    <button onClick={() => setMobileMenuOpen(true)}>
                        <Menu className="w-6 h-6 text-brand-text" />
                    </button>
                </div>

                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-brand-bg p-4 md:p-6 custom-scrollbar">
                    {children}
                </main>
            </div>
        </div>
    );
};
