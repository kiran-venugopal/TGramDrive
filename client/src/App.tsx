import { useAuth } from './context/AuthContext';
import { Auth } from './components/Auth';
import { Dashboard } from './pages/Dashboard';
import { Loader2 } from 'lucide-react';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { OfflineScreen } from './components/OfflineScreen';

function App() {
  const { isAuthenticated, loading } = useAuth();
  const isOnline = useOnlineStatus();

  if (!isOnline) {
    return <OfflineScreen />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <>
      {isAuthenticated ? <Dashboard /> : <Auth />}
    </>
  );
}

export default App
