import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useProjects } from '../context/ProjectContext';
import { 
    ArrowLeft, Calendar, User, 
    Plus, Save, X, Edit2, Trash2, 
    MessageSquare, Clock, Send, Printer, 
    FileText, Image as ImageIcon 
} from 'lucide-react';
import { message, Modal, Image as AntImage, ImageProps as AntImageProps } from 'antd'; 
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import buddhistEra from 'dayjs/plugin/buddhistEra';

// ✅ 1. ตั้งค่า Dayjs ให้รองรับ พ.ศ. และภาษาไทย
dayjs.extend(buddhistEra);
dayjs.locale('th');

// --- Component แก้ปัญหา CORS Image ของ Ant Design ---
interface SafeImageProps extends AntImageProps {
    crossOrigin?: "anonymous" | "use-credentials" | "" | undefined;
}
const SafeImage = AntImage as unknown as React.FC<SafeImageProps>;

// --- Interfaces ---
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

interface FeatureNote {
    id: number;
    content: string;
    created_by: string;
    created_at: string;
    attachment: string | null;
    attachment_type: string | null;
}

const ProjectTimelinePage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { token, user } = useAuth();
    const { projects } = useProjects();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // State
    const [project, setProject] = useState<any>(null);
    const [features, setFeatures] = useState<ProjectFeature[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingFeature, setEditingFeature] = useState<ProjectFeature | null>(null);
    const [formData, setFormData] = useState({
        title: '', detail: '', next_list: '', status: 'PENDING',
        start_date: '', due_date: '', remark: ''
    });

    // Notes State
    const [activeFeatureId, setActiveFeatureId] = useState<number | null>(null);
    const [notes, setNotes] = useState<FeatureNote[]>([]);
    const [newNote, setNewNote] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [showNoteModal, setShowNoteModal] = useState(false);

    // --- Fetch Data ---
    useEffect(() => {
        if (id && projects.length > 0) {
            const foundProject = projects.find(p => p.id === Number(id));
            setProject(foundProject);
            fetchFeatures();
        }
    }, [id, projects]);

    const fetchFeatures = async () => {
        try {
            const res = await axios.get(`http://localhost:3001/api/projects/${id}/features`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFeatures(res.data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching features:", error);
            setLoading(false);
        }
    };

    const fetchNotes = async (featureId: number) => {
        try {
            const res = await axios.get(`http://localhost:3001/api/features/${featureId}/notes`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotes(res.data);
            setActiveFeatureId(featureId);
            setShowNoteModal(true);
        } catch (error) {
            console.error("Error fetching notes:", error);
        }
    };

    // --- Handlers: Feature ---
    const handleOpenModal = (feature?: ProjectFeature) => {
        if (feature) {
            setEditingFeature(feature);
            setFormData({
                title: feature.title,
                detail: feature.detail || '',
                next_list: feature.next_list || '',
                status: feature.status,
                start_date: feature.start_date ? dayjs(feature.start_date).format('YYYY-MM-DD') : '',
                due_date: feature.due_date ? dayjs(feature.due_date).format('YYYY-MM-DD') : '',
                remark: feature.remark || ''
            });
        } else {
            setEditingFeature(null);
            setFormData({
                title: '', detail: '', next_list: '', status: 'PENDING',
                start_date: '', due_date: '', remark: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSaveFeature = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingFeature) {
                await axios.put(`http://localhost:3001/api/features/${editingFeature.id}`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                message.success('แก้ไขแผนงานสำเร็จ');
            } else {
                await axios.post(`http://localhost:3001/api/projects/${id}/features`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                message.success('เพิ่มแผนงานสำเร็จ');
            }
            setIsModalOpen(false);
            fetchFeatures();
        } catch (error) {
            message.error('เกิดข้อผิดพลาดในการบันทึก');
        }
    };

    const handleDeleteFeature = async (featureId: number) => {
        if (!window.confirm('คุณต้องการลบแผนงานนี้ใช่หรือไม่?')) return;
        try {
            await axios.delete(`http://localhost:3001/api/features/${featureId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            message.success('ลบเรียบร้อย');
            fetchFeatures();
        } catch (error) {
            message.error('ลบไม่สำเร็จ');
        }
    };

    // --- Handlers: Notes ---
    const handleSendNote = async () => {
        if ((!newNote.trim() && !selectedFile) || !activeFeatureId) return;

        const formDataNote = new FormData();
        formDataNote.append('content', newNote);
        if (selectedFile) formDataNote.append('file', selectedFile);

        try {
            await axios.post(`http://localhost:3001/api/features/${activeFeatureId}/notes`, formDataNote, {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            setNewNote('');
            setSelectedFile(null);
            fetchNotes(activeFeatureId); // Refresh notes
            message.success('บันทึกเรียบร้อย');
        } catch (error) {
            console.error(error);
            message.error('ส่งข้อมูลไม่สำเร็จ');
        }
    };

    const fixUrl = (url: string | null) => {
        if (!url) return '';
        return url.replace('http://localhost:3001', 'http://localhost:3001'); // ปรับตามจริงถ้ามี Domain อื่น
    };

    // --- Status Color Helper ---
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'COMPLETED': return 'bg-green-100 text-green-700 border-green-200';
            case 'IN_PROGRESS': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'PENDING': return 'bg-gray-100 text-gray-600 border-gray-200';
            case 'DELAYED': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-gray-50 text-gray-500';
        }
    };

    if (loading) return <div className="p-10 text-center">กำลังโหลดข้อมูล...</div>;
    if (!project) return <div className="p-10 text-center text-red-500">ไม่พบข้อมูลโครงการ</div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header / Navigation */}
            <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10 print:hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/projects')} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <FileText className="text-blue-600" size={20} />
                                {project.name}
                            </h1>
                            <p className="text-xs text-gray-500 font-mono">{project.code}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">
                            <Printer size={16} /> พิมพ์รายงาน
                        </button>
                        <button onClick={() => handleOpenModal()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm">
                            <Plus size={16} /> เพิ่มแผนงาน
                        </button>
                    </div>
                </div>
            </div>

            {/* Print Header (Show only on print) */}
            <div className="hidden print:block p-8 pb-0 text-center">
                <h1 className="text-2xl font-bold text-gray-900">รายงานความคืบหน้าโครงการ</h1>
                <p className="text-lg text-gray-600 mt-2">{project.name} ({project.code})</p>
                <div className="flex justify-center gap-8 mt-4 text-sm text-gray-500">
                    <span>เจ้าของ: {project.owner}</span>
                    <span>พิมพ์เมื่อ: {dayjs().format('D MMMM BBBB HH:mm')}</span>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                
                {/* Timeline Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200 text-left">
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/4">แผนงาน / กิจกรรม</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/4">รายละเอียด / ผลการดำเนินงาน</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/6">สถานะ / กำหนดการ</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right print:hidden">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {features.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-10 text-center text-gray-400">
                                            ยังไม่มีแผนงานในโครงการนี้
                                        </td>
                                    </tr>
                                ) : (
                                    features.map((feature) => (
                                        <tr key={feature.id} className="hover:bg-gray-50/50 transition-colors group">
                                            <td className="px-6 py-4 align-top">
                                                <div className="font-medium text-gray-900">{feature.title}</div>
                                                <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                                    <User size={12} /> {feature.note_by || 'System'}
                                                </div>
                                                {/* ปุ่มดูบันทึก (Note) */}
                                                <button 
                                                    onClick={() => fetchNotes(feature.id)}
                                                    className="mt-3 text-xs flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium print:hidden"
                                                >
                                                    <MessageSquare size={12} /> บันทึก/รูปภาพ
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 align-top">
                                                <div className="text-sm text-gray-600 whitespace-pre-line">{feature.detail || '-'}</div>
                                                {feature.next_list && (
                                                    <div className="mt-2 p-2 bg-orange-50 rounded border border-orange-100">
                                                        <span className="text-xs font-bold text-orange-700 block mb-1">แผนงานถัดไป:</span>
                                                        <div className="text-xs text-gray-600">{feature.next_list}</div>
                                                    </div>
                                                )}
                                                {feature.remark && (
                                                    <div className="mt-2 text-xs text-red-500 italic">
                                                        * {feature.remark}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 align-top">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(feature.status)}`}>
                                                    {feature.status}
                                                </span>
                                                <div className="mt-3 flex flex-col gap-1 text-xs text-gray-500">
                                                    <div className="flex items-center gap-1">
                                                        <span className="font-medium text-gray-700">เริ่ม:</span>
                                                        {/* ✅ แสดงวันที่แบบ พ.ศ. */}
                                                        {feature.start_date ? dayjs(feature.start_date).format('D MMM BBBB') : '-'}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <span className="font-medium text-gray-700">สิ้นสุด:</span>
                                                        {/* ✅ แสดงวันที่แบบ พ.ศ. */}
                                                        {feature.due_date ? dayjs(feature.due_date).format('D MMM BBBB') : '-'}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 align-top text-right print:hidden">
                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button 
                                                        onClick={() => handleOpenModal(feature)}
                                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="แก้ไข"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteFeature(feature.id)}
                                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="ลบ"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* --- Modal: Add/Edit Feature --- */}
            <Modal
                title={
                    <div className="flex items-center gap-2 text-gray-800">
                        {editingFeature ? <Edit2 size={20} className="text-blue-500"/> : <Plus size={20} className="text-green-500"/>}
                        {editingFeature ? 'แก้ไขแผนงาน' : 'เพิ่มแผนงานใหม่'}
                    </div>
                }
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
                width={600}
                centered
            >
                <form onSubmit={handleSaveFeature} className="space-y-4 pt-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อแผนงาน / กิจกรรม <span className="text-red-500">*</span></label>
                        <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="เช่น ส่งมอบงานงวดที่ 1" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">วันที่เริ่ม</label>
                            <input type="date" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">วันที่สิ้นสุด</label>
                            <input type="date" value={formData.due_date} onChange={e => setFormData({...formData, due_date: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">สถานะ</label>
                        <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                            <option value="PENDING">Pending (รอดำเนินการ)</option>
                            <option value="IN_PROGRESS">In Progress (กำลังดำเนินการ)</option>
                            <option value="COMPLETED">Completed (เสร็จสิ้น)</option>
                            <option value="DELAYED">Delayed (ล่าช้า)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">รายละเอียด</label>
                        <textarea rows={3} value={formData.detail} onChange={e => setFormData({...formData, detail: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none" placeholder="รายละเอียดของงาน..." />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">แผนงานถัดไป</label>
                        <input type="text" value={formData.next_list} onChange={e => setFormData({...formData, next_list: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="สิ่งที่ต้องทำต่อ..." />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ</label>
                        <input type="text" value={formData.remark} onChange={e => setFormData({...formData, remark: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-red-600" placeholder="เช่น ติดปัญหาเรื่องงบประมาณ" />
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">ยกเลิก</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                            <Save size={18} /> บันทึก
                        </button>
                    </div>
                </form>
            </Modal>

            {/* --- Modal: Notes & Images --- */}
            <Modal
                title={<div className="flex items-center gap-2"><MessageSquare size={20} className="text-purple-500"/> บันทึกช่วยจำ / รูปภาพประกอบ</div>}
                open={showNoteModal}
                onCancel={() => setShowNoteModal(false)}
                footer={null}
                width={500}
                centered
            >
                <div className="flex flex-col h-[60vh]">
                    {/* List of Notes */}
                    <div className="flex-1 overflow-y-auto pr-2 space-y-4 mb-4">
                        {notes.length === 0 ? (
                            <div className="text-center text-gray-400 mt-10">ยังไม่มีบันทึก</div>
                        ) : (
                            notes.map(note => (
                                <div key={note.id} className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-bold text-xs text-gray-700">{note.created_by}</span>
                                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                            <Clock size={10} />
                                            {/* ✅ เวลาไทย + พ.ศ. */}
                                            {dayjs(note.created_at).format('D MMM BBBB HH:mm')}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.content}</p>
                                    
                                    {/* แสดงรูปภาพ (ถ้ามี) */}
                                    {note.attachment && (
                                        <div className="mt-2">
                                            <SafeImage 
                                                width={150}
                                                src={fixUrl(note.attachment)}
                                                className="rounded-md border border-gray-200"
                                                crossOrigin="anonymous" // ✅ สำคัญมากสำหรับรูป
                                            />
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    {/* Input Area */}
                    <div className="border-t pt-3">
                        {selectedFile && (
                            <div className="mb-2 flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded text-xs">
                                <ImageIcon size={14} /> {selectedFile.name}
                                <button onClick={() => setSelectedFile(null)} className="ml-auto text-red-500 hover:bg-red-100 rounded-full p-1"><X size={12}/></button>
                            </div>
                        )}
                        <div className="flex gap-2">
                            <button 
                                type="button" 
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                                title="แนบรูปภาพ"
                            >
                                <ImageIcon size={20} />
                            </button>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept="image/*" 
                                onChange={(e) => {
                                    if(e.target.files?.[0]) setSelectedFile(e.target.files[0]);
                                }} 
                            />
                            <input 
                                type="text" 
                                value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendNote()}
                                className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                                placeholder="พิมพ์ข้อความ..."
                            />
                            <button 
                                onClick={handleSendNote} 
                                disabled={!newNote.trim() && !selectedFile}
                                className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>

        </div>
    );
};

export default ProjectTimelinePage;