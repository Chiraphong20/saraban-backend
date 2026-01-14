import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Clock, Activity, Search, FileText } from 'lucide-react';
import { AuditLog } from '../types';
import { useAuth } from '../context/AuthContext';

// Interface เสริมสำหรับหน้านี้ (เผื่อ type หลักยังไม่อัปเดต)
interface ExtendedAuditLog extends AuditLog {
    project_code?: string;
}

const AuditLogViewer: React.FC = () => {
    const { token } = useAuth();
    
    // ใช้ Type ExtendedAuditLog เพื่อรองรับ project_code
    const [logs, setLogs] = useState<ExtendedAuditLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (token) {
            fetchLogs();
        }
    }, [token]);

    const fetchLogs = async () => {
        setIsLoading(true);
        try {
            const res = await axios.get('https://saraban-backend.onrender.com/api/audit-logs', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setLogs(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error("Error fetching audit logs:", error);
            setLogs([]); 
        } finally {
            setIsLoading(false);
        }
    };

    // ✅ ฟังก์ชันกรองข้อมูล (เพิ่มการค้นหาด้วย project_code)
    const filteredLogs = logs.filter(log => 
        (log.action || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.actor || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.details || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.project_code || '').toLowerCase().includes(searchTerm.toLowerCase()) // 🔥 ค้นหารหัสโครงการได้แล้ว
    );

    return (
        <div className="p-6 max-w-7xl mx-auto animate-fade-in">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Activity className="text-blue-600" />
                    ประวัติการใช้งานระบบ (Audit Logs)
                </h1>
                <p className="text-gray-500 mt-1">บันทึกกิจกรรมทั้งหมดที่เกิดขึ้นในระบบ</p>
            </div>

            {/* Search Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input 
                        type="text"
                        placeholder="ค้นหา รหัสโครงการ, Action, ผู้ใช้งาน หรือรายละเอียด..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                </div>
            </div>

            {/* Logs List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {isLoading ? (
                    <div className="p-10 text-center text-gray-500">กำลังโหลดข้อมูล...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100 text-sm font-semibold text-gray-600">
                                    <th className="p-4 w-48">เวลา</th>
                                    <th className="p-4 w-32">Action</th>
                                    <th className="p-4 w-40">ผู้ดำเนินการ</th>
                                    <th className="p-4">รายละเอียด / โครงการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredLogs && filteredLogs.length > 0 ? (
                                    filteredLogs.map((log) => (
                                        <tr key={log.id} className="hover:bg-blue-50/50 transition-colors">
                                            <td className="p-4 text-sm text-gray-500 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <Clock size={14} />
                                                    {new Date(log.timestamp).toLocaleString('th-TH')}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                                                    log.action === 'CREATE' ? 'bg-green-100 text-green-700' :
                                                    log.action === 'UPDATE' ? 'bg-yellow-100 text-yellow-700' :
                                                    log.action === 'DELETE' ? 'bg-red-100 text-red-700' :
                                                    log.action === 'NOTE' ? 'bg-purple-100 text-purple-700' :
                                                    'bg-blue-100 text-blue-700'
                                                }`}>
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                                                        {log.actor ? log.actor.charAt(0).toUpperCase() : '?'}
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-700">{log.actor}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-sm text-gray-600">
                                                <div className="flex flex-col gap-1">
                                                    {/* 🔥 แสดงรหัสโครงการ (ถ้ามี) */}
                                                    {log.project_code && (
                                                        <span className="inline-flex items-center gap-1 w-fit px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
                                                            <FileText size={10} />
                                                            {log.project_code}
                                                        </span>
                                                    )}
                                                    <span>{log.details}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="p-10 text-center text-gray-400">
                                            ไม่พบข้อมูลที่ค้นหา
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AuditLogViewer;