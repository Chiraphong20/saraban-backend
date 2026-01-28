import React, { useState } from 'react';
import { 
    LayoutDashboard, 
    FolderKanban, 
    FileClock, 
    Bell, 
    User, 
    LogOut, 
    Menu, 
    X, 
    ChevronRight 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
// 1. ✅ Import useNavigate
import { useNavigate } from 'react-router-dom';

interface LayoutProps {
    children: React.ReactNode;
    currentPage: string;
    // ❌ ลบ onNavigate ออก ไม่ต้องใช้แล้ว
}

const Layout: React.FC<LayoutProps> = ({ children, currentPage }) => {
    const { logout, user } = useAuth();
    const { unreadCount } = useNotifications();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    
    // 2. ✅ เรียกใช้ Hook
    const navigate = useNavigate();

    const menuItems = [
        { id: 'dashboard', label: 'ภาพรวม (Dashboard)', icon: <LayoutDashboard size={20} />, path: '/' },
        { id: 'projects', label: 'โครงการ (Projects)', icon: <FolderKanban size={20} />, path: '/projects' },
        { id: 'notifications', label: 'การแจ้งเตือน', icon: <Bell size={20} />, path: '/notifications', badge: unreadCount },
        { id: 'profile', label: 'ข้อมูลส่วนตัว', icon: <User size={20} />, path: '/profile' },
        { id: 'logs', label: 'ประวัติ (Audit Logs)', icon: <FileClock size={20} />, path: '/logs' },

    ];

    // 3. ✅ ฟังก์ชันเปลี่ยนหน้าใหม่ (ใช้ navigate แทน onNavigate)
    const handleNavigation = (path: string) => {
        navigate(path);
        setIsSidebarOpen(false); // ปิดเมนูเมื่อกด (บนมือถือ)
    };

    const handleLogout = () => {
        if (window.confirm('ต้องการออกจากระบบ?')) {
            logout();
            navigate('/'); // Logout แล้วกลับไปหน้าแรก (ซึ่งจะเด้งไป Login)
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex font-sarabun">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed lg:sticky top-0 left-0 z-50 h-screen w-72 bg-white border-r border-gray-200 
                transform transition-transform duration-300 ease-in-out shadow-xl lg:shadow-none
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                <div className="h-full flex flex-col">
                    {/* Logo Area */}
                    <div className="h-16 flex items-center px-6 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-blue-700">
                        <div className="flex items-center gap-3 text-white">
                            <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
<img 
                    src="/logo.jpg"  // ใส่ Path รูปของคุณตรงนี้
                    alt="Logo" 
                    className="w-10 h-10 object-contain" 
                />                            </div>
                            <div>
                                <h1 className="font-bold text-lg tracking-wide">Smartjigsaw Project</h1>
                            </div>
                        </div>
                        <button 
                            onClick={() => setIsSidebarOpen(false)} 
                            className="ml-auto lg:hidden text-white/80 hover:text-white"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* User Profile Summary */}
                    <div className="p-6 border-b border-gray-50 bg-gray-50/50">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold border-2 border-white shadow-sm">
                                {user?.username?.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-gray-900 truncate">{user?.fullname || user?.username}</p>
                                <p className="text-xs text-gray-500 capitalize truncate">{user?.role || 'User'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Navigation Menu */}
                    <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
                        <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">เมนูหลัก</p>
                        {menuItems.map((item) => {
                            // เช็คว่าเมนูนี้กำลัง Active อยู่หรือไม่
                            const isActive = currentPage === item.id;
                            
                            return (
                                <button
                                    key={item.id}
                                    // 4. ✅ ใช้ handleNavigation แทน
                                    onClick={() => handleNavigation(item.path)}
                                    className={`
                                        w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group
                                        ${isActive 
                                            ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100' 
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:translate-x-1'
                                        }
                                    `}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className={`transition-colors ${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`}>
                                            {item.icon}
                                        </span>
                                        {item.label}
                                    </div>
                                    
                                    {/* Badge Notification */}
                                    {item.badge ? (
                                        <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm animate-pulse">
                                            {item.badge}
                                        </span>
                                    ) : isActive && (
                                        <ChevronRight size={16} className="text-blue-400" />
                                    )}
                                </button>
                            );
                        })}
                    </nav>

                    {/* Logout Button */}
                    <div className="p-4 border-t border-gray-100">
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 rounded-xl hover:bg-red-50 transition-colors duration-200"
                        >
                            <LogOut size={20} />
                            ออกจากระบบ
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-gray-50">
                {/* Mobile Header */}
                <header className="lg:hidden h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sticky top-0 z-30 shadow-sm">
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setIsSidebarOpen(true)}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                        >
                            <Menu size={24} />
                        </button>
                        <span className="font-bold text-gray-800 truncate">
                            {menuItems.find(m => m.id === currentPage)?.label || 'Saraban Project'}
                        </span>
                    </div>
                    {unreadCount > 0 && (
                        <button onClick={() => handleNavigation('/notifications')} className="relative p-2 text-gray-600">
                            <Bell size={24} />
                            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                        </button>
                    )}
                </header>

                {/* Page Content */}
                <div className="flex-1 overflow-auto p-4 md:p-8 animate-fade-in">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Layout;