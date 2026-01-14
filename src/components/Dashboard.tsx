import React, { useEffect, useState } from 'react';
import { useProjects } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { 
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
    BarChart, Bar, XAxis, YAxis, CartesianGrid 
} from 'recharts';
import { 
    Wallet, CheckCircle, Clock, FolderOpen, 
    Activity, ArrowRight, User, TrendingUp, 
    StickyNote, Send, Trash2, ArrowUpRight, Edit2, X, Save 
} from 'lucide-react';
import { AuditLog } from '../types';
import { message, Modal, Select } from 'antd';

// --- Types ---
interface DashboardProps {
    onNavigate?: (page: string) => void;
}

interface QuickNote {
    id: number;
    content: string;
    created_at: string;
}

// --- Sub-Component: Stat Card ---
interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ElementType;
    color: string;
    subtext?: string;
    onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color, subtext, onClick }) => {
    const colorMap: Record<string, { bg: string, text: string, iconBg: string }> = {
        blue: { bg: 'hover:border-blue-200', text: 'text-blue-600', iconBg: 'bg-blue-50 text-blue-600' },
        yellow: { bg: 'hover:border-yellow-200', text: 'text-yellow-600', iconBg: 'bg-yellow-50 text-yellow-600' },
        green: { bg: 'hover:border-green-200', text: 'text-emerald-600', iconBg: 'bg-emerald-50 text-emerald-600' },
        indigo: { bg: 'hover:border-indigo-200', text: 'text-indigo-600', iconBg: 'bg-indigo-50 text-indigo-600' },
    };
    const theme = colorMap[color] || colorMap['blue'];

    return (
        <div 
            onClick={onClick}
            className={`bg-white rounded-2xl p-6 shadow-sm border border-gray-100 transition-all duration-300 cursor-pointer group hover:shadow-lg ${theme.bg}`}
        >
            <div className="flex justify-between items-start">
                <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-500">{title}</p>
                    <h3 className="text-3xl font-bold text-gray-900 tracking-tight group-hover:scale-105 transition-transform origin-left">
                        {value}
                    </h3>
                </div>
                <div className={`p-3 rounded-xl ${theme.iconBg} transition-transform group-hover:rotate-12`}>
                    <Icon size={24} />
                </div>
            </div>
            {subtext && (
                <div className="mt-4 flex items-center text-xs font-medium text-gray-400">
                    <TrendingUp size={14} className="mr-1 text-green-500" />
                    {subtext}
                </div>
            )}
        </div>
    );
};

// --- Sub-Component: Chart Tooltip ---
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white p-3 border border-gray-100 shadow-xl rounded-xl">
                <p className="text-sm font-bold text-gray-900 mb-1">{label}</p>
                <p className="text-sm text-blue-600 font-medium">
                    จำนวน: {payload[0].value} โครงการ
                </p>
            </div>
        );
    }
    return null;
};

// --- Colors Configuration ---
const COLORS = ['#EAB308', '#3B82F6', '#10B981', '#EF4444', '#9CA3AF'];

// ==========================================
// MAIN COMPONENT: DASHBOARD
// ==========================================
const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
    const { getStats, projects } = useProjects();
    const { user, token } = useAuth();
    const stats = getStats();
    
    // Data States
    const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(true);
    const [notes, setNotes] = useState<QuickNote[]>([]);
    
    // Note Editing States
    const [newNote, setNewNote] = useState('');
    const [editingNoteId, setEditingNoteId] = useState<number | null>(null);

    // Modal Move Note States
    const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
    const [selectedNote, setSelectedNote] = useState<QuickNote | null>(null);
    const [targetProjectId, setTargetProjectId] = useState<number | null>(null);
    const [targetDates, setTargetDates] = useState<[string, string]>(['', '']);

    // --- Fetch Data ---
    useEffect(() => {
        const fetchData = async () => {
            if (!token) return;
            try {
                // Fetch Recent Logs
                const logRes = await axios.get('https://saraban-backend.onrender.com/api/notifications', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setRecentLogs(logRes.data.slice(0, 5));

                // Fetch Notes
                const noteRes = await axios.get('https://saraban-backend.onrender.com/api/notes', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setNotes(noteRes.data);
            } catch (error) {
                console.error("Failed to fetch dashboard data");
            } finally {
                setLoadingLogs(false);
            }
        };
        fetchData();
    }, [token]);

    // --- Note Handlers ---

    // 1. Save Note (Add or Update)
    const handleSaveNote = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!newNote.trim()) return;

        try {
            if (editingNoteId) {
                // Update Existing Note
                await axios.put(`https://saraban-backend.onrender.com/api/notes/${editingNoteId}`, 
                    { content: newNote }, 
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                
                setNotes(notes.map(n => n.id === editingNoteId ? { ...n, content: newNote } : n));
                message.success('แก้ไขบันทึกเรียบร้อย');
                setEditingNoteId(null);
            } else {
                // Create New Note
                const res = await axios.post('https://saraban-backend.onrender.com/api/notes', 
                    { content: newNote }, 
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                setNotes([res.data, ...notes]);
                message.success('บันทึก Quick Note แล้ว');
            }
            setNewNote('');
        } catch (error) {
            message.error('เกิดข้อผิดพลาดในการบันทึก');
        }
    };

    // 2. Start Editing
    const startEditing = (note: QuickNote) => {
        setEditingNoteId(note.id);
        setNewNote(note.content);
    };

    // 3. Cancel Editing
    const cancelEditing = () => {
        setEditingNoteId(null);
        setNewNote('');
    };

    // 4. Delete Note
    const handleDeleteNote = async (id: number) => {
        try {
            await axios.delete(`https://saraban-backend.onrender.com/api/notes/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotes(notes.filter(n => n.id !== id));
            if (editingNoteId === id) cancelEditing();
            message.success('ลบ Note แล้ว');
        } catch (error) {
            message.error('ลบไม่สำเร็จ');
        }
    };

    // --- Move Note to Project Handlers ---

    const openMoveModal = (note: QuickNote) => {
        setSelectedNote(note);
        setTargetProjectId(null);
        const today = new Date().toISOString().split('T')[0];
        setTargetDates([today, today]);
        setIsMoveModalOpen(true);
    };

    const handleMoveToProject = async () => {
        if (!selectedNote || !targetProjectId) {
            message.warning('กรุณาเลือกโครงการ');
            return;
        }
        try {
            // Add to Project Features
            await axios.post(`https://saraban-backend.onrender.com/api/projects/${targetProjectId}/features`, {
                title: selectedNote.content,
                detail: 'Added from Quick Note',
                next_list: '',
                status: 'PENDING',
                start_date: targetDates[0],
                due_date: targetDates[1],
                remark: 'From Dashboard'
            }, { headers: { Authorization: `Bearer ${token}` } });

            // Delete Note
            await axios.delete(`https://saraban-backend.onrender.com/api/notes/${selectedNote.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setNotes(notes.filter(n => n.id !== selectedNote.id));
            setIsMoveModalOpen(false);
            message.success('ย้ายไปยัง Timeline โครงการเรียบร้อยแล้ว');
        } catch (error) {
            message.error('เกิดข้อผิดพลาดในการย้ายข้อมูล');
        }
    };

    // --- Helpers ---
    const formatCurrency = (amount: number) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(amount);
    const formatBudgetShort = (amount: number) => amount >= 1000000 ? `฿${(amount / 1000000).toFixed(2)}M` : `฿${amount.toLocaleString()}`;
    const today = new Date().toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            
            {/* 1. Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 to-slate-800 p-8 rounded-3xl text-white shadow-lg">
                <div>
                    <h1 className="text-3xl font-bold mb-2">สวัสดี, {user?.fullname || 'ผู้ใช้งาน'} 👋</h1>
                    <p className="text-slate-300 flex items-center gap-2 opacity-90"><Clock size={16} />{today}</p>
                </div>
                <div>
                    <button onClick={() => onNavigate && onNavigate('projects')} className="px-6 py-3 bg-white text-slate-900 text-sm font-bold rounded-xl shadow-lg hover:bg-blue-50 transition-all flex items-center gap-2">
                        <FolderOpen size={18} className="text-blue-600" /> จัดการโครงการ
                    </button>
                </div>
            </div>

            {/* 2. Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 -mt-10 px-4">
                <StatCard title="โครงการทั้งหมด" value={stats.total} icon={FolderOpen} color="blue" subtext="ปีงบประมาณ 2567" onClick={() => onNavigate && onNavigate('projects')} />
                <StatCard title="กำลังดำเนินการ" value={stats.active} icon={Clock} color="yellow" subtext="รอการเบิกจ่าย" onClick={() => onNavigate && onNavigate('projects')} />
                <StatCard title="เสร็จสิ้น" value={stats.completed} icon={CheckCircle} color="green" subtext="ปิดโครงการแล้ว" onClick={() => onNavigate && onNavigate('projects')} />
                <StatCard title="งบประมาณรวม" value={formatBudgetShort(stats.totalBudget)} icon={Wallet} color="indigo" subtext={formatCurrency(stats.totalBudget)} />
            </div>

            {/* 3. Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 px-2 md:px-0">
                
                {/* Left Column (Charts) */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Bar Chart */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="mb-6"><h3 className="text-lg font-bold text-gray-800">ภาพรวมสถานะโครงการ</h3></div>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} />
                                    <Tooltip content={<CustomTooltip />} cursor={{fill: '#F9FAFB'}} />
                                    <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={40}>
                                        {stats.chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Pie Chart */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">สัดส่วนโครงการ</h3>
                            <div className="h-[200px] relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={stats.chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                                            {stats.chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip content={<CustomTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                                    <span className="text-3xl font-bold text-gray-800">{stats.total}</span>
                                    <span className="text-xs text-gray-400">โครงการ</span>
                                </div>
                            </div>
                        </div>
                         <div className="bg-blue-600 p-6 rounded-2xl shadow-lg text-white flex flex-col justify-between relative overflow-hidden">
                            <div className="relative z-10">
                                <p className="text-blue-200 text-sm font-medium mb-1">Highlight Performance</p>
                                <h3 className="text-2xl font-bold mb-4">อัตราความสำเร็จ</h3>
                                <div className="text-5xl font-bold mb-2">{stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(0) : 0}%</div>
                            </div>
                            <Activity className="absolute -right-4 -bottom-4 text-blue-500 opacity-20 w-32 h-32" />
                        </div>
                    </div>
                </div>

                {/* Right Column (Quick Note & Logs) */}
                <div className="flex flex-col gap-6">
                    
                    {/* ✅ Quick Note Widget */}
                    <div className={`bg-white rounded-2xl shadow-sm border transition-colors flex flex-col h-[400px] ${editingNoteId ? 'border-yellow-400 ring-2 ring-yellow-100' : 'border-gray-100'}`}>
                        <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-yellow-50/50 rounded-t-2xl">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <StickyNote size={20} className="text-yellow-500" /> 
                                {editingNoteId ? 'แก้ไขบันทึก...' : 'Quick Notes'}
                            </h3>
                            <span className="text-xs text-gray-400">{notes.length} รายการ</span>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/30">
                            {notes.length === 0 ? (
                                <div className="text-center text-gray-400 py-10 text-sm italic">จดบันทึกงานเร่งด่วนที่นี่...</div>
                            ) : (
                                notes.map(note => (
                                    <div key={note.id} className={`p-3 rounded-xl border shadow-sm group transition-all relative ${editingNoteId === note.id ? 'bg-yellow-100 border-yellow-300' : 'bg-white border-gray-100 hover:border-yellow-200'}`}>
                                        <p className="text-sm text-gray-700 whitespace-pre-wrap pr-16">{note.content}</p>
                                        <div className="flex justify-between items-end mt-2">
                                            <span className="text-[10px] text-gray-400">{new Date(note.created_at).toLocaleDateString('th-TH')}</span>
                                            
                                            {/* Action Buttons */}
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2 bg-white/80 p-1 rounded-lg backdrop-blur-sm">
                                                <button onClick={() => startEditing(note)} className="p-1.5 text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 rounded-md" title="แก้ไข">
                                                    <Edit2 size={14} />
                                                </button>
                                                <button onClick={() => openMoveModal(note)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md" title="ย้ายไป Timeline">
                                                    <ArrowUpRight size={14} />
                                                </button>
                                                <button onClick={() => handleDeleteNote(note.id)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md" title="ลบ">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Note Input */}
                        <div className="p-3 bg-white border-t border-gray-100">
                            <form onSubmit={handleSaveNote} className="flex gap-2 items-center">
                                {editingNoteId && (
                                    <button type="button" onClick={cancelEditing} className="p-2 text-red-500 hover:bg-red-50 rounded-xl" title="ยกเลิกการแก้ไข">
                                        <X size={18} />
                                    </button>
                                )}
                                <input 
                                    type="text" 
                                    value={newNote} 
                                    onChange={(e) => setNewNote(e.target.value)} 
                                    placeholder={editingNoteId ? "แก้ไขข้อความ..." : "พิมพ์บันทึกใหม่..."} 
                                    className={`flex-1 border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 ${editingNoteId ? 'bg-yellow-50 border-yellow-200 focus:ring-yellow-400' : 'bg-gray-50 border-gray-200 focus:ring-blue-400'}`}
                                />
                                <button 
                                    type="submit" 
                                    disabled={!newNote.trim()} 
                                    className={`p-2 rounded-xl text-white transition-colors ${editingNoteId ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-500 hover:bg-blue-600'} disabled:opacity-50`}
                                >
                                    {editingNoteId ? <Save size={18} /> : <Send size={18} />}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col flex-1 min-h-[300px]">
                        <div className="p-4 border-b border-gray-50 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-800">ความเคลื่อนไหว</h3>
                            <span className="bg-blue-50 text-blue-600 text-xs px-2 py-1 rounded-md font-medium">ล่าสุด</span>
                        </div>
                        <div className="p-4 flex-1 overflow-y-auto">
                            <div className="space-y-6">
                                {loadingLogs ? <div className="text-center py-4 text-gray-400">กำลังโหลด...</div> : recentLogs.length > 0 ? (
                                    recentLogs.map((log) => (
                                        <div key={log.id} className="relative pl-6 border-l-2 border-gray-100 last:border-0 pb-4 last:pb-0">
                                            <div className={`absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white ${
                                                log.action === 'CREATE' ? 'bg-green-500' : 
                                                log.action === 'DELETE' ? 'bg-red-500' : 'bg-blue-500'
                                            }`}></div>
                                            <p className="text-xs font-semibold text-gray-800 truncate">{log.details}</p>
                                            <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-400">
                                                <User size={10} /> {log.actor} • {new Date(log.timestamp).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})}
                                            </div>
                                        </div>
                                    ))
                                ) : <div className="text-center text-gray-400 text-sm">ไม่มีรายการล่าสุด</div>}
                            </div>
                        </div>
                        <div className="p-3 border-t">
                             <button onClick={() => onNavigate && onNavigate('logs')} className="w-full py-2 text-xs text-center text-gray-500 hover:text-blue-600 bg-gray-50 rounded-lg">ดูทั้งหมด</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal ย้าย Note ไป Timeline */}
            <Modal
                title="ย้ายไปเป็นแผนงาน (Timeline)"
                open={isMoveModalOpen}
                onCancel={() => setIsMoveModalOpen(false)}
                onOk={handleMoveToProject}
                okText="ยืนยันการย้าย"
                cancelText="ยกเลิก"
                centered
            >
                <div className="space-y-4 py-4">
                    <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                        <p className="text-sm text-yellow-800 font-medium">Note:</p>
                        <p className="text-gray-700">{selectedNote?.content}</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">เลือกโครงการปลายทาง</label>
                        <Select
                            className="w-full"
                            placeholder="ค้นหาโครงการ..."
                            showSearch
                            optionFilterProp="children"
                            onChange={(value) => setTargetProjectId(value)}
                            filterOption={(input, option) =>
                                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                            options={projects.map(p => ({ value: p.id, label: `${p.code} - ${p.name}` }))}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">วันเริ่ม</label>
                            <input type="date" className="w-full border rounded-lg p-2" value={targetDates[0]} onChange={e => setTargetDates([e.target.value, targetDates[1]])} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">วันจบ</label>
                            <input type="date" className="w-full border rounded-lg p-2" value={targetDates[1]} onChange={e => setTargetDates([targetDates[0], e.target.value])} />
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Dashboard;