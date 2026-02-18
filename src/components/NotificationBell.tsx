import React, { useState, useRef, useEffect } from 'react';
import { Bell, Clock, Info, CheckCircle, AlertTriangle, XCircle, User as UserIcon } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
// ✅ Import Auth เพื่อเอา User ID
import { useAuth } from '../context/AuthContext'; 

const NotificationBell: React.FC = () => {
    const { notifications, unreadCount, markAsRead } = useNotifications();
    const { user } = useAuth(); // ✅ ดึง user ปัจจุบันมาเช็ค
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // เปิด/ปิด Dropdown
    const toggleDropdown = () => {
        const nextState = !isOpen;
        setIsOpen(nextState);

        // ✅ Logic ใหม่: ถ้าเปิด และมี unread > 0 ให้สั่ง Mark Read
        // (ซึ่งใน Context ต้องยิง API ไปบันทึกลง table notification_reads ของ user.id นี้)
        if (nextState && unreadCount > 0) {
            markAsRead(); 
        }
    };

    // ปิด Dropdown เมื่อคลิกข้างนอก
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // ไอคอนตามประเภท Action
    const getIcon = (action: string) => {
        switch (action) {
            case 'CREATE': return <CheckCircle size={16} className="text-green-500" />;
            case 'UPDATE': return <Info size={16} className="text-blue-500" />;
            case 'DELETE': return <XCircle size={16} className="text-red-500" />;
            default: return <AlertTriangle size={16} className="text-yellow-500" />;
        }
    };

    // สีพื้นหลังตามประเภท Action
    const getBgColor = (action: string) => {
        // ✅ เพิ่ม Logic: ถ้าอ่านแล้วให้สีจางลง หรือเป็นสีขาวไปเลย
        // แต่ถ้าต้องการแยกประเภทสี ก็ใช้แบบเดิมได้
        switch (action) {
            case 'CREATE': return 'bg-green-50';
            case 'UPDATE': return 'bg-blue-50';
            case 'DELETE': return 'bg-red-50';
            default: return 'bg-gray-50';
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* ปุ่มกระดิ่ง */}
            <button 
                onClick={toggleDropdown}
                className="relative p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-600"
            >
                <Bell size={24} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown List */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-fade-in origin-top-right">
                    <div className="px-4 py-3 border-b bg-gray-50 flex justify-between items-center">
                        <h3 className="text-sm font-bold text-gray-700">การแจ้งเตือนล่าสุด</h3>
                        <div className="text-xs text-gray-500 flex gap-2">
                            <span>ของ: {user?.username}</span> 
                            <span>• {notifications.length} รายการ</span>
                        </div>
                    </div>

                    <div className="max-h-[400px] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-6 text-center text-gray-400 text-sm">
                                ไม่มีรายการแจ้งเตือน
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {notifications.map((log) => (
                                    <div key={log.id} className={`p-4 hover:bg-gray-100 transition-colors flex gap-3 ${getBgColor(log.action)}`}>
                                        <div className="mt-1 flex-shrink-0">
                                            {getIcon(log.action)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-800 break-words">
                                                {log.details}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs text-gray-500 bg-white px-1.5 py-0.5 rounded border border-gray-200">
                                                    {log.project_code || 'System'}
                                                </span>
                                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                                    <UserIcon size={10} /> {log.actor}
                                                </span>
                                                <span className="text-xs text-gray-400 flex items-center gap-1 ml-auto">
                                                    <Clock size={10} /> 
                                                    {new Date(log.timestamp).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})}
                                                </span>
                                            </div>
                                        </div>
                                        {/* ✅ (Optional) จุดสีฟ้าแสดงว่ายังไม่อ่าน (ถ้า API ส่ง is_read มา) */}
                                        {/* {!log.is_read && <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>} */}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;