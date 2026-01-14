import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { X, Send, User, Activity, Clock } from 'lucide-react';
import { Project, AuditLog } from '../types';
import { useAuth } from '../context/AuthContext';

interface ProjectTimelineModalProps {
    isOpen: boolean;
    onClose: () => void;
    project: Project;
}

const ProjectTimelineModal: React.FC<ProjectTimelineModalProps> = ({ isOpen, onClose, project }) => {
    const { token } = useAuth();
const [logs, setLogs] = useState<AuditLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const [note, setNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const timelineEndRef = useRef<HTMLDivElement>(null);

    // Fetch Logs
    useEffect(() => {
        if (isOpen && project?.id && token) {
            fetchLogs();
        }
    }, [isOpen, project, token]);

    const fetchLogs = async () => {
        setIsLoading(true);
        try {
            const res = await axios.get(`https://saraban-backend.onrender.com/api/projects/${project.id}/logs`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setLogs(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error("Error fetching logs:", error);
            setLogs([]); 
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!note.trim()) return;

        setIsSubmitting(true);
        try {
            await axios.post(`https://saraban-backend.onrender.com/api/projects/${project.id}/logs`, 
                { note, action: 'NOTE' },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setNote('');
            fetchLogs();
        } catch (error) {
            console.error("Error adding note:", error);
            alert("ไม่สามารถเพิ่มบันทึกได้");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden">
                
                {/* Header */}
                <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <Activity size={20} className="text-blue-600" />
                            ไทม์ไลน์โครงการ
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            รหัส: {project.code} | {project.name}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Body (Scrollable) */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-full text-gray-400">
                            กำลังโหลดข้อมูล...
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {logs && logs.length > 0 ? (
                                logs.map((log) => (
                                    <div key={log.id} className="relative pl-8 border-l-2 border-blue-100 last:border-0 pb-6 last:pb-0">
                                        {/* Dot */}
                                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-blue-500 border-4 border-white shadow-sm"></div>
                                        
                                        {/* Content Card */}
                                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                            
                                            {/* Header Card: Action & Time */}
                                            <div className="flex justify-between items-start mb-3">
                                                <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                                                    log.action === 'CREATE' ? 'bg-green-100 text-green-700' :
                                                    log.action === 'UPDATE' ? 'bg-yellow-100 text-yellow-700' :
                                                    log.action === 'DELETE' ? 'bg-red-100 text-red-700' :
                                                    log.action === 'NOTE' ? 'bg-purple-100 text-purple-700' :
                                                    'bg-blue-100 text-blue-700'
                                                }`}>
                                                    {log.action}
                                                </span>
                                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                                    <Clock size={12} />
                                                    {new Date(log.timestamp).toLocaleString('th-TH')}
                                                </span>
                                            </div>
                                            
                                            {/* Detail Text */}
                                            <p className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">
                                                {log.details}
                                            </p>

                                            {/* 🔥 ส่วนที่ปรับปรุง: แสดงชื่อคนบันทึกให้ชัดเจนขึ้น 🔥 */}
                                            <div className="mt-4 flex items-center gap-3 pt-3 border-t border-gray-100">
                                                {/* Avatar */}
                                                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-xs font-bold text-blue-600 border border-blue-100">
                                                    {log.actor ? log.actor.charAt(0).toUpperCase() : <User size={14}/>}
                                                </div>
                                                
                                                {/* Name Info */}
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-gray-400 font-medium">ผู้ดำเนินการ</span>
                                                    <span className="text-xs text-gray-800 font-bold">
                                                        {log.actor || 'ไม่ระบุชื่อ'}
                                                    </span>
                                                </div>
                                            </div>

                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-10 text-gray-400 bg-white rounded-xl border border-dashed">
                                    <p>ยังไม่มีประวัติการดำเนินการ</p>
                                </div>
                            )}
                            <div ref={timelineEndRef} />
                        </div>
                    )}
                </div>

                {/* Footer (Input Form) */}
                <form onSubmit={handleSubmit} className="p-4 bg-white border-t flex gap-3 shadow-lg z-10">
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="พิมพ์บันทึกหรือข้อความเพิ่มเติม..."
                            className="w-full pl-4 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            disabled={isSubmitting}
                        />
                    </div>
                    <button 
                        type="submit" 
                        disabled={!note.trim() || isSubmitting}
                        className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg active:scale-95"
                    >
                        <Send size={20} />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ProjectTimelineModal;