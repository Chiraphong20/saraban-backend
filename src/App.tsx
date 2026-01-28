import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
import ProjectTimelinePage from './components/ProjectTimelinePage';
import Login from './components/Login';

// Component สำหรับจัดการเนื้อหาข้างใน
const AppContent: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation(); // ✅ ใช้ Hook นี้ได้แล้วเพราะถูกครอบด้วย BrowserRouter แล้ว

  // ถ้ายังไม่ Login ให้แสดงหน้า Login
  if (!user) {
    return <Login />;
  }

  // ฟังก์ชันเช็คว่าตอนนี้อยู่หน้าไหน (ส่งให้ Layout เพื่อ Highligh เมนู)
  const getCurrentPageName = () => {
    const path = location.pathname;
    if (path === '/') return 'dashboard';
    if (path.startsWith('/projects')) return 'projects';
    if (path.startsWith('/logs')) return 'logs';
    if (path.startsWith('/notifications')) return 'notifications';
    if (path.startsWith('/profile')) return 'profile';
    if (path.startsWith('/project/')) return 'projects'; // หน้า Timeline ให้ Highlight เมนู Projects
    return 'dashboard';
  };

  return (
    <ProjectProvider>
      <NotificationProvider>
        {/* ส่ง currentPage ตาม URL ปัจจุบันไปให้ Layout */}
        <Layout currentPage={getCurrentPageName()}>
          <Routes>
            {/* ✅ กำหนดเส้นทาง (Routes) ที่นี่ - แก้ Error ได้ 100% */}
            
            {/* 1. หน้า Dashboard */}
            <Route path="/" element={<Dashboard />} />
            
            {/* 2. หน้า Project List */}
            <Route path="/projects" element={<ProjectList />} />
            
            {/* 3. หน้า Timeline (รับ ID จาก URL) */}
            <Route path="/project/:id/timeline" element={<ProjectTimelinePage />} />
            
            {/* 4. หน้า Logs */}
            <Route path="/logs" element={<AuditLogViewer />} />
            
            {/* 5. หน้า Notifications */}
            <Route path="/notifications" element={<NotificationsPage />} />
            
            {/* 6. หน้า Profile */}
            <Route path="/profile" element={<ProfilePage />} />

            {/* ถ้าพิมพ์ URL มั่ว ให้กลับไปหน้าแรก */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </NotificationProvider>
    </ProjectProvider>
  );
};

// Component หลัก
const App: React.FC = () => {
  return (
    // 🚨 หัวใจสำคัญ: ต้องมี BrowserRouter ครอบบนสุดเสมอ ไม่งั้น Error useNavigate จะมาอีก
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;