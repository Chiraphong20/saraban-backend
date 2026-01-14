import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Project } from '../types'; // ตรวจสอบ path นี้ให้ตรงกับโปรเจกต์คุณ
import { 
    ArrowLeft, Plus, Edit2, Trash2, 
    MessageSquare, Clock, User, Save, 
    Calendar, AlertCircle 
} from 'lucide-react';
import { message, Modal, DatePicker, Select, Tooltip, Popconfirm } from 'antd';
import dayjs from 'dayjs';
import 'dayjs/locale/th';

// --- Interfaces ---

interface FeatureNote {
    id: number;
    content: string;
    created_by: string;
    created_at: string;
}

interface ProjectFeature {
    id: number;
    title: string;
    detail: string;
    next_list: string;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED';
    start_date: string;
    due_date: string;
    remark: string; // หมายเหตุทั่วไป (ติดกับ Feature)
}

interface ProjectTimelinePageProps {
    projectId: number;
    onBack: () => void;
}

// --- ประกาศตัวแปรย่อยของ Ant Design ---
const { RangePicker } = DatePicker;
const { Option } = Select; // ✅ บรรทัดนี้สำคัญ แก้สีแดงที่คุณเจอ

const ProjectTimelinePage: React.FC<ProjectTimelinePageProps> = ({ projectId, onBack }) => {
    const { token, user } = useAuth();
    
    // --- Data States ---
    const [project, setProject] = useState<Project | null>(null);
    const [features, setFeatures] = useState<ProjectFeature[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // --- Edit/Create Modal States (Feature & Remark) ---
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingFeature, setEditingFeature] = useState<ProjectFeature | null>(null);
    const [formData, setFormData] = useState({
        title: '',
        detail: '',
        status: 'PENDING',
        start_date: '',
        due_date: '',
        remark: ''
    });

    // --- Note Modal States (Meeting Notes) ---
    const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
    const [currentFeatureForNote, setCurrentFeatureForNote] = useState<ProjectFeature | null>(null);
    const [featureNotes, setFeatureNotes] = useState<FeatureNote[]>([]);
    const [newMeetingNote, setNewMeetingNote] = useState('');
    const [isNoteLoading, setIsNoteLoading] = useState(false);

    // --- Initial Fetch ---
    useEffect(() => {
        if (projectId && token) {
            fetchProjectDetails();
            fetchFeatures();
        }
    }, [projectId, token]);

    const fetchProjectDetails = async () => {
        try {
            const res = await axios.get(`https://saraban-backend.onrender.com/api/projects`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const found = res.data.find((p: Project) => p.id === projectId);
            if (found) setProject(found);
        } catch (error) { console.error("Err fetch project", error); }
    };

    const fetchFeatures = async () => {
        setIsLoading(true);
        try {
            const res = await axios.get(`https://saraban-backend.onrender.com/api/projects/${projectId}/features`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFeatures(res.data);
        } catch (error) { 
            console.error("Err fetch features", error); 
        } finally {
            setIsLoading(false);
        }
    };

    // ==========================================
    // 1. Manage Feature & Remark (Edit Modal)
    // ==========================================

    const openAddEditModal = (feature: ProjectFeature | null = null) => {
        setEditingFeature(feature);
        if (feature) {
            setFormData({
                title: feature.title,
                detail: feature.detail || '',
                status: feature.status as string,
                start_date: feature.start_date,
                due_date: feature.due_date,
                remark: feature.remark || '' // Load Remark เดิมมาโชว์
            });
        } else {
            setFormData({
                title: '',
                detail: '',
                status: 'PENDING',
                start_date: dayjs().format('YYYY-MM-DD'),
                due_date: dayjs().add(7, 'day').format('YYYY-MM-DD'),
                remark: ''
            });
        }
        setIsEditModalOpen(true);
    };

    const handleSaveFeature = async () => {
        if (!formData.title || !formData.start_date || !formData.due_date) {
            message.error("กรุณากรอกข้อมูลสำคัญให้ครบ (ชื่อ, วันที่)");
            return;
        }

        try {
            if (editingFeature) {
                // Update
                await axios.put(`https://saraban-backend.onrender.com/api/features/${editingFeature.id}`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                message.success("อัปเดตแผนงานเรียบร้อย");
            } else {
                // Create
                await axios.post(`https://saraban-backend.onrender.com/api/projects/${projectId}/features`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                message.success("สร้างแผนงานใหม่เรียบร้อย");
            }
            setIsEditModalOpen(false);
            fetchFeatures();
        } catch (error) {
            message.error("เกิดข้อผิดพลาดในการบันทึก");
        }
    };

    const handleDeleteFeature = async (id: number) => {
        try {
            await axios.delete(`https://saraban-backend.onrender.com/api/features/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            message.success("ลบแผนงานเรียบร้อย");
            fetchFeatures();
        } catch (error) {
            message.error("ลบไม่สำเร็จ");
        }
    };

    // ==========================================
    // 2. Manage Meeting Notes (Note Modal)
    // ==========================================

    const openNoteModal = async (feature: ProjectFeature) => {
        setCurrentFeatureForNote(feature);
        setIsNoteModalOpen(true);
        setIsNoteLoading(true);
        try {
            const res = await axios.get(`https://saraban-backend.onrender.com/api/features/${feature.id}/notes`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFeatureNotes(res.data);
        } catch (error) {
            console.error(error);
            message.error("ไม่สามารถโหลดบันทึกการประชุมได้");
        } finally {
            setIsNoteLoading(false);
        }
    };

    const handleSendNote = async () => {
        if (!newMeetingNote.trim() || !currentFeatureForNote) return;

        try {
            const res = await axios.post(`https://saraban-backend.onrender.com/api/features/${currentFeatureForNote.id}/notes`, 
                { content: newMeetingNote }, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            const newNoteObj: FeatureNote = {
                id: res.data.id || Date.now(),
                content: newMeetingNote,
                created_by: user?.username || 'Me',
                created_at: new Date().toISOString()
            };

            setFeatureNotes([newNoteObj, ...featureNotes]);
            setNewMeetingNote('');
        } catch (error) {
            message.error("ส่งข้อความไม่สำเร็จ");
        }
    };

    // ==========================================
    // UI Helpers
    // ==========================================

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'COMPLETED': return 'bg-green-100 text-green-700 border-green-200';
            case 'IN_PROGRESS': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'DELAYED': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-gray-100 text-gray-600 border-gray-200';
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20 animate-fade-in">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-white border-b shadow-sm px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <ArrowLeft size={20} className="text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">{project?.name || 'Loading...'}</h1>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Calendar size={12}/> {project?.start_date ? dayjs(project.start_date).format('DD MMM YYYY') : '-'}
                        </p>
                    </div>
                </div>
                <button 
                    onClick={() => openAddEditModal(null)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow-md transition-all active:scale-95"
                >
                    <Plus size={18} />
                    <span>เพิ่มแผนงาน</span>
                </button>
            </div>

            <div className="max-w-7xl mx-auto p-6 space-y-8">
                
                {/* Feature Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-5 border-b bg-gray-50 flex justify-between items-center">
                        <h2 className="font-bold text-gray-700 flex items-center gap-2">
                            <Clock size={18}/> ไทม์ไลน์และการดำเนินงาน
                        </h2>
                    </div>

                    {isLoading ? (
                        <div className="p-10 text-center text-gray-400">Loading features...</div>
                    ) : features.length === 0 ? (
                        <div className="p-10 text-center text-gray-400">ยังไม่มีแผนงาน กดปุ่ม "เพิ่มแผนงาน" ด้านบน</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-800 text-white text-xs uppercase tracking-wider">
                                    <tr>
                                        <th className="p-4 rounded-tl-lg">Feature / Task</th>
                                        <th className="p-4">ระยะเวลา</th>
                                        <th className="p-4 text-center">สถานะ</th>
                                        <th className="p-4 w-1/4">Remark (หมายเหตุ)</th>
                                        <th className="p-4 text-center">Meeting Notes</th>
                                        <th className="p-4 text-center rounded-tr-lg">จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm divide-y divide-gray-100">
                                    {features.map((item) => (
                                        <tr key={item.id} className="hover:bg-blue-50 transition-colors group">
                                            {/* Feature Info */}
                                            <td className="p-4">
                                                <div className="font-bold text-gray-800">{item.title}</div>
                                                <div className="text-xs text-gray-500 mt-1 truncate max-w-[200px]">{item.detail}</div>
                                            </td>
                                            <td className="p-4 whitespace-nowrap text-gray-600 font-medium">
                                                {dayjs(item.start_date).format('DD/MM')} - {dayjs(item.due_date).format('DD/MM')}
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(item.status)}`}>
                                                    {item.status}
                                                </span>
                                            </td>
                                            
                                            {/* Remark (Show only) */}
                                            <td className="p-4">
                                                {item.remark ? (
                                                    <div className="text-gray-600 bg-yellow-50 border border-yellow-100 p-2 rounded text-xs italic">
                                                        "{item.remark}"
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-300 text-xs">- ไม่มีหมายเหตุ -</span>
                                                )}
                                            </td>

                                            {/* Note Button */}
                                            <td className="p-4 text-center">
                                                <button 
                                                    onClick={() => openNoteModal(item)}
                                                    className="relative inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-gray-600 hover:text-blue-600 hover:border-blue-400 hover:shadow-sm transition-all"
                                                >
                                                    <MessageSquare size={16} />
                                                    <span className="text-xs font-semibold">บันทึกประชุม</span>
                                                </button>
                                            </td>

                                            {/* Actions */}
                                            <td className="p-4 text-center">
                                                <div className="flex justify-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                                    <Tooltip title="แก้ไขแผนงาน / Remark">
                                                        <button 
                                                            onClick={() => openAddEditModal(item)}
                                                            className="p-2 bg-gray-100 hover:bg-blue-600 hover:text-white rounded-lg transition-colors"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                    </Tooltip>
                                                    
                                                    <Popconfirm
                                                        title="ยืนยันการลบ?"
                                                        description="ข้อมูลและบันทึกทั้งหมดของแผนงานนี้จะหายไป"
                                                        onConfirm={() => handleDeleteFeature(item.id)}
                                                        okText="ลบ"
                                                        cancelText="ยกเลิก"
                                                        okButtonProps={{ danger: true }}
                                                    >
                                                        <button className="p-2 bg-gray-100 hover:bg-red-500 hover:text-white rounded-lg transition-colors">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </Popconfirm>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal: Add/Edit Feature & Remark */}
            <Modal
                title={editingFeature ? "แก้ไขแผนงาน" : "เพิ่มแผนงานใหม่"}
                open={isEditModalOpen}
                onCancel={() => setIsEditModalOpen(false)}
                footer={null}
                centered
            >
                <div className="space-y-4 pt-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ Feature / งาน</label>
                        <input 
                            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            value={formData.title}
                            onChange={(e) => setFormData({...formData, title: e.target.value})}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">วันที่เริ่ม - สิ้นสุด</label>
                            <RangePicker 
                                className="w-full"
                                value={formData.start_date ? [dayjs(formData.start_date), dayjs(formData.due_date)] : null}
                                onChange={(dates) => {
                                    if(dates) {
                                        setFormData({
                                            ...formData,
                                            start_date: dates[0]?.toISOString() || '',
                                            due_date: dates[1]?.toISOString() || ''
                                        });
                                    }
                                }}
                            />
                        </div>
                   <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 mb-1">สถานะ</label>
    <Select 
        className="w-full"
        value={formData.status}
        onChange={(val) => setFormData({...formData, status: val})}
        // ✅ ใช้วิธีนี้แทนครับ (หายแดงแน่นอน 100%)
        options={[
            { value: 'PENDING', label: 'รอดำเนินการ' },
            { value: 'IN_PROGRESS', label: 'กำลังทำ' },
            { value: 'COMPLETED', label: 'เสร็จสิ้น' },
            { value: 'DELAYED', label: 'ล่าช้า' },
        ]}
    />
</div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">รายละเอียดเพิ่มเติม</label>
                        <textarea 
                            className="w-full border rounded-lg px-3 py-2 h-20 resize-none focus:ring-2 focus:ring-blue-500 outline-none"
                            value={formData.detail}
                            onChange={(e) => setFormData({...formData, detail: e.target.value})}
                        />
                    </div>

                    {/* Remark Input */}
                    <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                        <label className="block text-sm font-bold text-yellow-800 mb-1 flex items-center gap-1">
                            <AlertCircle size={14}/> Remark / หมายเหตุ
                        </label>
                        <input 
                            className="w-full border-yellow-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-yellow-500 outline-none bg-white"
                            placeholder="เช่น รอลายเซ็น, เลื่อนประชุม..."
                            value={formData.remark}
                            onChange={(e) => setFormData({...formData, remark: e.target.value})}
                        />
                    </div>

                    <button 
                        onClick={handleSaveFeature}
                        className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 font-semibold shadow-md mt-2"
                    >
                        บันทึกข้อมูล
                    </button>
                </div>
            </Modal>

            {/* Modal: Meeting Notes */}
            <Modal
                title={
                    <div className="flex items-center gap-2 text-gray-700">
                        <MessageSquare size={20} className="text-yellow-600"/>
                        <span>บันทึกการประชุม / Notes: </span>
                        <span className="font-bold text-black">{currentFeatureForNote?.title}</span>
                    </div>
                }
                open={isNoteModalOpen}
                onCancel={() => setIsNoteModalOpen(false)}
                footer={null}
                centered
                width={500}
            >
                <div className="flex flex-col h-[450px]">
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 rounded-lg border mb-4">
                        {isNoteLoading ? (
                            <div className="text-center text-gray-400 mt-20">Loading notes...</div>
                        ) : featureNotes.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400 opacity-60">
                                <MessageSquare size={40} />
                                <p className="mt-2 text-sm">ยังไม่มีการจดบันทึก</p>
                            </div>
                        ) : (
                            featureNotes.map((note) => (
                                <div key={note.id} className="flex flex-col animate-slide-up">
                                    <div className="bg-white p-3 rounded-t-lg rounded-br-lg shadow-sm border border-gray-100 max-w-[90%] self-start">
                                        <p className="text-gray-800 text-sm whitespace-pre-line">{note.content}</p>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1 ml-1 text-[10px] text-gray-400">
                                        <span className="flex items-center gap-0.5 font-medium text-gray-500"><User size={10}/> {note.created_by}</span>
                                        <span>•</span>
                                        <span className="flex items-center gap-0.5"><Clock size={10}/> {dayjs(note.created_at).format('DD MMM YY HH:mm')}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="flex gap-2 items-end">
                        <textarea 
                            className="flex-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-yellow-400 outline-none resize-none h-[50px]"
                            placeholder="พิมพ์บันทึกการประชุม..."
                            value={newMeetingNote}
                            onChange={(e) => setNewMeetingNote(e.target.value)}
                            onKeyDown={(e) => {
                                if(e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendNote();
                                }
                            }}
                        />
                        <button 
                            onClick={handleSendNote} 
                            disabled={!newMeetingNote.trim()}
                            className="bg-yellow-500 text-white p-3 rounded-lg hover:bg-yellow-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-sm"
                        >
                            <Save size={20} />
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ProjectTimelinePage;