import React, { useState } from 'react';
// Import Contexts
import { ProjectProvider } from './context/ProjectContext';
import { AuthProvider, useAuth } from './context/AuthContext'; // ⚠️ ต้องสร้างไฟล์นี้ก่อน (ตามขั้นตอนที่แล้ว)

// Import Components
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ProjectList from './components/ProjectList';
import AuditLogViewer from './components/AuditLogViewer';
import Login from './components/Login';
// Component ย่อย: สำหรับเช็คสถานะ Login และเลือกหน้าที่จะแสดง
const AppContent: React.FC = () => {
  const { user } = useAuth(); // ดึงข้อมูล User จาก AuthContext
  const [currentPage, setCurrentPage] = useState('dashboard');

  // 🔒 Logic: ถ้ายังไม่ Login ให้บังคับไปหน้า Login
  if (!user) {
    return <Login />;
  }

  // ถ้า Login แล้ว ให้แสดงเนื้อหาตามปกติ
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'projects': return <ProjectList />;
      case 'logs': return <AuditLogViewer />;
      default: return <Dashboard />;
    }
  };

  return (
    <ProjectProvider>
      <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
        {renderPage()}
      </Layout>
    </ProjectProvider>
  );
};

// Component หลัก: ครอบทุกอย่างด้วย AuthProvider
const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;