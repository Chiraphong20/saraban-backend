import React, { useEffect, useState, useMemo, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useProjects } from '../context/ProjectContext';
import { Project } from '../types';
import { 
    ArrowLeft, Calendar, User, 
    Plus, Save, X, Edit2, Trash2, AlertCircle,
    MessageSquare, Clock, Send, Printer, FileDown, 
    FileText, Paperclip, 
    Image as ImageIcon, 
    Download 
} from 'lucide-react';
// Import Image และ ImageProps จาก antd
import { message, Modal, Dropdown, MenuProps, Image as AntImage, ImageProps as AntImageProps } from 'antd'; 
import dayjs from 'dayjs';
import 'dayjs/locale/th';

// --- ✅ Fix TypeScript: Extended Image Component ---
// สร้าง Component ใหม่ที่มี Type ถูกต้อง (รับ crossOrigin ได้)
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
    attachment?: string;       
    attachment_type?: string;  
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
            if (file.size > 10 * 1024 * 1024) { // Limit 10MB
                message.error('ไฟล์มีขนาดใหญ่เกิน 10MB');
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

    // --- Helper Functions ---
    const fixUrl = (url: string) => {
        if (!url) return '';
        return url.replace(/^http:\/\//i, 'https://');
    };

    const handleDownloadFile = async (url: string, filename: string) => {
        try {
            const httpsUrl = fixUrl(url);
            const response = await fetch(httpsUrl);
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error("Download failed", err);
            window.open(fixUrl(url), '_blank');
        }
    };

    // --- Notes Handlers ---
    const openNoteModal = async (feature: ProjectFeature) => {
        setCurrentFeatureForNote(feature);
        setIsNoteModalOpen(true);
        setIsNoteLoading(true);
        clearSelectedFile(); 
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
                        'Content-Type': 'multipart/form-data'
                    } 
                }
            );

            const newNoteObj: FeatureNote = {
                id: res.data.id || Date.now(),
                content: newMeetingNote,
                created_by: user?.fullname || user?.username || 'Me',
                created_at: new Date().toISOString(),
                attachment: res.data.attachment,
                attachment_type: res.data.attachment_type || (selectedFile ? selectedFile.type : undefined)
            };
            
            setFeatureNotes([newNoteObj, ...featureNotes]); 
            setNewMeetingNote('');
            clearSelectedFile();
            hideLoading();
            message.success('ส่งบันทึกสำเร็จ');
        } catch (error) {
            hideLoading();
            console.error("Error sending note:", error);
            message.error("ส่งข้อความไม่สำเร็จ");
        }
    };

    // --- 🖨️ Export Handlers ---
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

    const handleExportPDF = async () => {
        if (!featureNotes || featureNotes.length === 0) {
            message.warning("ไม่มีบันทึกข้อความให้ดาวน์โหลด");
            return;
        }

        const element = document.getElementById('pdf-template-content');
        if (!element) return;

        let html2pdf;
        try {
            html2pdf = (await import('html2pdf.js')).default;
        } catch (e) {
            message.error("ไม่สามารถโหลดไลบรารี PDF ได้");
            return;
        }

        const opt = {
            margin: 10,
            filename: `Notes_${currentFeatureForNote?.title}_${dayjs().format('YYYYMMDD')}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: true }, 
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

    if (!project) return <div className="p-10 text-center">กำลังโหลด...</div>;

    return (
        <div className="space-y-6 animate-fade-in pb-20 bg-gray-50 min-h-screen relative print:bg-white print:p-0 print:space-y-2">
            
            {/* Header */}
            <div className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm print:border-none print:shadow-none print:px-0">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 print:hidden">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            {project.name}
                            <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700 border border-blue-200 print:border-black print:text-black print:bg-transparent">{project.status}</span>
                        </h1>
                        <p className="text-sm text-gray-500 print:text-black">
                            Code: {project.code} | Timeline: {dayjs(timelineMonths[0]).format('MMM YY')} - {dayjs(timelineMonths[timelineMonths.length-1]).format('MMM YY')}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2 print:hidden">
                    <Dropdown menu={{ items: exportMenu }} placement="bottomRight">
                        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 shadow-sm font-medium transition-all">
                            <FileDown size={16} /> Export
                        </button>
                    </Dropdown>
                    <button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 shadow-sm font-medium transition-all">
                        <Plus size={16} /> Add Feature
                    </button>
                </div>
            </div>

            <div className="px-6 space-y-6 print:px-0 print:space-y-4">
                {/* Gantt Chart Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden print:shadow-none print:border-black">
                    <div className="p-4 border-b bg-blue-50/50 flex justify-between items-center print:bg-gray-100 print:border-black">
                        <h2 className="font-bold text-blue-800 flex items-center gap-2 print:text-black">
                            <Calendar size={18} /> PROJECT PLAN ({timelineMonths.length} Months)
                        </h2>
                    </div>
                    <div className="overflow-x-auto print:overflow-visible">
                        <table className="w-full border-collapse" style={{ minWidth: `${Math.max(1000, timelineMonths.length * 150)}px` }}> 
                            <thead>
                                <tr>
                                    <th rowSpan={2} className="w-64 p-3 border-b border-r bg-gray-50 text-left text-xs font-bold text-gray-500 uppercase sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] print:shadow-none print:static print:border-black print:text-black">
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
                                                <div className="font-bold text-gray-800 text-xs print:text-black">{i + 1}. {feat.title}</div>
                                                <div className="text-[10px] text-gray-400 mt-0.5 print:text-gray-600">
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

                {/* Detail Table Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden print:shadow-none print:border-black">
                    <div className="p-5 border-b flex items-center justify-between print:border-black print:bg-gray-100">
                        <h2 className="font-bold text-gray-800 print:text-black">รายละเอียดแผนงาน (Plan Details)</h2>
                    </div>
                    <div className="overflow-x-auto">
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
                                            <span className={`px-2 py-1 rounded text-xs font-bold border print:border-black print:text-black ${
                                                feat.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                                feat.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                                                feat.status === 'IDEA' ? 'bg-purple-100 text-purple-700' :
                                                'bg-yellow-100 text-yellow-700'
                                            }`}>{feat.status}</span>
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
                                        <option value="IDEA">IDEA</option>
                                        <option value="PENDING">PENDING</option>
                                        <option value="IN_PROGRESS">IN PROGRESS</option>
                                        <option value="COMPLETED">COMPLETED</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Remark (หมายเหตุ)</label>
                                <input type="text" className="w-full border rounded-lg p-2.5 outline-none"
                                    value={formData.remark} onChange={e => setFormData({...formData, remark: e.target.value})} placeholder="หมายเหตุสั้นๆ..." />
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

            {/* --- 🟠 Modal: Meeting Notes (With File Upload & PDF Export) --- */}
            {isNoteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in print:hidden">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col h-[600px]">
                        <div className="p-4 border-b bg-yellow-50 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-yellow-800 flex items-center gap-2">
                                    <MessageSquare size={18} /> Meeting Notes
                                </h3>
                                <p className="text-xs text-yellow-600 truncate max-w-[250px]">
                                    Feature: {currentFeatureForNote?.title}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                {/* ปุ่ม Download PDF */}
                                <button onClick={handleExportPDF} title="Download PDF" className="p-1 hover:bg-yellow-200 rounded-full text-yellow-700 transition-colors">
                                    <FileText size={18} />
                                </button>
                                <button onClick={() => setIsNoteModalOpen(false)} className="p-1 hover:bg-yellow-100 rounded-full text-yellow-700"><X size={20} /></button>
                            </div>
                        </div>
                        
                        {/* Note History List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                            {isNoteLoading ? (
                                <div className="text-center text-gray-400 mt-20">กำลังโหลดบันทึก...</div>
                            ) : featureNotes.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400 opacity-60">
                                    <MessageSquare size={40} />
                                    <p className="mt-2 text-sm">ยังไม่มีการจดบันทึก</p>
                                </div>
                            ) : (
                                featureNotes.map((note) => (
                                    <div key={note.id} className="flex flex-col animate-slide-up">
                                        <div className="bg-white p-3 rounded-t-xl rounded-br-xl shadow-sm border border-gray-100 self-start max-w-[90%]">
                                            
                                            {/* ✅ 1. ใช้ SafeImage แทน AntImage เพื่อ Type Safe */}
                                            {note.attachment && (note.attachment_type?.startsWith('image') || note.attachment.match(/\.(jpeg|jpg|gif|png)$/i)) ? (
                                                <div className="mb-2">
                                                    <SafeImage
                                                        width={200}
                                                        src={fixUrl(note.attachment)}
                                                        className="rounded-lg object-cover border border-gray-200"
                                                        crossOrigin="anonymous" // ตอนนี้ TypeScript จะไม่บ่นแล้ว!
                                                    />
                                                </div>
                                            ) : note.attachment ? (
                                                // ✅ 2. แสดงไฟล์แนบ พร้อมปุ่ม Download
                                                <div className="mb-2 p-2 bg-gray-100 rounded flex items-center justify-between gap-2 border border-gray-200">
                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                        <Paperclip size={16} className="text-gray-500 flex-shrink-0" />
                                                        <a href={fixUrl(note.attachment)} target="_blank" rel="noreferrer" className="text-blue-600 underline text-xs truncate">
                                                            {note.attachment.split('/').pop() || 'ไฟล์แนบ'}
                                                        </a>
                                                    </div>
                                                    <button 
                                                        onClick={() => handleDownloadFile(note.attachment!, note.attachment!.split('/').pop() || 'download')}
                                                        className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-100 rounded transition-colors"
                                                        title="ดาวน์โหลด"
                                                    >
                                                        <Download size={14} />
                                                    </button>
                                                </div>
                                            ) : null}

                                            <p className="text-gray-800 text-sm whitespace-pre-line">{note.content}</p>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1 ml-1 text-[10px] text-gray-400">
                                            <span className="flex items-center gap-0.5 font-medium text-gray-500">
                                                <User size={10}/> {note.created_by || 'Me'}
                                            </span>
                                            <span>•</span>
                                            <span className="flex items-center gap-0.5">
                                                <Clock size={10}/> {dayjs(note.created_at).locale('th').format('D MMM BB HH:mm')}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Input Area + File Upload */}
                        <div className="p-3 bg-white border-t border-gray-100">
                            
                            {/* File Preview */}
                            {selectedFile && (
                                <div className="mb-2 flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-blue-100 animate-fade-in">
                                    {previewUrl ? (
                                        <img src={previewUrl} alt="preview" className="w-10 h-10 object-cover rounded" />
                                    ) : (
                                        <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center"><Paperclip size={16}/></div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium truncate text-gray-700">{selectedFile.name}</p>
                                        <p className="text-[10px] text-gray-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                    <button onClick={clearSelectedFile} className="p-1 hover:bg-gray-200 rounded-full text-gray-500"><X size={14}/></button>
                                </div>
                            )}

                            <div className="flex gap-2 items-end">
                                {/* ✅ Hidden File Input */}
                                <input 
                                    type="file" 
                                    ref={fileInputRef}
                                    className="hidden" 
                                    onChange={handleFileSelect}
                                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                                />
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-3 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                                    title="แนบไฟล์/รูปภาพ"
                                >
                                    <ImageIcon size={20} />
                                </button>

                                <textarea 
                                    className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-yellow-400 outline-none resize-none h-[50px] bg-gray-50"
                                    placeholder="พิมพ์บันทึก..."
                                    value={newMeetingNote}
                                    onChange={(e) => setNewMeetingNote(e.target.value)}
                                    onKeyDown={(e) => {
                                        if(e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendNote();
                                        }
                                    }}
                                />
                                <button onClick={handleSendNote} disabled={(!newMeetingNote.trim() && !selectedFile)} className="bg-yellow-500 text-white p-3 rounded-xl hover:bg-yellow-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-sm">
                                    <Send size={20} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ✅ HIDDEN PDF TEMPLATE (สำหรับสร้าง PDF) */}
            <div className="absolute top-0 left-[-9999px] w-[800px]" id="pdf-template-content">
                <div className="p-10 bg-white text-black font-sans">
                    {/* Header Report */}
                    <div className="border-b-2 border-gray-800 pb-4 mb-6">
                        <h1 className="text-2xl font-bold text-gray-800">Meeting Notes Log</h1>
                        <div className="mt-2 flex justify-between text-sm text-gray-600">
                            <div>
                                <p><strong>Project:</strong> {project.name}</p>
                                <p><strong>Feature:</strong> {currentFeatureForNote?.title}</p>
                            </div>
                            <div className="text-right">
                                <p><strong>Export Date:</strong> {dayjs().locale('th').format('D MMMM BBBB')}</p>
                                <p><strong>Time:</strong> {dayjs().format('HH:mm')} น.</p>
                            </div>
                        </div>
                    </div>

                    {/* Content Table */}
                    <table className="w-full border-collapse border border-gray-300 text-sm">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="border border-gray-300 p-3 w-32 text-left align-top">Date / Time</th>
                                <th className="border border-gray-300 p-3 w-32 text-left align-top">User</th>
                                <th className="border border-gray-300 p-3 text-left align-top">Note / Comment</th>
                            </tr>
                        </thead>
                        <tbody>
                            {featureNotes.length > 0 ? (
                                featureNotes.map((note, index) => (
                                    <tr key={index} className="align-top">
                                        <td className="border border-gray-300 p-3 text-gray-600">
                                            {dayjs(note.created_at).locale('th').format('D MMM BB')}<br/>
                                            {dayjs(note.created_at).format('HH:mm')}
                                        </td>
                                        <td className="border border-gray-300 p-3 font-medium text-gray-700">
                                            {note.created_by}
                                        </td>
                                        <td className="border border-gray-300 p-3 text-gray-800">
                                            {/* ✅ แสดงรูปใน PDF (Fix CORS) */}
                                            {note.attachment && (note.attachment_type?.startsWith('image') || note.attachment.match(/\.(jpeg|jpg|gif|png)$/i)) && (
                                                <div className="mb-3">
                                                    <SafeImage
                                                        src={fixUrl(note.attachment)} 
                                                        alt="img" 
                                                        className="max-w-[200px] h-auto rounded border border-gray-300" 
                                                        crossOrigin="anonymous" 
                                                    />
                                                </div>
                                            )}
                                            <div className="whitespace-pre-line">{note.content}</div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={3} className="border border-gray-300 p-6 text-center text-gray-400">
                                        - ไม่มีบันทึกการประชุม -
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* Footer */}
                    <div className="mt-8 pt-4 border-t border-gray-200 text-xs text-gray-400 text-center">
                        Report generated by Project Management System
                    </div>
                </div>
            </div>

        </div>
    );
};

export default ProjectTimelinePage;