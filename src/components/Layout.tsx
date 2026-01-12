import React, { ReactNode } from 'react';
import { LayoutDashboard, FolderKanban, FileClock, Menu, X, Bell } from 'lucide-react';

interface LayoutProps {
    children: ReactNode;
    currentPage: string;
    onNavigate: (page: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentPage, onNavigate }) => {
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

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
                lg:translate-x-0 lg:static lg:inset-0 shadow-xl
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="flex items-center justify-between h-16 px-6 bg-slate-800">
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

                <nav className="p-4 space-y-2 mt-4">
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

                <div className="absolute bottom-0 w-full p-6 bg-slate-900 border-t border-slate-800">
                    <div className="flex items-center">
                        <img 
                            src="https://picsum.photos/40/40" 
                            alt="User" 
                            className="w-10 h-10 rounded-full ring-2 ring-blue-500"
                        />
                        <div className="ml-3">
                            <p className="text-sm font-medium text-white">Admin User</p>
                            <p className="text-xs text-gray-400">Head of Department</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex flex-col flex-1 w-0 overflow-hidden">
                {/* Header */}
                <header className="flex items-center justify-between h-16 px-6 bg-white border-b border-gray-200 shadow-sm">
                    <button 
                        onClick={() => setIsSidebarOpen(true)}
                        className="text-gray-500 lg:hidden hover:text-gray-700"
                    >
                        <Menu size={24} />
                    </button>
                    
                    <div className="flex items-center ml-auto space-x-4">
                        <button className="relative p-2 text-gray-400 transition-colors rounded-full hover:bg-gray-100 hover:text-gray-600">
                            <Bell size={20} />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
                        </button>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;
