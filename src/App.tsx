import React, { useState } from 'react';
// Import Contexts
import { ProjectProvider } from './context/ProjectContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';

// Import Components
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ProjectList from './components/ProjectList';
import AuditLogViewer from './components/AuditLogViewer';
import NotificationsPage from './components/NotificationsPage'; // ✅ เพิ่ม Import
import Login from './components/Login';

const AppContent: React.FC = () => {
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');

  if (!user) {
    return <Login />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'projects': return <ProjectList />;
      case 'logs': return <AuditLogViewer />;
      case 'notifications': return <NotificationsPage />; // ✅ เพิ่ม Case นี้
      default: return <Dashboard />;
    }
  };

  return (
    <NotificationProvider>
      <ProjectProvider>
        <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
          {renderPage()}
        </Layout>
      </ProjectProvider>
    </NotificationProvider>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;