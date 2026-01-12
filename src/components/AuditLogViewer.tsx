import React from 'react';
import { useProjects } from '../context/ProjectContext';
import { History, User, Activity } from 'lucide-react';

const AuditLogViewer: React.FC = () => {
    const { auditLogs } = useProjects();

    const getActionColor = (action: string) => {
        switch (action) {
            case 'CREATE': return 'bg-green-100 text-green-700';
            case 'UPDATE': return 'bg-blue-100 text-blue-700';
            case 'DELETE': return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const formatDate = (isoString: string) => {
        return new Date(isoString).toLocaleString('th-TH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-3 mb-6">
                <div className="bg-indigo-600 p-2 rounded-lg">
                    <History className="text-white" size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">บันทึกการใช้งาน (Audit Logs)</h1>
                    <p className="text-gray-500">ประวัติการเปลี่ยนแปลงข้อมูลในระบบ</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                {auditLogs.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <Activity size={48} className="mx-auto mb-4 text-gray-300" />
                        <p>ยังไม่มีรายการบันทึก</p>
                    </div>
                ) : (
                    <div className="relative border-l-2 border-gray-200 ml-4 space-y-8">
                        {auditLogs.map((log) => (
                            <div key={log.id} className="relative pl-8">
                                <span className={`absolute top-0 left-[-9px] w-4 h-4 rounded-full border-2 border-white ring-2 ${
                                    log.action === 'CREATE' ? 'bg-green-500 ring-green-100' : 
                                    log.action === 'UPDATE' ? 'bg-blue-500 ring-blue-100' : 'bg-red-500 ring-red-100'
                                }`}></span>
                                
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-1">
                                    <div className="flex items-center space-x-2">
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${getActionColor(log.action)}`}>
                                            {log.action}
                                        </span>
                                        <span className="text-sm text-gray-500">{formatDate(log.timestamp)}</span>
                                    </div>
                                </div>
                                
                                <div className="bg-gray-50 rounded-lg p-4 mt-2">
                                    <p className="text-gray-800 font-medium">{log.details}</p>
                                    <div className="flex items-center mt-2 text-xs text-gray-500">
                                        <User size={12} className="mr-1" />
                                        <span>ดำเนินการโดย: {log.actor}</span>
                                        <span className="mx-2">•</span>
                                        <span>ID: {log.entity_id}</span>                                    
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

export default AuditLogViewer;
