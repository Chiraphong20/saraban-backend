import React, { useEffect } from 'react';
import { useNotifications } from '../context/NotificationContext';
import { CheckCircle, Info, XCircle, AlertTriangle, Clock, User, Bell } from 'lucide-react';

const NotificationsPage: React.FC = () => {
    const { notifications, markAsRead } = useNotifications();

    // เมื่อเข้ามาหน้านี้ ให้ถือว่าอ่านแล้ว (เคลียร์ตัวเลข)
    useEffect(() => {
        markAsRead();
    }, []);

    // Helper: เลือกไอคอน
    const getIcon = (action: string) => {
        switch (action) {
            case 'CREATE': return <CheckCircle size={20} className="text-green-500" />;
            case 'UPDATE': return <Info size={20} className="text-blue-500" />;
            case 'DELETE': return <XCircle size={20} className="text-red-500" />;
            default: return <AlertTriangle size={20} className="text-yellow-500" />;
        }
    };

    // Helper: สีพื้นหลัง
    const getBgColor = (action: string) => {
        switch (action) {
            case 'CREATE': return 'bg-green-50 border-green-100';
            case 'UPDATE': return 'bg-blue-50 border-blue-100';
            case 'DELETE': return 'bg-red-50 border-red-100';
            default: return 'bg-gray-50 border-gray-100';
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center gap-3">
                <Bell className="text-blue-600" size={28} />
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">การแจ้งเตือนทั้งหมด</h1>
                    <p className="text-gray-500">ประวัติกิจกรรมล่าสุดในระบบ</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {notifications.length === 0 ? (
                    <div className="p-12 text-center text-gray-400">
                        <Bell size={48} className="mx-auto mb-4 opacity-20" />
                        <p>ยังไม่มีการแจ้งเตือน</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {notifications.map((log) => (
                            <div key={log.id} className={`p-4 hover:bg-white transition-colors border-l-4 ${getBgColor(log.action)}`}>
                                <div className="flex gap-4">
                                    <div className="mt-1 flex-shrink-0">
                                        {getIcon(log.action)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <p className="text-sm font-medium text-gray-900">
                                                {log.details}
                                            </p>
                                            <span className="text-xs text-gray-400 flex items-center gap-1 whitespace-nowrap ml-2">
                                                <Clock size={12} />
                                                {new Date(log.timestamp).toLocaleString('th-TH')}
                                            </span>
                                        </div>
                                        
                                        <div className="flex items-center gap-3 mt-2">
                                            {log.project_code && (
                                                <span className="px-2 py-0.5 rounded text-xs font-bold bg-white border border-gray-200 text-gray-600">
                                                    {log.project_code}
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1 text-xs text-gray-500">
                                                <User size={12} />
                                                {log.actor}
                                            </span>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                                                log.action === 'CREATE' ? 'bg-green-100 text-green-700 border-green-200' :
                                                log.action === 'DELETE' ? 'bg-red-100 text-red-700 border-red-200' :
                                                'bg-blue-100 text-blue-700 border-blue-200'
                                            }`}>
                                                {log.action}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationsPage;