import React, { useEffect } from 'react';
import { useNotifications } from '../context/NotificationContext';
import { 
    CheckCircle, Info, XCircle, AlertTriangle, 
    Clock, User, FileText, Bell, ChevronRight 
} from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import buddhistEra from 'dayjs/plugin/buddhistEra';
import { useNavigate } from 'react-router-dom';

// เปิดใช้งาน Plugin พ.ศ.
dayjs.extend(buddhistEra);
dayjs.locale('th');

const NotificationsPage: React.FC = () => {
    const { notifications, markAsRead } = useNotifications();
    const navigate = useNavigate();

    // เมื่อเข้ามาหน้านี้ ให้ Mark ว่าอ่านแล้วทันที
    useEffect(() => {
        markAsRead();
    }, []);

    // ฟังก์ชันเมื่อกดที่รายการแจ้งเตือน
    const handleNotificationClick = (log: any) => {
        console.log("Clicked Log Data:", log); // 🔍 เช็คค่าใน Console (กด F12)

        // ถ้าเป็นการ "ลบ" (DELETE) ไม่ต้องไปไหน
        if (log.action === 'DELETE') return;

        // ✅ ตรวจสอบว่ามี ID โปรเจกต์หรือไม่
        if (log.entity_id) {
            console.log(`Navigating to project ${log.entity_id}`);
            navigate(`/project/${log.entity_id}/timeline`);
        } else {
            console.warn("⚠️ ไม่พบ entity_id ในข้อมูลแจ้งเตือน (กรุณาแก้ไฟล์ index.js)");
            // ถ้ายังไม่แก้ index.js มันจะเข้าเงื่อนไขนี้
        }
    };

    // Helper เลือกไอคอนตาม Action
    const getIcon = (action: string) => {
        switch (action) {
            case 'CREATE': return <CheckCircle size={18} className="text-green-500" />;
            case 'UPDATE': return <Info size={18} className="text-blue-500" />;
            case 'DELETE': return <XCircle size={18} className="text-red-500" />;
            case 'PLAN': return <FileText size={18} className="text-purple-500" />;
            default: return <AlertTriangle size={18} className="text-yellow-500" />;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 animate-fade-in pb-20">
            {/* Container */}
            <div className="max-w-4xl mx-auto bg-white min-h-screen md:min-h-0 md:my-4 md:rounded-xl md:shadow-sm md:border border-gray-200 overflow-hidden">
                
                {/* Header */}
                <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-4 py-3 flex justify-between items-center shadow-sm">
                    <h1 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <Bell className="text-blue-600" size={20} /> 
                        การแจ้งเตือน
                    </h1>
                    <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                        {notifications.length} รายการ
                    </span>
                </div>

                {/* Content List */}
                {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                            <Info size={28} className="text-gray-300" />
                        </div>
                        <p className="text-sm">ไม่มีการแจ้งเตือนใหม่</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {notifications.map((log) => (
                            <div 
                                key={log.id}
                                // ✅ Event Click อยู่ที่นี่
                                onClick={() => handleNotificationClick(log)} 
                                className={`
                                    relative p-4 transition-all duration-200 
                                    border-l-[3px] group
                                    ${log.action === 'DELETE' 
                                        ? 'cursor-default opacity-70' 
                                        : 'cursor-pointer hover:bg-blue-50/30 active:bg-blue-50'
                                    }
                                    ${
                                        log.action === 'CREATE' ? 'border-l-green-500' :
                                        log.action === 'DELETE' ? 'border-l-red-500' :
                                        log.action === 'PLAN' ? 'border-l-purple-500' :
                                        'border-l-blue-500'
                                    }
                                `}
                            >
                                <div className="flex gap-3 items-start">
                                    {/* Icon */}
                                    <div className="mt-0.5 flex-shrink-0 bg-gray-50 p-1.5 rounded-lg group-hover:bg-white transition-colors shadow-sm">
                                        {getIcon(log.action)}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start gap-2">
                                            <p className="text-sm font-semibold text-gray-800 leading-snug break-words">
                                                {log.details || "ไม่มีรายละเอียด"}
                                            </p>
                                            {/* Chevron Icon */}
                                            {log.action !== 'DELETE' && (
                                                <ChevronRight size={16} className="text-gray-300 group-hover:text-blue-400 transition-colors" />
                                            )}
                                        </div>

                                        {/* Meta Data */}
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                                            <div className="flex items-center gap-1 text-[11px] text-gray-500">
                                                <Clock size={11} />
                                                {log.timestamp 
                                                    ? dayjs(log.timestamp).format('D MMM BB HH:mm') 
                                                    : '-'}
                                            </div>

                                            <div className="flex items-center gap-1 text-[11px] text-gray-500">
                                                <User size={11} />
                                                <span className="truncate max-w-[120px]">{log.actor || 'System'}</span>
                                            </div>

                                            <span className={`
                                                ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded border
                                                ${
                                                    log.action === 'CREATE' ? 'bg-green-50 text-green-700 border-green-100' :
                                                    log.action === 'DELETE' ? 'bg-red-50 text-red-700 border-red-100' :
                                                    log.action === 'PLAN' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                                    'bg-blue-50 text-blue-700 border-blue-100'
                                                }
                                            `}>
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