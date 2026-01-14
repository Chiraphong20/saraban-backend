import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useProjects } from '../context/ProjectContext';
import { Project } from '../types';
import { 
    ArrowLeft, Calendar, User, 
    Plus, Save, X, Edit2, Trash2, AlertCircle 
} from 'lucide-react';
import { message, Modal } from 'antd'; // ใช้ Alert และ Modal confirm

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
    const [features, setFeatures] = useState<ProjectFeature[]>([]); 
    const [loading, setLoading] = useState(true);

    // Modal State สำหรับ Add/Edit
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null); // ถ้ามีค่า = แก้ไข, null = เพิ่มใหม่
    const [formData, setFormData] = useState({
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

    // --- Logic สร้าง Timeline รายสัปดาห์ ---
    const getMonthRange = () => {
        if (!project) return [];
        const start = new Date(project.startDate);
        const end = new Date(project.endDate);
        const months = [];
        const current = new Date(start);
        current.setDate(1); 

        // สร้าง Loop เดือน อย่างน้อย 4 เดือน หรือตามระยะเวลาโครงการ
        while (current <= end || months.length < 4) {
            months.push(new Date(current));
            current.setMonth(current.getMonth() + 1);
        }
        return months;
    };
    const timelineMonths = getMonthRange();

    // เช็คว่า Feature Active ในสัปดาห์นั้นหรือไม่
    // weekIndex: 0=วันที่ 1-7, 1=วันที่ 8-14, 2=วันที่ 15-21, 3=วันที่ 22-สิ้นเดือน
    const isFeatureActiveInWeek = (feature: ProjectFeature, monthDate: Date, weekIndex: number) => {
        const featStart = new Date(feature.start_date);
        const featEnd = new Date(feature.due_date);
        
        // หาวันเริ่มและวันจบของสัปดาห์นั้นๆ ในเดือนนั้น
        const year = monthDate.getFullYear();
        const month = monthDate.getMonth();
        
        let wStartDay = 1 + (weekIndex * 7);
        let wEndDay = (weekIndex + 1) * 7;
        
        // สัปดาห์สุดท้าย (W4) ให้ครอบคลุมถึงวันสิ้นเดือน
        if (weekIndex === 3) {
            wEndDay = new Date(year, month + 1, 0).getDate();
        }

        const weekStartDate = new Date(year, month, wStartDay);
        const weekEndDate = new Date(year, month, wEndDay);

        // ตรวจสอบการทับซ้อน (Intersection)
        // Feature เริ่มก่อนหรือพอดีจบสัปดาห์ AND Feature จบหลังหรือพอดีเริ่มสัปดาห์
        return (featStart <= weekEndDate && featEnd >= weekStartDate);
    };

    // --- CRUD Handlers ---

    // 1. เปิด Modal เพื่อเพิ่ม
    const openAddModal = () => {
        setEditingId(null);
        setFormData({
            title: '', detail: '', next_list: '', status: 'PENDING',
            start_date: project?.startDate ? project.startDate.split('T')[0] : '', 
            due_date: project?.endDate ? project.endDate.split('T')[0] : '', 
            remark: ''
        });
        setIsModalOpen(true);
    };

    // 2. เปิด Modal เพื่อแก้ไข
    const openEditModal = (feat: ProjectFeature) => {
        setEditingId(feat.id);
        setFormData({
            title: feat.title,
            detail: feat.detail,
            next_list: feat.next_list,
            status: feat.status,
            start_date: feat.start_date ? feat.start_date.split('T')[0] : '',
            due_date: feat.due_date ? feat.due_date.split('T')[0] : '',
            remark: feat.remark
        });
        setIsModalOpen(true);
    };

    // 3. บันทึกข้อมูล (Add or Update)
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title || !formData.start_date || !formData.due_date) {
            message.warning('กรุณากรอกข้อมูลสำคัญให้ครบถ้วน');
            return;
        }

        try {
            if (editingId) {
                // Update
                await axios.put(`https://saraban-backend.onrender.com/api/features/${editingId}`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                message.success('แก้ไขแผนงานเรียบร้อยแล้ว');
            } else {
                // Create
                await axios.post(`https://saraban-backend.onrender.com/api/projects/${projectId}/features`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                message.success('เพิ่มแผนงานใหม่เรียบร้อยแล้ว');
            }
            setIsModalOpen(false);
            fetchFeatures();
        } catch (error) {
            message.error('เกิดข้อผิดพลาดในการบันทึก');
        }
    };

    // 4. ลบข้อมูล
    const handleDelete = (id: number) => {
        Modal.confirm({
            title: 'ยืนยันการลบ',
            content: 'คุณต้องการลบแผนงานนี้ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้',
            okText: 'ลบ',
            okType: 'danger',
            cancelText: 'ยกเลิก',
            icon: <AlertCircle className="text-red-500" />,
            onOk: async () => {
                try {
                    await axios.delete(`https://saraban-backend.onrender.com/api/features/${id}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    message.success('ลบข้อมูลเรียบร้อยแล้ว');
                    fetchFeatures();
                } catch (error) {
                    message.error('ไม่สามารถลบข้อมูลได้');
                }
            }
        });
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
                        <p className="text-sm text-gray-500">Code: {project.code}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 shadow-sm font-medium transition-all">
                        <Plus size={16} /> Add Feature
                    </button>
                </div>
            </div>

            <div className="px-6 space-y-6">

                {/* --- 🟢 ส่วนที่ 1: Weekly Gantt Chart --- */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b bg-blue-50/50 flex justify-between items-center">
                        <h2 className="font-bold text-blue-800 flex items-center gap-2">
                            <Calendar size={18} /> WEEKLY PROJECT PLAN
                        </h2>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1000px] border-collapse">
                            <thead>
                                {/* แถวเดือน */}
                                <tr>
                                    <th rowSpan={2} className="w-64 p-3 border-b border-r bg-gray-50 text-left text-xs font-bold text-gray-500 uppercase sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                        PHASE / ACTIVITY
                                    </th>
                                    {timelineMonths.map((date, index) => (
                                        <th key={index} colSpan={4} className="border-b border-r bg-gray-100 text-center text-xs font-bold text-gray-600 py-1">
                                            {date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }).toUpperCase()}
                                        </th>
                                    ))}
                                </tr>
                                {/* แถวสัปดาห์ (4 สัปดาห์ต่อเดือน) */}
                                <tr>
                                    {timelineMonths.map((_, mIndex) => (
                                        [1, 2, 3, 4].map((weekNum) => (
                                            <th key={`${mIndex}-${weekNum}`} className="w-8 border-b border-r border-gray-200 bg-gray-50 text-[10px] text-center text-gray-400 py-1 font-normal">
                                                W{weekNum}
                                            </th>
                                        ))
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {features.length === 0 ? (
                                    <tr>
                                        <td colSpan={(timelineMonths.length * 4) + 1} className="p-8 text-center text-gray-400 italic">
                                            ยังไม่มีข้อมูลแผนงาน
                                        </td>
                                    </tr>
                                ) : (
                                    features.map((feat, i) => (
                                        <tr key={feat.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-3 border-r border-t bg-white sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                                <div className="font-bold text-gray-800 text-xs">{i + 1}. {feat.title}</div>
                                                <div className="text-[10px] text-gray-400 mt-0.5">
                                                    {formatDate(feat.start_date)} - {formatDate(feat.due_date)}
                                                </div>
                                            </td>
                                            {timelineMonths.map((date, mIndex) => (
                                                [0, 1, 2, 3].map((wIndex) => {
                                                    const active = isFeatureActiveInWeek(feat, date, wIndex);
                                                    const isEndOfWeek4 = wIndex === 3; // เพื่อตีเส้นกั้นเดือนให้หนาหน่อย
                                                    return (
                                                        <td 
                                                            key={`${mIndex}-${wIndex}`} 
                                                            className={`border-t p-0 h-10 relative ${isEndOfWeek4 ? 'border-r-2 border-r-gray-200' : 'border-r border-r-gray-100'}`}
                                                        >
                                                            {active && (
                                                                <div 
                                                                    className={`absolute top-1.5 bottom-1.5 left-0 right-0 mx-px rounded-sm shadow-sm
                                                                    ${feat.status === 'COMPLETED' ? 'bg-green-500' : 
                                                                      feat.status === 'IN_PROGRESS' ? 'bg-blue-500' : 'bg-yellow-400'}`}
                                                                    title={`${feat.status}: ${feat.title}`}
                                                                ></div>
                                                            )}
                                                        </td>
                                                    );
                                                })
                                            ))}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* --- 🟢 ส่วนที่ 2: Detail Table (Editable) --- */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-5 border-b flex items-center justify-between">
                        <h2 className="font-bold text-gray-800">รายละเอียดแผนงาน (Plan Details)</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-800 text-white text-xs uppercase tracking-wider">
                                    <th className="p-4 font-medium w-20 text-center">Action</th>
                                    <th className="p-4 font-medium w-40">Title / Feature</th>
                                    <th className="p-4 font-medium min-w-[200px]">Detail</th>
                                    <th className="p-4 font-medium min-w-[150px]">Next List</th>
                                    <th className="p-4 font-medium w-28 text-center">Status</th>
                                    <th className="p-4 font-medium w-32 text-center">Duration</th>
                                    <th className="p-4 font-medium w-32">Remark</th>
                                    <th className="p-4 font-medium w-32">Note By</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {features.map((feat) => (
                                    <tr key={feat.id} className="hover:bg-blue-50 transition-colors">
                                        <td className="p-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => openEditModal(feat)} className="p-1.5 bg-white border rounded hover:bg-blue-50 text-blue-600 transition-colors">
                                                    <Edit2 size={14} />
                                                </button>
                                                <button onClick={() => handleDelete(feat.id)} className="p-1.5 bg-white border rounded hover:bg-red-50 text-red-600 transition-colors">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                        <td className="p-4 font-bold text-slate-800">{feat.title}</td>
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
                                        <td className="p-4 text-center text-xs text-gray-500">
                                            {formatDate(feat.start_date)} <br/> ↓ <br/> {formatDate(feat.due_date)}
                                        </td>
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

            {/* --- 🟢 Modal: Add/Edit Feature --- */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                {editingId ? <Edit2 size={18} /> : <Plus size={18} />}
                                {editingId ? 'แก้ไขแผนงาน' : 'เพิ่มแผนงานใหม่'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-gray-200 rounded-full text-gray-500"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Title / Feature Name <span className="text-red-500">*</span></label>
                                <input type="text" required className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                                    value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="ระบุชื่องาน..." />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date <span className="text-red-500">*</span></label>
                                    <input type="date" required className="w-full border rounded-lg p-2.5 outline-none"
                                        value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Due Date <span className="text-red-500">*</span></label>
                                    <input type="date" required className="w-full border rounded-lg p-2.5 outline-none"
                                        value={formData.due_date} onChange={e => setFormData({...formData, due_date: e.target.value})} />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Detail</label>
                                <textarea className="w-full border rounded-lg p-2.5 outline-none" rows={3}
                                    value={formData.detail} onChange={e => setFormData({...formData, detail: e.target.value})} placeholder="รายละเอียดงาน..." />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Next List (งานถัดไป)</label>
                                    <input type="text" className="w-full border rounded-lg p-2.5 outline-none"
                                        value={formData.next_list} onChange={e => setFormData({...formData, next_list: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                    <select className="w-full border rounded-lg p-2.5 outline-none bg-white"
                                        value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                                        <option value="PENDING">PENDING</option>
                                        <option value="IN_PROGRESS">IN PROGRESS</option>
                                        <option value="COMPLETED">COMPLETED</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Remark</label>
                                <input type="text" className="w-full border rounded-lg p-2.5 outline-none"
                                    value={formData.remark} onChange={e => setFormData({...formData, remark: e.target.value})} placeholder="หมายเหตุ..." />
                            </div>

                            <div className="pt-4 flex justify-end gap-2 border-t mt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors font-medium">ยกเลิก</button>
                                <button type="submit" className="px-5 py-2.5 text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium shadow-lg shadow-blue-200">
                                    <Save size={18} /> {editingId ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูล'}
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