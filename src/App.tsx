import React, { useState } from 'react';
// Import Contexts
import { ProjectProvider } from './context/ProjectContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext'; // ✅ เพิ่ม NotificationProvider

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
    /* ✅ ลำดับการซ้อน Provider สำคัญมาก:
       1. AuthProvider (อยู่นอกสุดใน App) -> ให้ Token
       2. NotificationProvider -> ใช้ Token ดึงแจ้งเตือน
       3. ProjectProvider -> ใช้ Token ดึงโปรเจกต์
       4. Layout -> มีปุ่มกระดิ่งและเนื้อหา
    */
    <NotificationProvider>
      <ProjectProvider>
        <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
          {renderPage()}
        </Layout>
      </ProjectProvider>
    </NotificationProvider>
  );
};

// Component หลัก: ครอบทุกอย่างด้วย AuthProvider เป็นชั้นแรกสุด
const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;