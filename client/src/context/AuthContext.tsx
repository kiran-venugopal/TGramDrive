import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import api from '../api';

interface User {
  id: string;
  firstName: string;
  username?: string;
  phone: string;
  starredDrives?: string[];
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  sendCode: (phone: string) => Promise<Record<string, unknown>>;
  signIn: (
    phone: string,
    code: string,
    password?: string,
    phoneCodeHash?: string
  ) => Promise<Record<string, unknown>>;
  logout: () => void;
  toggleStarDrive: (driveId: string) => Promise<void>;
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
    } catch {
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

  const signIn = async (
    phone: string,
    code: string,
    password?: string,
    phoneCodeHash?: string
  ) => {
    try {
      const res = await api.post('/auth/sign-in', {
        phone,
        code,
        password,
        phoneCodeHash,
      });
      console.log('SignIn Response:', res.data);
      if (res.data.user) {
        console.log('Setting user');
        setUser(res.data.user);
      } else {
        console.warn('SignIn response missing user', res.data);
      }
      return res.data;
    } catch (error) {
      console.error('SignIn error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    }
    localStorage.removeItem('auth_token');
    setUser(null);
  };

  const toggleStarDrive = async (driveId: string) => {
    if (!user) return;
    try {
      const res = await api.post('/auth/star-drive', { driveId });
      setUser((prev) =>
        prev ? { ...prev, starredDrives: res.data.starredDrives } : null
      );
    } catch (error) {
      console.error('Toggle star drive error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        sendCode,
        signIn,
        logout,
        toggleStarDrive,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
