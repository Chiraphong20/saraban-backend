import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useProjects } from '../context/ProjectContext';
import { Project } from '../types';
import { 
    ArrowLeft, Calendar, Flag, User, 
    Printer, Download, Plus, Save, X, MoreHorizontal 
} from 'lucide-react';
import { message } from 'antd'; // ใช้ Alert ของ Antd

// Interface ของ Feature
interface ProjectFeature {
    id: number;
    title: string;
    detail: string;
    next_list: string;
    status: string;
    start_date: string;
    due_date: string;
    remark: string;
    note_by: string;
}

interface ProjectTimelinePageProps {
    projectId: number;
    onBack: () => void;
}

const ProjectTimelinePage: React.FC<ProjectTimelinePageProps> = ({ projectId, onBack }) => {
    const { token, user } = useAuth();
    const { projects } = useProjects();
    const [project, setProject] = useState<Project | null>(null);
    const [features, setFeatures] = useState<ProjectFeature[]>([]); // เก็บข้อมูลแผนงาน
    const [loading, setLoading] = useState(true);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newFeature, setNewFeature] = useState({
        title: '', detail: '', next_list: '', status: 'PENDING',
        start_date: '', due_date: '', remark: ''
    });

    // Initial Data Fetching
    useEffect(() => {
        const foundProject = projects.find(p => p.id === projectId);
        if (foundProject) setProject(foundProject);
        fetchFeatures();
    }, [projectId, projects, token]);

    const fetchFeatures = async () => {
        if (!token) return;
        try {
            const res = await axios.get(`https://saraban-backend.onrender.com/api/projects/${projectId}/features`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFeatures(res.data);
        } catch (error) {
            console.error("Error fetching features:", error);
        } finally {
            setLoading(false);
        }
    };

    // --- Logic สร้าง Gantt Chart รายเดือน ---
    const getMonthRange = () => {
        if (!project) return [];
        const start = new Date(project.startDate);
        const end = new Date(project.endDate);
        const months = [];
        const current = new Date(start);
        current.setDate(1); 

        // สร้าง Loop เดือน ตั้งแต่เริ่ม จนจบ (หรืออย่างน้อย 6 เดือน)
        while (current <= end || months.length < 6) {
            months.push(new Date(current));
            current.setMonth(current.getMonth() + 1);
        }
        return months;
    };
    const timelineMonths = getMonthRange();

    // เช็คว่า Feature นี้ คลุมเดือนนี้หรือไม่ (เพื่อวาดแถบสี)
    const isFeatureActiveInMonth = (feature: ProjectFeature, monthDate: Date) => {
        const featStart = new Date(feature.start_date);
        const featEnd = new Date(feature.due_date);
        const currentMonthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
        const currentMonthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

        // ตรวจสอบการทับซ้อนของช่วงเวลา
        return (featStart <= currentMonthEnd && featEnd >= currentMonthStart);
    };

    // Handle Create Feature
    const handleCreateFeature = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newFeature.title || !newFeature.start_date || !newFeature.due_date) {
            message.warning('กรุณากรอกหัวข้อ, วันที่เริ่ม และวันที่สิ้นสุด');
            return;
        }

        try {
            await axios.post(`https://saraban-backend.onrender.com/api/projects/${projectId}/features`, newFeature, {
                headers: { Authorization: `Bearer ${token}` }
            });
            message.success('เพิ่มแผนงานเรียบร้อยแล้ว');
            setIsModalOpen(false);
            setNewFeature({ title: '', detail: '', next_list: '', status: 'PENDING', start_date: '', due_date: '', remark: '' }); // Reset Form
            fetchFeatures(); // Reload Data
        } catch (error) {
            message.error('เกิดข้อผิดพลาดในการบันทึก');
        }
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return "-";
        return new Date(dateStr).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: '2-digit' });
    };

    if (!project) return <div className="p-10 text-center">กำลังโหลด...</div>;

    return (
        <div className="space-y-6 animate-fade-in pb-20 bg-gray-50 min-h-screen relative">
            
            {/* Header */}
            <div className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            {project.name}
                            <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700 border border-blue-200">{project.status}</span>
                        </h1>
                        <p className="text-sm text-gray-500">Code: {project.code} | Manager: {project.owner}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 shadow-sm font-medium">
                        <Plus size={16} /> Add Activity / Feature
                    </button>
                </div>
            </div>

            <div className="px-6 space-y-6">

                {/* --- 🟢 ส่วนที่ 1: Dynamic Gantt Chart --- */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b bg-blue-50/50 flex justify-between items-center">
                        <h2 className="font-bold text-blue-800 flex items-center gap-2">
                            <Calendar size={18} /> PROJECT PLAN TIMELINE
                        </h2>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[800px] border-collapse">
                            <thead>
                                <tr>
                                    <th className="w-64 p-3 border-b border-r bg-gray-50 text-left text-xs font-bold text-gray-500 uppercase">PHASE / ACTIVITY</th>
                                    {timelineMonths.map((date, index) => (
                                        <th key={index} className="w-24 border-b border-r bg-gray-100 text-center text-xs font-bold text-gray-600 py-2">
                                            {date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {/* แถวของ Features ที่ดึงจาก DB */}
                                {features.length === 0 ? (
                                    <tr>
                                        <td colSpan={timelineMonths.length + 1} className="p-8 text-center text-gray-400 italic">
                                            ยังไม่มีแผนงาน (กดปุ่ม + Add Activity ด้านบนเพื่อเริ่มวางแผน)
                                        </td>
                                    </tr>
                                ) : (
                                    features.map((feat, i) => (
                                        <tr key={feat.id}>
                                            <td className="p-4 border-r border-t font-medium text-gray-700 bg-white relative">
                                                <div className="font-bold text-blue-900">{i + 1}. {feat.title}</div>
                                                <div className="text-xs text-gray-400 font-normal truncate max-w-[200px]">{feat.detail}</div>
                                                <div className="text-[10px] text-gray-400 mt-1">
                                                    {formatDate(feat.start_date)} - {formatDate(feat.due_date)}
                                                </div>
                                            </td>
                                            {timelineMonths.map((date, index) => {
                                                const active = isFeatureActiveInMonth(feat, date);
                                                return (
                                                    <td key={index} className="border-r border-t p-0 h-16 relative">
                                                        <div className="absolute inset-0 border-r border-dashed border-gray-100 pointer-events-none"></div>
                                                        {active && (
                                                            <div 
                                                                className={`absolute top-1/2 left-0 right-0 h-5 mx-1 rounded shadow-sm flex items-center justify-center -translate-y-1/2 text-[10px] text-white font-bold
                                                                ${feat.status === 'COMPLETED' ? 'bg-green-500' : 
                                                                  feat.status === 'IN_PROGRESS' ? 'bg-blue-500' : 'bg-yellow-500'}`}
                                                            >
                                                                {feat.status === 'COMPLETED' ? 'Done' : ''}
                                                            </div>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* --- 🟢 ส่วนที่ 2: Detail Table (Features List) --- */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-5 border-b flex items-center justify-between">
                        <h2 className="font-bold text-gray-800">Plan Details Table</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-800 text-white text-xs uppercase tracking-wider">
                                    <th className="p-4 font-medium w-32">Date Created</th>
                                    <th className="p-4 font-medium w-40">Title / Feature</th>
                                    <th className="p-4 font-medium min-w-[200px]">Detail</th>
                                    <th className="p-4 font-medium min-w-[150px]">Next List</th>
                                    <th className="p-4 font-medium w-28 text-center">Status</th>
                                    <th className="p-4 font-medium w-28 text-center">Due Date</th>
                                    <th className="p-4 font-medium w-32">Remark</th>
                                    <th className="p-4 font-medium w-32">Note (By)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {features.map((feat) => (
                                    <tr key={feat.id} className="hover:bg-blue-50 transition-colors">
                                        <td className="p-4 text-gray-500">{formatDate(feat.start_date)}</td>
                                        <td className="p-4 font-bold text-blue-900">{feat.title}</td>
                                        <td className="p-4 text-gray-600">{feat.detail || '-'}</td>
                                        <td className="p-4 text-gray-600">{feat.next_list || '-'}</td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                feat.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                                feat.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                                                'bg-yellow-100 text-yellow-700'
                                            }`}>
                                                {feat.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center text-red-600 font-medium">{formatDate(feat.due_date)}</td>
                                        <td className="p-4 text-gray-500">{feat.remark || '-'}</td>
                                        <td className="p-4 flex items-center gap-2">
                                            <User size={14} className="text-gray-400" /> {feat.note_by}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* --- 🟢 Modal: Add Feature --- */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-gray-800">เพิ่มแผนงาน / Feature ใหม่</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-gray-200 rounded-full"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleCreateFeature} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Title / Feature Name <span className="text-red-500">*</span></label>
                                <input type="text" required className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none" 
                                    value={newFeature.title} onChange={e => setNewFeature({...newFeature, title: e.target.value})} placeholder="เช่น ออกแบบ UX/UI, ติดตั้ง Server" />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date <span className="text-red-500">*</span></label>
                                    <input type="date" required className="w-full border rounded-lg p-2 outline-none"
                                        value={newFeature.start_date} onChange={e => setNewFeature({...newFeature, start_date: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Due Date <span className="text-red-500">*</span></label>
                                    <input type="date" required className="w-full border rounded-lg p-2 outline-none"
                                        value={newFeature.due_date} onChange={e => setNewFeature({...newFeature, due_date: e.target.value})} />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Detail</label>
                                <textarea className="w-full border rounded-lg p-2 outline-none" rows={2}
                                    value={newFeature.detail} onChange={e => setNewFeature({...newFeature, detail: e.target.value})} placeholder="รายละเอียดงาน..." />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Next List (สิ่งที่ต้องทำต่อ)</label>
                                    <input type="text" className="w-full border rounded-lg p-2 outline-none"
                                        value={newFeature.next_list} onChange={e => setNewFeature({...newFeature, next_list: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                    <select className="w-full border rounded-lg p-2 outline-none bg-white"
                                        value={newFeature.status} onChange={e => setNewFeature({...newFeature, status: e.target.value})}>
                                        <option value="PENDING">PENDING</option>
                                        <option value="IN_PROGRESS">IN PROGRESS</option>
                                        <option value="COMPLETED">COMPLETED</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Remark</label>
                                <input type="text" className="w-full border rounded-lg p-2 outline-none"
                                    value={newFeature.remark} onChange={e => setNewFeature({...newFeature, remark: e.target.value})} placeholder="หมายเหตุ..." />
                            </div>

                            <div className="pt-4 flex justify-end gap-2">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">ยกเลิก</button>
                                <button type="submit" className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2">
                                    <Save size={18} /> บันทึก
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectTimelinePage;