import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useProjects } from '../context/ProjectContext';
import { Project } from '../types';
import { 
    ArrowLeft, Calendar, User, 
    Plus, Save, X, Edit2, Trash2, AlertCircle,
    MessageSquare, Clock, Send, Printer, FileDown, 
    FileText, Paperclip, Image as ImageIcon, MoreHorizontal
} from 'lucide-react';
import { message, Modal, Dropdown, MenuProps } from 'antd'; 
import dayjs from 'dayjs';
import 'dayjs/locale/th';

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
    attachment?: string;       // URL ของไฟล์แนบ
    attachment_type?: string;  // ประเภทไฟล์
    attachment_name?: string;  // ชื่อไฟล์เดิม
}

const ProjectTimelinePage: React.FC = () => {
    // 2. ✅ รับค่า ID จาก URL และสร้างฟังก์ชันเปลี่ยนหน้า
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    
    // แปลง id จาก string เป็น number
    const projectId = Number(id);

    // สร้างฟังก์ชัน onBack ให้กลับไปหน้า Project List
    const onBack = () => {
        navigate('/projects');
    };

    const { token, user } = useAuth();
    const { projects } = useProjects();
    const [project, setProject] = useState<Project | null>(null);
    const [features, setFeatures] = useState<ProjectFeature[]>([]); 
    // const [loading, setLoading] = useState(true); 

    // --- Modal States (Feature) ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null); 
    const [formData, setFormData] = useState({
        title: '', detail: '', next_list: '', status: 'PENDING',
        start_date: '', due_date: '', remark: ''
    });

    // --- Note Modal States ---
    const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
    const [currentFeatureForNote, setCurrentFeatureForNote] = useState<ProjectFeature | null>(null);
    const [featureNotes, setFeatureNotes] = useState<FeatureNote[]>([]); 
    const [newMeetingNote, setNewMeetingNote] = useState('');
    const [isNoteLoading, setIsNoteLoading] = useState(false);

    // --- File Attachment States ---
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initial Data Fetching
    useEffect(() => {
        const foundProject = projects.find(p => p.id === projectId);
        if (foundProject) setProject(foundProject);
        fetchFeatures();
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
        }
    };

    // --- 🌟 Logic: Dynamic Timeline ---
    const timelineMonths = useMemo(() => {
        if (!project) return [];
        let minDate = project.startDate ? dayjs(project.startDate) : dayjs();
        let maxDate = project.endDate ? dayjs(project.endDate) : dayjs().add(3, 'month');

        if (features.length > 0) {
            features.forEach(feat => {
                const featStart = dayjs(feat.start_date);
                const featEnd = dayjs(feat.due_date);
                if (featStart.isValid() && featStart.isBefore(minDate)) minDate = featStart;
                if (featEnd.isValid() && featEnd.isAfter(maxDate)) maxDate = featEnd;
            });
        }

        let current = minDate.startOf('month');
        const endLoop = maxDate.endOf('month');
        const months = [];

        while (current.isBefore(endLoop) || current.isSame(endLoop, 'month') || months.length < 4) {
            months.push(current.toDate());
            current = current.add(1, 'month');
        }
        return months;
    }, [project, features]);

    const isFeatureActiveInWeek = (feature: ProjectFeature, monthDate: Date, weekIndex: number) => {
        const featStart = new Date(feature.start_date);
        const featEnd = new Date(feature.due_date);
        const year = monthDate.getFullYear();
        const month = monthDate.getMonth();
        let wStartDay = 1 + (weekIndex * 7);
        let wEndDay = (weekIndex + 1) * 7;
        if (weekIndex === 3) wEndDay = new Date(year, month + 1, 0).getDate();
        const weekStartDate = new Date(year, month, wStartDay);
        const weekEndDate = new Date(year, month, wEndDay);
        return (featStart <= weekEndDate && featEnd >= weekStartDate);
    };

    // --- CRUD Handlers (Feature) ---
    const openAddModal = () => {
        setEditingId(null);
        setFormData({
            title: '', detail: '', next_list: '', status: 'PENDING',
            start_date: dayjs().format('YYYY-MM-DD'), 
            due_date: dayjs().add(7, 'day').format('YYYY-MM-DD'), 
            remark: ''
        });
        setIsModalOpen(true);
    };

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

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title || !formData.start_date || !formData.due_date) {
            message.warning('กรุณากรอกข้อมูลสำคัญให้ครบถ้วน');
            return;
        }
        try {
            if (editingId) {
                await axios.put(`https://saraban-backend.onrender.com/api/features/${editingId}`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                message.success('แก้ไขแผนงานเรียบร้อยแล้ว');
            } else {
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

    const handleDelete = (id: number) => {
        Modal.confirm({
            title: 'ยืนยันการลบ',
            content: 'คุณต้องการลบแผนงานนี้ใช่หรือไม่?',
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

    // --- 📁 File Attachment Handlers ---
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 5 * 1024 * 1024) { // Limit 5MB
                message.error('ไฟล์มีขนาดใหญ่เกิน 5MB');
                return;
            }
            setSelectedFile(file);
            // Create preview if image
            if (file.type.startsWith('image/')) {
                const url = URL.createObjectURL(file);
                setPreviewUrl(url);
            } else {
                setPreviewUrl(null);
            }
        }
    };

    const clearSelectedFile = () => {
        setSelectedFile(null);
        setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // --- Notes Handlers ---
    const openNoteModal = async (feature: ProjectFeature) => {
        setCurrentFeatureForNote(feature);
        setIsNoteModalOpen(true);
        setIsNoteLoading(true);
        clearSelectedFile(); // Clear file when open
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
        if ((!newMeetingNote.trim() && !selectedFile) || !currentFeatureForNote) return;
        
        const hideLoading = message.loading('กำลังส่งข้อมูล...', 0);

        try {
            // ✅ ใช้ FormData เพื่อส่งไฟล์
            const formData = new FormData();
            formData.append('content', newMeetingNote);
            if (selectedFile) {
                formData.append('file', selectedFile); 
            }

            const res = await axios.post(`https://saraban-backend.onrender.com/api/features/${currentFeatureForNote.id}/notes`, 
                formData, 
                { 
                    headers: { 
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data' // Required for file upload
                    } 
                }
            );

            // Mock response update UI
            const newNoteObj: FeatureNote = {
                id: res.data.id || Date.now(),
                content: newMeetingNote,
                created_by: user?.fullname || 'Me',
                created_at: new Date().toISOString(),
                attachment: res.data.attachment,
                attachment_type: res.data.attachment_type || (selectedFile ? selectedFile.type : undefined)
            };
            
            setFeatureNotes([newNoteObj, ...featureNotes]); 
            setNewMeetingNote('');
            clearSelectedFile();
            hideLoading();
        } catch (error) {
            hideLoading();
            message.error("ส่งข้อความไม่สำเร็จ");
        }
    };

    // --- 🖨️ Export Handlers ---
    
    // 1. Export CSV
    const handleExportCSV = () => {
        if (!project || features.length === 0) {
            message.warning("ไม่มีข้อมูลให้ Export");
            return;
        }
        const headers = ["ID,Title,Detail,Next List,Status,Start Date,Due Date,Remark"];
        const rows = features.map(f => {
            const clean = (text: string) => `"${(text || '').replace(/"/g, '""')}"`;
            return [
                f.id, clean(f.title), clean(f.detail), clean(f.next_list), f.status,
                dayjs(f.start_date).format('YYYY-MM-DD'), dayjs(f.due_date).format('YYYY-MM-DD'), clean(f.remark)
            ].join(",");
        });
        const csvContent = "data:text/csv;charset=utf-8," + "\uFEFF" + [headers, ...rows].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Project_Report_${project.code}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // 2. Export PDF
    const handleExportPDF = async () => {
        if (!featureNotes || featureNotes.length === 0) {
            message.warning("ไม่มีบันทึกข้อความให้ดาวน์โหลด");
            return;
        }

        const element = document.getElementById('pdf-template-content');
        if (!element) return;

        let html2pdf;
        try {
            // Dynamic import to avoid SSR/Build issues
            html2pdf = (await import('html2pdf.js')).default;
        } catch (e) {
            message.error("กรุณาติดตั้ง library: npm install html2pdf.js");
            return;
        }

        const opt = {
            margin: 10,
            filename: `Notes_${currentFeatureForNote?.title}_${dayjs().format('YYYYMMDD')}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true }, // useCORS สำคัญสำหรับรูปภาพ
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        const hideLoading = message.loading('กำลังสร้างไฟล์ PDF...', 0);
        
        html2pdf().set(opt).from(element).save().then(() => {
            hideLoading();
            message.success('ดาวน์โหลด PDF สำเร็จ');
        }).catch((err: any) => {
            hideLoading();
            console.error(err);
            message.error('เกิดข้อผิดพลาดในการสร้าง PDF');
        });
    };

    const handlePrint = () => { window.print(); };

    const exportMenu: MenuProps['items'] = [
        { key: '1', label: 'พิมพ์ / บันทึกหน้าจอเป็น PDF', icon: <Printer size={16} />, onClick: handlePrint },
        { key: '2', label: 'ดาวน์โหลดตารางเป็น Excel (CSV)', icon: <FileDown size={16} />, onClick: handleExportCSV }
    ];

    const formatDate = (dateStr: string) => {
        if (!dateStr) return "-";
        return new Date(dateStr).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: '2-digit' });
    };

    // --- Helper for Status Color ---
    const getStatusColorClass = (status: string) => {
        switch (status) {
            case 'COMPLETED': return 'bg-green-100 text-green-700 border-green-200';
            case 'IN_PROGRESS': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'IDEA': return 'bg-purple-100 text-purple-700 border-purple-200';
            default: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
        }
    };

    if (!project) return <div className="p-10 text-center">กำลังโหลดข้อมูลโครงการ...</div>;

    return (
        <div className="space-y-6 animate-fade-in pb-20 bg-gray-50 min-h-screen relative print:bg-white print:p-0 print:space-y-2">
            
            {/* Header: Responsive Flex */}
            <div className="bg-white border-b px-4 md:px-6 py-4 flex flex-col md:flex-row items-start md:items-center justify-between shadow-sm gap-4 print:border-none print:shadow-none print:px-0">
                <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto">
                    <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 print:hidden shrink-0">
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-lg md:text-xl font-bold text-gray-800 flex flex-wrap items-center gap-2">
                            {project.name}
                            <span className={`px-2 py-0.5 rounded text-xs border print:border-black print:text-black print:bg-transparent bg-blue-100 text-blue-700 border-blue-200`}>
                                {project.status}
                            </span>
                        </h1>
                        <p className="text-xs md:text-sm text-gray-500 print:text-black mt-1">
                            Code: {project.code} 
                            <span className="hidden sm:inline"> | Timeline: {dayjs(timelineMonths[0]).format('MMM YY')} - {dayjs(timelineMonths[timelineMonths.length-1]).format('MMM YY')}</span>
                        </p>
                    </div>
                </div>

                <div className="flex gap-2 w-full md:w-auto justify-end print:hidden">
                    <Dropdown menu={{ items: exportMenu }} placement="bottomRight">
                        <button className="flex items-center gap-2 px-3 md:px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 shadow-sm font-medium transition-all">
                            <FileDown size={16} /> <span className="hidden sm:inline">Export</span>
                        </button>
                    </Dropdown>
                    <button onClick={openAddModal} className="flex items-center gap-2 px-3 md:px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 shadow-sm font-medium transition-all">
                        <Plus size={16} /> <span className="hidden sm:inline">Add Feature</span><span className="inline sm:hidden">Add</span>
                    </button>
                </div>
            </div>

            <div className="px-4 md:px-6 space-y-6 print:px-0 print:space-y-4">
                {/* Gantt Chart Section: Scrollable on Mobile */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden print:shadow-none print:border-black">
                    <div className="p-4 border-b bg-blue-50/50 flex justify-between items-center print:bg-gray-100 print:border-black">
                        <h2 className="font-bold text-blue-800 flex items-center gap-2 print:text-black text-sm md:text-base">
                            <Calendar size={18} /> PROJECT PLAN ({timelineMonths.length} Months)
                        </h2>
                    </div>
                    <div className="overflow-x-auto print:overflow-visible">
                        <table className="w-full border-collapse" style={{ minWidth: `${Math.max(800, timelineMonths.length * 120)}px` }}> 
                            <thead>
                                <tr>
                                    <th rowSpan={2} className="w-48 md:w-64 p-3 border-b border-r bg-gray-50 text-left text-xs font-bold text-gray-500 uppercase sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] print:shadow-none print:static print:border-black print:text-black">
                                        PHASE / ACTIVITY
                                    </th>
                                    {timelineMonths.map((date, index) => (
                                        <th key={index} colSpan={4} className="border-b border-r bg-gray-100 text-center text-xs font-bold text-gray-600 py-1 print:border-black print:text-black">
                                            {date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }).toUpperCase()}
                                        </th>
                                    ))}
                                </tr>
                                <tr>
                                    {timelineMonths.map((_, mIndex) => (
                                        [1, 2, 3, 4].map((weekNum) => (
                                            <th key={`${mIndex}-${weekNum}`} className="w-8 border-b border-r border-gray-200 bg-gray-50 text-[10px] text-center text-gray-400 py-1 font-normal print:border-black print:text-black">
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
                                        <tr key={feat.id} className="hover:bg-gray-50 transition-colors print:break-inside-avoid">
                                            <td className="p-3 border-r border-t bg-white sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] print:shadow-none print:static print:border-black">
                                                <div className="font-bold text-gray-800 text-xs print:text-black line-clamp-2">{i + 1}. {feat.title}</div>
                                                <div className="text-[10px] text-gray-400 mt-0.5 print:text-gray-600 hidden md:block">
                                                    {formatDate(feat.start_date)} - {formatDate(feat.due_date)}
                                                </div>
                                            </td>
                                            {timelineMonths.map((date, mIndex) => (
                                                [0, 1, 2, 3].map((wIndex) => {
                                                    const active = isFeatureActiveInWeek(feat, date, wIndex);
                                                    const isEndOfWeek4 = wIndex === 3;
                                                    return (
                                                        <td key={`${mIndex}-${wIndex}`} className={`border-t p-0 h-10 relative ${isEndOfWeek4 ? 'border-r-2 border-r-gray-200' : 'border-r border-r-gray-100'} print:border-black`}>
                                                            {active && (
                                                                <div 
                                                                    className={`absolute top-1.5 bottom-1.5 left-0 right-0 mx-px rounded-sm shadow-sm print:print-color-adjust-exact ${
                                                                        feat.status === 'COMPLETED' ? 'bg-green-500' : 
                                                                        feat.status === 'IN_PROGRESS' ? 'bg-blue-500' : 
                                                                        feat.status === 'IDEA' ? 'bg-purple-500' : 
                                                                        'bg-yellow-400'
                                                                    }`} 
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

                {/* Detail Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden print:shadow-none print:border-black">
                    <div className="p-4 md:p-5 border-b flex items-center justify-between print:border-black print:bg-gray-100">
                        <h2 className="font-bold text-gray-800 print:text-black text-sm md:text-base">รายละเอียดแผนงาน (Plan Details)</h2>
                    </div>

                    {/* ✅ Responsive: Mobile Card View (Hidden on Desktop) */}
                    <div className="block md:hidden bg-gray-50 p-4 space-y-4">
                        {features.map((feat) => (
                            <div key={feat.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-gray-800 text-lg">{feat.title}</h3>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusColorClass(feat.status)}`}>
                                        {feat.status}
                                    </span>
                                </div>
                                <div className="text-sm text-gray-600 mb-2">
                                    <span className="font-semibold">Detail:</span> {feat.detail || '-'}
                                </div>
                                <div className="text-xs text-gray-500 mb-3 flex items-center gap-2">
                                    <Calendar size={12} />
                                    {formatDate(feat.start_date)} - {formatDate(feat.due_date)}
                                </div>
                                
                                {feat.next_list && (
                                    <div className="text-xs bg-blue-50 p-2 rounded mb-2 border border-blue-100 text-blue-800">
                                        <strong>Next:</strong> {feat.next_list}
                                    </div>
                                )}
                                {feat.remark && (
                                    <div className="text-xs text-gray-400 italic mb-3">
                                        Note: {feat.remark}
                                    </div>
                                )}

                                <div className="flex items-center justify-end gap-2 border-t pt-3 mt-2">
                                    <button onClick={() => openNoteModal(feat)} className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded hover:bg-yellow-100 text-xs font-medium">
                                        <MessageSquare size={14} /> Note
                                    </button>
                                    <button onClick={() => openEditModal(feat)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded border border-gray-200">
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(feat.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded border border-gray-200">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* ✅ Responsive: Desktop Table View (Hidden on Mobile) */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-800 text-white text-xs uppercase tracking-wider print:bg-gray-300 print:text-black print:print-color-adjust-exact">
                                    <th className="p-4 font-medium w-20 text-center print:hidden">Action</th>
                                    <th className="p-4 font-medium w-40">Title / Feature</th>
                                    <th className="p-4 font-medium min-w-[200px]">Detail</th>
                                    <th className="p-4 font-medium min-w-[150px]">Next List</th>
                                    <th className="p-4 font-medium w-28 text-center">Status</th>
                                    <th className="p-4 font-medium w-32 text-center">Duration</th>
                                    <th className="p-4 font-medium w-32">Remark</th>
                                    <th className="p-4 font-medium w-24 text-center print:hidden">Notes</th> 
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm print:divide-black">
                                {features.map((feat) => (
                                    <tr key={feat.id} className="hover:bg-blue-50 transition-colors print:break-inside-avoid">
                                        <td className="p-4 text-center print:hidden">
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => openEditModal(feat)} className="p-1.5 bg-white border rounded hover:bg-blue-50 text-blue-600 transition-colors"><Edit2 size={14} /></button>
                                                <button onClick={() => handleDelete(feat.id)} className="p-1.5 bg-white border rounded hover:bg-red-50 text-red-600 transition-colors"><Trash2 size={14} /></button>
                                            </div>
                                        </td>
                                        <td className="p-4 font-bold text-slate-800 print:text-black">{feat.title}</td>
                                        <td className="p-4 text-gray-600 print:text-black">{feat.detail || '-'}</td>
                                        <td className="p-4 text-gray-600 print:text-black">{feat.next_list || '-'}</td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2 py-1 rounded text-xs font-bold border print:border-black print:text-black ${getStatusColorClass(feat.status)}`}>{feat.status}</span>
                                        </td>
                                        <td className="p-4 text-center text-xs text-gray-500 print:text-black">{formatDate(feat.start_date)} <br/> ↓ <br/> {formatDate(feat.due_date)}</td>
                                        <td className="p-4 text-gray-500 italic print:text-black">{feat.remark || '-'}</td>
                                        <td className="p-4 text-center print:hidden">
                                            <button onClick={() => openNoteModal(feat)} className="inline-flex items-center gap-1 px-3 py-1.5 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-colors shadow-sm">
                                                <MessageSquare size={14} /><span className="text-xs font-semibold">Note</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal: Add/Edit Feature */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in print:hidden">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50 shrink-0">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                {editingId ? <Edit2 size={18} /> : <Plus size={18} />}
                                {editingId ? 'แก้ไขแผนงาน' : 'เพิ่มแผนงานใหม่'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-gray-200 rounded-full text-gray-500"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Title / Feature Name <span className="text-red-500">*</span></label>
                                <input type="text" required className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                                    value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="ระบุชื่องาน..." />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Next List (งานถัดไป)</label>
                                    <input type="text" className="w-full border rounded-lg p-2.5 outline-none"
                                        value={formData.next_list} onChange={e => setFormData({...formData, next_list: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                    <select className="w-full border rounded-lg p-2.5 outline-none bg-white"
                                        value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                                        <option value="IDEA">IDEA</option>
                                        <option value="PENDING">PENDING</option>
                                        <option value="IN_PROGRESS">IN PROGRESS</option>
                                        <option value="COMPLETED">COMPLETED</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Remark</label>
                                <input type="text" className="w-full border rounded-lg p-2.5 outline-none"
                                    value={formData.remark} onChange={e => setFormData({...formData, remark: e.target.value})} />
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">ยกเลิก</button>
                                <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md">บันทึก</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Note Modal */}
            {isNoteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in print:hidden">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden">
                        {/* Header */}
                        <div className="p-4 border-b bg-yellow-50 flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="font-bold text-yellow-800 flex items-center gap-2">
                                    <MessageSquare size={18} /> บันทึกข้อความ / ประชุม
                                </h3>
                                <p className="text-xs text-yellow-600 mt-1">
                                    Feature: {currentFeatureForNote?.title}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={handleExportPDF} className="p-2 hover:bg-yellow-200 rounded text-yellow-700" title="Download PDF">
                                    <FileDown size={18} />
                                </button>
                                <button onClick={() => setIsNoteModalOpen(false)} className="p-2 hover:bg-yellow-200 rounded text-yellow-700">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Note List (Chat Style) */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50" id="pdf-template-content">
                            {/* สำหรับ PDF Header (ซ่อนในหน้าจอปกติ แสดงเฉพาะตอน gen pdf) */}
                            <div className="hidden print-pdf-header text-center mb-6">
                                <h1 className="text-2xl font-bold">{project.name}</h1>
                                <h2 className="text-xl">บันทึกการประชุม: {currentFeatureForNote?.title}</h2>
                                <p className="text-sm text-gray-500">พิมพ์เมื่อ: {dayjs().format('DD/MM/YYYY HH:mm')}</p>
                                <hr className="my-4"/>
                            </div>

                            {isNoteLoading ? (
                                <div className="text-center py-10 text-gray-400">กำลังโหลด...</div>
                            ) : featureNotes.length === 0 ? (
                                <div className="text-center py-10 text-gray-400 italic">ยังไม่มีการบันทึกข้อความ</div>
                            ) : (
                                featureNotes.map((note) => (
                                    <div key={note.id} className="bg-white p-4 rounded-xl border shadow-sm relative group">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                                                    {note.created_by.charAt(0)}
                                                </div>
                                                <div>
                                                    <span className="font-bold text-gray-800 text-sm">{note.created_by}</span>
                                                    <div className="text-[10px] text-gray-400 flex items-center gap-1">
                                                        <Clock size={10} /> {dayjs(note.created_at).format('D MMM YY HH:mm')}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-gray-700 whitespace-pre-line pl-10 text-sm leading-relaxed">
                                            {note.content}
                                        </div>
                                        {/* Display Attachment */}
                                        {note.attachment && (
                                            <div className="mt-3 pl-10">
                                                {note.attachment_type?.startsWith('image/') ? (
                                                    <a href={note.attachment} target="_blank" rel="noreferrer" className="block w-fit">
                                                        <img src={note.attachment} alt="attachment" className="max-w-[200px] h-auto rounded-lg border hover:opacity-90 transition-opacity" />
                                                    </a>
                                                ) : (
                                                    <a href={note.attachment} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg text-sm text-blue-600 hover:bg-gray-200 transition-colors">
                                                        <FileText size={16} />
                                                        <span>เปิดไฟล์แนบ</span>
                                                    </a>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-white border-t shrink-0">
                            {/* File Preview */}
                            {selectedFile && (
                                <div className="mb-2 flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-lg w-fit text-sm text-blue-700">
                                    {previewUrl ? (
                                        <ImageIcon size={16} />
                                    ) : (
                                        <Paperclip size={16} />
                                    )}
                                    <span className="max-w-[200px] truncate">{selectedFile.name}</span>
                                    <button onClick={clearSelectedFile} className="ml-2 p-0.5 hover:bg-blue-200 rounded-full">
                                        <X size={14} />
                                    </button>
                                </div>
                            )}

                            <div className="flex gap-2 items-end">
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-3 text-gray-400 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-colors"
                                    title="แนบไฟล์"
                                >
                                    <Paperclip size={20} />
                                </button>
                                <input 
                                    type="file" 
                                    hidden 
                                    ref={fileInputRef} 
                                    onChange={handleFileSelect}
                                />
                                
                                <textarea 
                                    className="flex-1 bg-gray-100 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-100 focus:bg-white outline-none resize-none text-sm"
                                    rows={1}
                                    style={{ minHeight: '46px', maxHeight: '120px' }}
                                    placeholder="พิมพ์บันทึกข้อความ..."
                                    value={newMeetingNote}
                                    onChange={e => setNewMeetingNote(e.target.value)}
                                    onKeyDown={e => {
                                        if(e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendNote();
                                        }
                                    }}
                                />
                                <button 
                                    onClick={handleSendNote}
                                    disabled={!newMeetingNote.trim() && !selectedFile}
                                    className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-md disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
                                >
                                    <Send size={20} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectTimelinePage;