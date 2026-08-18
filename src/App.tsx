import { AuthProvider, useAuth } from '@/lib/auth';
import { useRoute } from '@/lib/router';
import Login from '@/pages/Login';
import Shell from '@/components/Shell';
import Dashboard from '@/pages/Dashboard';
import ClientsList from '@/pages/ClientsList';
import AddClient from '@/pages/AddClient';
import ClientProfile from '@/pages/ClientProfile';
import { LoadingScreen } from '@/components/ui';

function AppContent() {
  const { session, loading } = useAuth();
  const [route] = useRoute();

  if (loading) return <LoadingScreen />;
  if (!session) return <Login />;

  let page;
  if (route.name === 'dashboard') page = <Dashboard />;
  else if (route.name === 'clients') page = <ClientsList />;
  else if (route.name === 'add-client') page = <AddClient />;
  else if (route.name === 'client') page = <ClientProfile id={route.id} />;

  return <Shell>{page}</Shell>;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
