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
import NotificationsPage from './components/NotificationsPage';
import ProfilePage from './components/ProfilePage';
import ProjectTimelinePage from './components/ProjectTimelinePage'; // ✅ เพิ่ม Import
import Login from './components/Login';

const AppContent: React.FC = () => {
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  
  // ✅ เพิ่ม state เก็บ ID ของโปรเจกต์ที่จะดู Timeline
  const [viewingProjectId, setViewingProjectId] = useState<number | null>(null);

  if (!user) {
    return <Login />;
  }

  // ✅ ฟังก์ชันช่วยเปลี่ยนหน้าพร้อมส่ง ID
  const navigateToProjectTimeline = (id: number) => {
    setViewingProjectId(id);
    setCurrentPage('project_timeline');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard onNavigate={setCurrentPage} />;
      
      // ✅ ส่ง prop onNavigateToTimeline ไปให้ ProjectList ใช้
      case 'projects': return <ProjectList onNavigateToTimeline={navigateToProjectTimeline} />;
      
      case 'logs': return <AuditLogViewer />;
      case 'notifications': return <NotificationsPage />;
      case 'profile': return <ProfilePage />;
      
      // ✅ เพิ่มหน้า Timeline
      case 'project_timeline': 
        return viewingProjectId ? (
            <ProjectTimelinePage 
                projectId={viewingProjectId} 
                onBack={() => setCurrentPage('projects')} 
            />
        ) : <ProjectList onNavigateToTimeline={navigateToProjectTimeline} />;

      default: return <Dashboard onNavigate={setCurrentPage} />;
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