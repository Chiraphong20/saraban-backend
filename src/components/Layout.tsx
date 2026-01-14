import React, { ReactNode } from 'react';
import { LayoutDashboard, FolderKanban, FileClock, Menu, X, Bell, LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

interface LayoutProps {
    children: ReactNode;
    currentPage: string;
    onNavigate: (page: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentPage, onNavigate }) => {
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
    const { user, logout } = useAuth();
    
    // ดึงจำนวนแจ้งเตือนที่ยังไม่ได้อ่าน
    const { unreadCount } = useNotifications();

    const menuItems = [
        { id: 'dashboard', label: 'ภาพรวมระบบ', icon: LayoutDashboard },
        { id: 'projects', label: 'จัดการโครงการ', icon: FolderKanban },
        { id: 'logs', label: 'ประวัติการใช้งาน', icon: FileClock },
    ];

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out
                lg:translate-x-0 lg:static lg:inset-0 shadow-xl flex flex-col
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                {/* Logo Section */}
                <div className="flex items-center justify-between h-16 px-6 bg-slate-800 flex-shrink-0">
                    <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                            <span className="font-bold text-lg">S</span>
                        </div>
                        <span className="text-xl font-semibold tracking-wide">SarabanTrack</span>
                    </div>
                    <button 
                        onClick={() => setIsSidebarOpen(false)}
                        className="lg:hidden text-gray-400 hover:text-white"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Menu Items */}
                <nav className="p-4 space-y-2 mt-4 flex-1 overflow-y-auto">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = currentPage === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => {
                                    onNavigate(item.id);
                                    setIsSidebarOpen(false);
                                }}
                                className={`flex items-center w-full px-4 py-3 text-sm font-medium transition-all rounded-xl ${
                                    isActive 
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' 
                                    : 'text-gray-400 hover:bg-slate-800 hover:text-white'
                                }`}
                            >
                                <Icon size={20} className="mr-3" />
                                {item.label}
                            </button>
                        );
                    })}
                </nav>

                {/* User Profile Section (Footer) */}
                <div className="p-4 bg-slate-900 border-t border-slate-800 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        {/* ✅ กดที่รูปหรือชื่อ เพื่อไปหน้า Profile */}
                        <div 
                            className="flex items-center min-w-0 cursor-pointer group"
                            onClick={() => {
                                onNavigate('profile');
                                setIsSidebarOpen(false);
                            }}
                        >
                            <div className="relative">
                                <img 
                                    src={`https://ui-avatars.com/api/?name=${user?.fullname}&background=random`} 
                                    alt="User" 
                                    className="w-10 h-10 rounded-full ring-2 ring-slate-700 group-hover:ring-blue-500 transition-all"
                                />
                                <div className="absolute -bottom-1 -right-1 bg-slate-900 rounded-full p-0.5">
                                    <div className="bg-green-500 w-2.5 h-2.5 rounded-full border-2 border-slate-900"></div>
                                </div>
                            </div>
                            
                            <div className="ml-3 truncate">
                                <p className="text-sm font-medium text-white truncate group-hover:text-blue-400 transition-colors">
                                    {user?.fullname || 'Guest'}
                                </p>
                                <p className="text-xs text-gray-400 capitalize">
                                    {user?.role || 'User'}
                                </p>
                            </div>
                        </div>
                        
                        <button 
                            onClick={logout}
                            className="p-2 text-gray-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors ml-1"
                            title="ออกจากระบบ"
                        >
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content Wrapper */}
            <div className="flex flex-col flex-1 w-0 overflow-hidden">
                {/* Header */}
                <header className="flex items-center justify-between h-16 px-6 bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
                    <button 
                        onClick={() => setIsSidebarOpen(true)}
                        className="text-gray-500 lg:hidden hover:text-gray-700"
                    >
                        <Menu size={24} />
                    </button>
                    
                    <div className="flex items-center ml-auto space-x-4">
                        {/* ✅ ปุ่มแจ้งเตือน: กดแล้วไปหน้า notifications */}
                        <button 
                            onClick={() => onNavigate('notifications')}
                            className={`relative p-2 transition-colors rounded-full hover:bg-gray-100 hover:text-gray-600 ${
                                currentPage === 'notifications' ? 'text-blue-600 bg-blue-50' : 'text-gray-400'
                            }`}
                            title="การแจ้งเตือน"
                        >
                            <Bell size={20} />
                            {/* แสดงจุดแดงเมื่อมี unreadCount > 0 และไม่ได้อยู่หน้า notifications */}
                            {unreadCount > 0 && currentPage !== 'notifications' && (
                                <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                                </span>
                            )}
                        </button>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-6 scroll-smooth">
                    <div className="max-w-7xl mx-auto min-h-full">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;