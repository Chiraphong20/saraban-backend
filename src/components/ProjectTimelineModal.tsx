import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { X, Clock, User, Activity, Send, Users, FileText, Edit2, Trash2, Calendar, AlertCircle } from 'lucide-react';
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
    
    // State Form
    const [note, setNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingLogId, setEditingLogId] = useState<number | null>(null);
    
    // Auto-scroll reference
    const timelineEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && project.id && token) {
            fetchLogs();
            resetForm();
        }
    }, [isOpen, project.id, token]);

    const fetchLogs = async () => {
        try {
            const res = await axios.get(`http://localhost:3001/api/projects/${project.id}/logs`);
            setLogs(res.data);
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setNote('');
        setEditingLogId(null);
    };

    const handleEditClick = (log: AuditLog) => {
        setNote(log.details);
        setEditingLogId(log.id);
    };

    const handleDeleteClick = async (logId: number) => {
        if (!window.confirm('ต้องการลบรายการนี้ใช่หรือไม่?')) return;
        try {
            await axios.delete(`http://localhost:3001/api/logs/${logId}`);
            await fetchLogs();
        } catch (error) {
            alert('ลบข้อมูลไม่สำเร็จ');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!note.trim()) return;

        setIsSubmitting(true);
        try {
            if (editingLogId) {
                await axios.put(`http://localhost:3001/api/logs/${editingLogId}`, { details: note });
            } else {
                await axios.post(`http://localhost:3001/api/projects/${project.id}/logs`, {
                    action: 'MEETING',
                    details: note
                });
            }
            resetForm();
            await fetchLogs();
            // Scroll to top after submit
            if (timelineEndRef.current) {
                timelineEndRef.current.scrollIntoView({ behavior: 'smooth' });
            }
        } catch (error) {
            alert('บันทึกข้อมูลไม่สำเร็จ');
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatDate = (isoString: string) => {
        return new Date(isoString).toLocaleString('th-TH', {
            dateStyle: 'medium',
            timeStyle: 'short',
        });
    };

    const getActionStyle = (action: string) => {
        switch (action) {
            case 'CREATE': return { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: Activity };
            case 'UPDATE': return { color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', icon: FileText };
            case 'DELETE': return { color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', icon: AlertCircle };
            case 'MEETING': return { color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200', icon: Users };
            default: return { color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-200', icon: Clock };
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            
            {/* 🔥 Main Container: ปรับให้กว้างเกือบเต็มจอ (max-w-6xl) และสูง (h-[85vh]) */}
            <div className="bg-white w-full max-w-6xl h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-fade-in-up">
                
                {/* 1. Header Section */}
                <div className="flex justify-between items-center px-8 py-5 border-b border-gray-100 bg-white z-10">
                    <div className="flex items-center gap-4">
                        <div className="bg-indigo-600 p-3 rounded-xl shadow-lg shadow-indigo-200">
                            <Calendar className="text-white" size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Project Timeline</h2>
                            <div className="flex items-center text-sm text-gray-500 mt-0.5 space-x-2">
                                <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-600">{project.code}</span>
                                <span>•</span>
                                <span>{project.name}</span>
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="group p-2 rounded-full hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-200"
                    >
                        <X className="text-gray-400 group-hover:text-gray-600" size={24} />
                    </button>
                </div>

                {/* 2. Body Grid Layout (Split View) */}
                <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
                    
                    {/* --- Left Column: Editor (Sticky) --- */}
                    <div className="lg:col-span-5 bg-slate-50 p-6 lg:p-8 border-r border-gray-200 flex flex-col h-full">
                        <div className="mb-4">
                            <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                                {editingLogId ? (
                                    <><Edit2 size={18} className="text-orange-500"/> แก้ไขบันทึก</>
                                ) : (
                                    <><Send size={18} className="text-indigo-500"/> บันทึกใหม่</>
                                )}
                            </h3>
                            <p className="text-sm text-slate-500">บันทึกความคืบหน้า หรือสรุปการประชุมลงใน Timeline</p>
                        </div>

                        <form onSubmit={handleSubmit} className="flex-1 flex flex-col relative">
                            <textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="พิมพ์รายละเอียดที่นี่..."
                                className="flex-1 w-full p-5 text-base text-gray-700 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none resize-none shadow-sm transition-all"
                            />
                            
                            <div className="flex items-center justify-between mt-4">
                                {editingLogId ? (
                                    <button 
                                        type="button" 
                                        onClick={resetForm}
                                        className="text-sm text-gray-500 hover:text-gray-700 underline px-2"
                                    >
                                        ยกเลิกการแก้ไข
                                    </button>
                                ) : <div />}

                                <button 
                                    type="submit" 
                                    disabled={isSubmitting || !note.trim()}
                                    className={`
                                        flex items-center px-6 py-3 rounded-xl text-white font-medium shadow-lg transition-transform active:scale-95
                                        ${editingLogId 
                                            ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-200' 
                                            : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'} 
                                        disabled:opacity-50 disabled:cursor-not-allowed
                                    `}
                                >
                                    {isSubmitting ? 'กำลังบันทึก...' : (editingLogId ? 'บันทึกการแก้ไข' : 'ส่งข้อมูล')}
                                    {!isSubmitting && <Send size={18} className="ml-2" />}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* --- Right Column: Timeline History (Scrollable) --- */}
                    <div className="lg:col-span-7 bg-white h-full overflow-y-auto custom-scrollbar p-6 lg:p-8">
                        <div ref={timelineEndRef} /> {/* Anchor for scrolling to top */}
                        
                        {isLoading ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                <Activity className="animate-spin mb-3 text-indigo-200" size={40} />
                                <p>กำลังโหลดประวัติ...</p>
                            </div>
                        ) : logs.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
                                <div className="bg-gray-50 p-6 rounded-full mb-4">
                                    <Clock size={48} />
                                </div>
                                <p className="text-lg font-medium">ยังไม่มีประวัติกิจกรรม</p>
                                <p className="text-sm">เริ่มบันทึกข้อความแรกทางด้านซ้ายได้เลย</p>
                            </div>
                        ) : (
                            <div className="relative border-l-2 border-gray-100 ml-4 space-y-8 pb-10">
                                {logs.map((log, index) => {
                                    const style = getActionStyle(log.action);
                                    const Icon = style.icon;
                                    const isEditable = log.action === 'MEETING' || log.action === 'NOTE';
                                    
                                    return (
                                        <div key={index} className="relative pl-8 group">
                                            {/* Dot Marker */}
                                            <div className={`
                                                absolute top-0 left-[-10px] w-6 h-6 rounded-full border-4 border-white shadow-sm flex items-center justify-center
                                                ${style.bg}
                                            `}>
                                                <div className={`w-2 h-2 rounded-full ${style.color.replace('text-', 'bg-')}`}></div>
                                            </div>

                                            {/* Card Content */}
                                            <div className={`
                                                relative p-5 rounded-2xl border transition-all duration-200
                                                ${style.bg} ${style.border}
                                                ${editingLogId === log.id ? 'ring-2 ring-orange-400 shadow-md scale-[1.01]' : 'hover:shadow-md'}
                                            `}>
                                                {/* Card Header */}
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <span className={`
                                                            inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide bg-white/60
                                                            ${style.color}
                                                        `}>
                                                            <Icon size={12} />
                                                            {log.action}
                                                        </span>
                                                        <span className="text-xs font-medium text-gray-400">
                                                            {formatDate(log.timestamp)}
                                                        </span>
                                                    </div>

                                                    {/* Actions (Hover) */}
                                                    {isEditable && (
                                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 p-1 rounded-lg shadow-sm">
                                                            <button onClick={() => handleEditClick(log)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="แก้ไข">
                                                                <Edit2 size={14} />
                                                            </button>
                                                            <button onClick={() => handleDeleteClick(log.id)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="ลบ">
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Card Body */}
                                                <div className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                                                    {log.details}
                                                </div>

                                                {/* Card Footer */}
                                                <div className="mt-4 pt-3 border-t border-black/5 flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-white/80 flex items-center justify-center text-[10px] font-bold text-gray-500 ring-1 ring-black/5">
                                                        {log.actor.charAt(0)}
                                                    </div>
                                                    <span className="text-xs text-gray-500 font-medium">
                                                        {log.actor}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectTimelineModal;