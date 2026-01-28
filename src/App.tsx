import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams, useNavigate } from 'react-router-dom';

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

// ✅ 1. เพิ่ม Wrapper Component เพื่อรับ ID จาก URL แล้วส่งต่อให้ ProjectTimelinePage
// (ต้องมีตัวนี้ เพราะ ProjectTimelinePage ของคุณรับค่าเป็น Props ไม่ใช่ URL Params โดยตรง)
const ProjectTimelineWrapper: React.FC = () => {
  const { id } = useParams<{ id: string }>(); // ดึง id จาก URL (เช่น /project/15/timeline)
  const navigate = useNavigate();

  // ถ้า URL ไม่มี ID หรือแปลงเป็นตัวเลขไม่ได้ ให้เด้งกลับหน้า Projects
  if (!id || isNaN(Number(id))) {
    return <Navigate to="/projects" replace />;
  }

  return (
    <ProjectTimelinePage 
      projectId={Number(id)} // แปลง string เป็น number
      onBack={() => navigate('/projects')} // ฟังก์ชันเมื่อกดปุ่ม Back ในหน้า Timeline
    />
  );
};

// Component สำหรับจัดการเนื้อหาข้างใน
const AppContent: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation(); 

  // ถ้ายังไม่ Login ให้แสดงหน้า Login
  if (!user) {
    return <Login />;
  }

  // ฟังก์ชันเช็คว่าตอนนี้อยู่หน้าไหน (ส่งให้ Layout เพื่อ Highlight เมนู)
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
            {/* 1. หน้า Dashboard */}
            <Route path="/" element={<Dashboard />} />
            
            {/* 2. หน้า Project List */}
            <Route path="/projects" element={<ProjectList />} />
            
            {/* 3. ✅ หน้า Timeline (ใช้ Wrapper แทน Page ตรงๆ) */}
            <Route path="/project/:id/timeline" element={<ProjectTimelineWrapper />} />
            
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
    // 🚨 หัวใจสำคัญ: ต้องมี BrowserRouter ครอบบนสุดเสมอ
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;