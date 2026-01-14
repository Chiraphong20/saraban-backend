import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useProjects } from '../context/ProjectContext';
import { Project, AuditLog } from '../types';
import { 
    ArrowLeft, Calendar, Clock, User, 
    FileText, CheckCircle, Activity, Flag 
} from 'lucide-react';

interface ProjectTimelinePageProps {
    projectId: number;
    onBack: () => void;
}

const ProjectTimelinePage: React.FC<ProjectTimelinePageProps> = ({ projectId, onBack }) => {
    const { token } = useAuth();
    const { projects } = useProjects();
    const [project, setProject] = useState<Project | null>(null);
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);

    // หาข้อมูล Project จาก Context (ไม่ต้องยิง API ใหม่ให้เปลือง)
    useEffect(() => {
        const foundProject = projects.find(p => p.id === projectId);
        if (foundProject) {
            setProject(foundProject);
        }
    }, [projectId, projects]);

    // ดึง Logs
    useEffect(() => {
        const fetchLogs = async () => {
            if (!token || !projectId) return;
            try {
                const res = await axios.get(`https://saraban-backend.onrender.com/api/projects/${projectId}/logs`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setLogs(Array.isArray(res.data) ? res.data : []);
            } catch (error) {
                console.error("Error fetching logs:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchLogs();
    }, [projectId, token]);

    // ฟังก์ชันจัดกลุ่ม Logs ตามเดือนสำหรับ Timeline View
    const getMonthlyTimeline = () => {
        const groups: Record<string, AuditLog[]> = {};
        logs.forEach(log => {
            const date = new Date(log.timestamp);
            const monthKey = date.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
            if (!groups[monthKey]) groups[monthKey] = [];
            groups[monthKey].push(log);
        });
        return groups;
    };

    if (!project) return <div className="p-10 text-center">กำลังโหลดข้อมูลโครงการ...</div>;

    const timelineData = getMonthlyTimeline();

    // Helper: แปลงวันที่
    const formatDate = (dateStr: string) => {
        if (!dateStr) return "-";
        return new Date(dateStr).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: '2-digit' });
    };

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button 
                    onClick={onBack}
                    className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
                >
                    <ArrowLeft size={20} className="text-gray-600" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Flag className="text-blue-600" /> 
                        {project.name}
                    </h1>
                    <p className="text-gray-500 text-sm mt-1 flex items-center gap-3">
                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-bold border border-blue-100">
                            {project.code}
                        </span>
                        <span className="flex items-center gap-1">
                            <Calendar size={14} /> Due Date: {formatDate(project.endDate)}
                        </span>
                    </p>
                </div>
            </div>

            {/* 🟢 ส่วนที่ 1: Project Plan Timeline (แยกตามเดือน) */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <Activity className="text-orange-500" size={20} />
                    Project Plan & Timeline
                </h2>
                
                <div className="relative border-l-2 border-gray-200 ml-3 space-y-8 py-2">
                    {/* แสดงจุดเริ่มต้น */}
                    <div className="relative pl-8">
                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-green-500 border-4 border-white shadow-sm"></div>
                        <h3 className="text-sm font-bold text-green-700">Project Started</h3>
                        <p className="text-xs text-gray-400">{formatDate(project.startDate)}</p>
                    </div>

                    {/* Loop แสดงกิจกรรมรายเดือน */}
                    {Object.keys(timelineData).map((month, index) => (
                        <div key={index} className="relative pl-8">
                            <div className="absolute -left-[7px] top-1 w-3 h-3 rounded-full bg-blue-400 border-2 border-white shadow-sm"></div>
                            <h3 className="text-md font-bold text-gray-800 mb-2">{month}</h3>
                            <div className="space-y-2">
                                {timelineData[month].map(log => (
                                    <div key={log.id} className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-sm">
                                        <div className="flex justify-between">
                                            <span className="font-semibold text-blue-700">{log.action}</span>
                                            <span className="text-xs text-gray-400">{formatDate(log.timestamp)}</span>
                                        </div>
                                        <p className="text-gray-600 mt-1">{log.details}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    {/* แสดงจุดสิ้นสุด */}
                    <div className="relative pl-8">
                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-red-500 border-4 border-white shadow-sm"></div>
                        <h3 className="text-sm font-bold text-red-700">Project Due Date</h3>
                        <p className="text-xs text-gray-400">{formatDate(project.endDate)}</p>
                    </div>
                </div>
            </div>

            {/* 🟢 ส่วนที่ 2: Table Detail View */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <FileText className="text-blue-600" size={20} />
                        รายละเอียดการดำเนินการ (Activity Log)
                    </h2>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                                <th className="p-4 w-24">Date</th>
                                <th className="p-4 w-32">Title</th>
                                <th className="p-4 w-64">Detail</th>
                                <th className="p-4 w-32">Next List</th>
                                <th className="p-4 w-24">Status</th>
                                <th className="p-4 w-24">Due Date</th>
                                <th className="p-4 w-32">Remark</th>
                                <th className="p-4 w-40">Note (By)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                            {loading ? (
                                <tr><td colSpan={8} className="p-8 text-center text-gray-400">กำลังโหลด...</td></tr>
                            ) : logs.length > 0 ? (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-blue-50/50 transition-colors">
                                        <td className="p-4 whitespace-nowrap">{formatDate(log.timestamp)}</td>
                                        
                                        {/* Title: ใช้ Action แทน */}
                                        <td className="p-4 font-medium text-blue-700">{log.action}</td>
                                        
                                        {/* Detail */}
                                        <td className="p-4">{log.details}</td>
                                        
                                        {/* Next List (ไม่มีข้อมูลจริง ให้ใส่ -) */}
                                        <td className="p-4 text-gray-400 text-center">-</td>
                                        
                                        {/* Status */}
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                log.action === 'CREATE' ? 'bg-green-100 text-green-700' :
                                                log.action === 'DELETE' ? 'bg-red-100 text-red-700' :
                                                'bg-blue-100 text-blue-700'
                                            }`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        
                                        {/* Due Date: ใช้วันจบโครงการแทน */}
                                        <td className="p-4 text-gray-500">{formatDate(project.endDate)}</td>
                                        
                                        {/* Remark */}
                                        <td className="p-4 text-gray-400 text-center">-</td>
                                        
                                        {/* Note (Who) */}
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600">
                                                    {log.actor ? log.actor.charAt(0) : 'U'}
                                                </div>
                                                <span className="text-gray-900 font-medium">{log.actor}</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={8} className="p-8 text-center text-gray-400">ไม่พบข้อมูล</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ProjectTimelinePage;