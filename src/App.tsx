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
import ProjectTimelinePage from './components/ProjectTimelinePage'; // ✅ Import หน้า Timeline ใหม่
import Login from './components/Login';

const AppContent: React.FC = () => {
  const { user } = useAuth();
  
  // State สำหรับจัดการหน้าปัจจุบัน
  const [currentPage, setCurrentPage] = useState('dashboard');
  
  // ✅ State เก็บ ID ของโปรเจกต์ที่จะดู Timeline
  const [viewingProjectId, setViewingProjectId] = useState<number | null>(null);

  // ถ้ายังไม่ Login ให้แสดงหน้า Login
  if (!user) {
    return <Login />;
  }

  // ✅ ฟังก์ชันช่วยเปลี่ยนหน้าไป Timeline พร้อมส่ง ID
  const navigateToProjectTimeline = (id: number) => {
    setViewingProjectId(id);
    setCurrentPage('project_timeline');
  };

  // Logic การเลือกหน้าที่จะแสดง
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': 
        return <Dashboard onNavigate={setCurrentPage} />;
      
      case 'projects': 
        // ✅ ส่ง prop onNavigateToTimeline ไปให้ ProjectList
        return <ProjectList onNavigateToTimeline={navigateToProjectTimeline} />;
      
      case 'logs': 
        return <AuditLogViewer />;
      
      case 'notifications': 
        return <NotificationsPage />;
      
      case 'profile': 
        return <ProfilePage />;
      
      // ✅ Case ใหม่: หน้า Timeline เต็มจอ
      case 'project_timeline': 
        return viewingProjectId ? (
            <ProjectTimelinePage 
                projectId={viewingProjectId} 
                onBack={() => setCurrentPage('projects')} // กด Back ให้กลับไปหน้า Project List
            />
        ) : (
            // กันพลาด: ถ้าไม่มี ID ให้กลับไปหน้า List
            <ProjectList onNavigateToTimeline={navigateToProjectTimeline} />
        );

      default: 
        return <Dashboard onNavigate={setCurrentPage} />;
    }
  };

  return (
    // เรียงลำดับ Provider: Auth -> Notification -> Project -> Layout
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