import React, { useEffect } from 'react';
import { useNotifications } from '../context/NotificationContext';
import { CheckCircle, Info, XCircle, AlertTriangle, Clock, User, FileText } from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/th';

const NotificationsPage: React.FC = () => {
    const { notifications, markAsRead } = useNotifications();

    // เมื่อเข้ามาหน้านี้ ให้ถือว่าอ่านแล้ว (เคลียร์ตัวเลข)
    useEffect(() => {
        markAsRead();
    }, []);

    // Helper: เลือกไอคอน
    const getIcon = (action: string) => {
        switch (action) {
            case 'CREATE': return <CheckCircle size={24} className="text-green-500" />;
            case 'UPDATE': return <Info size={24} className="text-blue-500" />;
            case 'DELETE': return <XCircle size={24} className="text-red-500" />;
            case 'PLAN': return <FileText size={24} className="text-purple-500" />; // ไอคอนสำหรับ Timeline
            default: return <AlertTriangle size={24} className="text-yellow-500" />;
        }
    };

    // Helper: สีพื้นหลัง
    const getBgColor = (action: string) => {
        switch (action) {
            case 'CREATE': return 'bg-green-50 border-green-100 hover:bg-green-100';
            case 'UPDATE': return 'bg-blue-50 border-blue-100 hover:bg-blue-100';
            case 'DELETE': return 'bg-red-50 border-red-100 hover:bg-red-100';
            case 'PLAN': return 'bg-purple-50 border-purple-100 hover:bg-purple-100';
            default: return 'bg-gray-50 border-gray-100';
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto animate-fade-in pb-20">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-5 border-b bg-gray-50 flex justify-between items-center">
                    <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Info className="text-blue-600" /> การแจ้งเตือนทั้งหมด
                    </h1>
                    <span className="text-xs text-gray-500">แสดง 50 รายการล่าสุด</span>
                </div>

                {notifications.length === 0 ? (
                    <div className="p-10 text-center text-gray-400 flex flex-col items-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                            <Info size={30} />
                        </div>
                        <p>ไม่มีการแจ้งเตือนใหม่</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {notifications.map((log) => (
                            <div 
                                key={log.id} 
                                className={`p-4 transition-all duration-200 border-l-4 ${
                                    log.action === 'CREATE' ? 'border-l-green-500' :
                                    log.action === 'DELETE' ? 'border-l-red-500' :
                                    log.action === 'PLAN' ? 'border-l-purple-500' :
                                    'border-l-blue-500'
                                } hover:shadow-md cursor-default bg-white`}
                            >
                                <div className="flex gap-4">
                                    {/* Icon Section */}
                                    <div className="mt-1 flex-shrink-0">
                                        {getIcon(log.action)}
                                    </div>

                                    {/* Content Section */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-1">
                                            {/* ✅ ส่วนสำคัญ: แสดงรายละเอียด (details) ที่บันทึกมาจาก ProjectList/Timeline */}
                                            <p className="font-semibold text-gray-800 text-sm md:text-base break-words">
                                                {log.details || "ไม่มีรายละเอียด"}
                                            </p>
                                            <span className="text-[10px] text-gray-400 flex-shrink-0 flex items-center gap-1 ml-2 bg-gray-50 px-2 py-1 rounded-full">
                                                <Clock size={12} />
                                                {log.timestamp 
                                                    ? dayjs(log.timestamp).locale('th').format('D MMM BB HH:mm') 
                                                    : '-'}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-3 mt-2">
                                            <span className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                                                <User size={12} />
                                                <span className="font-medium text-gray-700">{log.actor || 'System'}</span>
                                            </span>

                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                                log.action === 'CREATE' ? 'bg-green-100 text-green-700' :
                                                log.action === 'DELETE' ? 'bg-red-100 text-red-700' :
                                                log.action === 'PLAN' ? 'bg-purple-100 text-purple-700' :
                                                'bg-blue-100 text-blue-700'
                                            }`}>
                                                {log.action}
                                            </span>
                                            
                                            {/* ถ้ามี project_code ให้แสดง (แต่ปัจจุบัน backend ส่งเป็น System) */}
                                            {log.project_code && log.project_code !== 'System' && (
                                                <span className="text-xs text-gray-400">
                                                     Ref: {log.project_code}
                                                </span>
                                            )}
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