import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../api';

interface User {
    id: string;
    firstName: string;
    username?: string;
    phone: string;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    loading: boolean;
    sendCode: (phone: string) => Promise<any>;
    signIn: (phone: string, code: string, password?: string, phoneCodeHash?: string) => Promise<any>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        // Check if user is already logged in (check session/cookie or local storage)
        // For now, we'll assume not logged in or rely on server to return user
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const res = await api.get('/auth/me'); // Endpoint to check session
            if (res.data.user) {
                setUser(res.data.user);
            }
        } catch (error) {
            // Not logged in
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const sendCode = async (phone: string) => {
        const res = await api.post('/auth/send-code', { phone });
        return res.data;
    };

    const signIn = async (phone: string, code: string, password?: string, phoneCodeHash?: string) => {
        const res = await api.post('/auth/sign-in', { phone, code, password, phoneCodeHash });
        if (res.data.user && res.data.session) {
            localStorage.setItem('telegram_session', res.data.session);
            setUser(res.data.user);
        }
        return res.data;
    };

    const logout = async () => {
        // Call server logout if needed
        localStorage.removeItem('telegram_session');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, loading, sendCode, signIn, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
