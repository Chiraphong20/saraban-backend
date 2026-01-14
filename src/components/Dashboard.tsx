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
    Activity, ArrowRight, User, TrendingUp
} from 'lucide-react';
import { AuditLog } from '../types';

// --- Types ---
interface DashboardProps {
    onNavigate?: (page: string) => void;
}

interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ElementType;
    color: string; // เช่น 'blue', 'green'
    subtext?: string;
    onClick?: () => void;
}

// --- Configuration ---
const COLORS = ['#EAB308', '#3B82F6', '#10B981', '#EF4444', '#9CA3AF'];

// --- Sub-Component: Custom Tooltip for Charts ---
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

// --- Sub-Component: Stat Card ---
const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color, subtext, onClick }) => {
    // Map สี string เป็น Tailwind classes
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

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
    const { getStats } = useProjects();
    const { user, token } = useAuth();
    const stats = getStats();

    const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(true);

    useEffect(() => {
        const fetchRecentActivity = async () => {
            if (!token) return;
            try {
                const res = await axios.get('https://saraban-backend.onrender.com/api/notifications', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setRecentLogs(res.data.slice(0, 5));
            } catch (error) {
                console.error("Failed to fetch dashboard activities");
            } finally {
                setLoadingLogs(false);
            }
        };

        fetchRecentActivity();
    }, [token]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('th-TH', {
            style: 'currency', currency: 'THB', minimumFractionDigits: 0
        }).format(amount);
    };

    const formatBudgetShort = (amount: number) => {
        if (amount >= 1000000) return `฿${(amount / 1000000).toFixed(2)}M`;
        if (amount >= 1000) return `฿${(amount / 1000).toFixed(1)}K`;
        return `฿${amount.toLocaleString()}`;
    };

    const today = new Date().toLocaleDateString('th-TH', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            
            {/* --- Header Section --- */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 to-slate-800 p-8 rounded-3xl text-white shadow-lg">
                <div>
                    <h1 className="text-3xl font-bold mb-2">
                        สวัสดี, {user?.fullname || 'ผู้ใช้งาน'} 👋
                    </h1>
                    <p className="text-slate-300 flex items-center gap-2 opacity-90">
                        <Clock size={16} />
                        {today}
                    </p>
                </div>
                <div>
                    <button 
                        onClick={() => onNavigate && onNavigate('projects')}
                        className="px-6 py-3 bg-white text-slate-900 text-sm font-bold rounded-xl shadow-lg hover:bg-blue-50 hover:scale-105 transition-all flex items-center gap-2"
                    >
                        <FolderOpen size={18} className="text-blue-600" />
                        จัดการโครงการ
                    </button>
                </div>
            </div>

            {/* --- Stats Grid --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 -mt-10 px-4">
                <StatCard 
                    title="โครงการทั้งหมด" 
                    value={stats.total} 
                    icon={FolderOpen} 
                    color="blue"
                    subtext="ปีงบประมาณ 2567"
                    onClick={() => onNavigate && onNavigate('projects')}
                />
                <StatCard 
                    title="กำลังดำเนินการ" 
                    value={stats.active} 
                    icon={Clock} 
                    color="yellow"
                    subtext="รอการเบิกจ่าย"
                    onClick={() => onNavigate && onNavigate('projects')}
                />
                <StatCard 
                    title="เสร็จสิ้น" 
                    value={stats.completed} 
                    icon={CheckCircle} 
                    color="green"
                    subtext="ปิดโครงการแล้ว"
                    onClick={() => onNavigate && onNavigate('projects')}
                />
                <StatCard 
                    title="งบประมาณรวม" 
                    value={formatBudgetShort(stats.totalBudget)} 
                    icon={Wallet} 
                    color="indigo"
                    subtext={formatCurrency(stats.totalBudget)}
                />
            </div>

            {/* --- Main Content --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 px-2 md:px-0">
                
                {/* Left: Charts (2/3 width) */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* Bar Chart */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="mb-6">
                            <h3 className="text-lg font-bold text-gray-800">ภาพรวมสถานะโครงการ</h3>
                            <p className="text-sm text-gray-400">เปรียบเทียบจำนวนโครงการในแต่ละสถานะ</p>
                        </div>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                                    <XAxis 
                                        dataKey="name" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{fill: '#6B7280', fontSize: 12}} 
                                        dy={10} 
                                    />
                                    <YAxis 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{fill: '#6B7280', fontSize: 12}} 
                                    />
                                    <Tooltip content={<CustomTooltip />} cursor={{fill: '#F9FAFB'}} />
                                    <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={40}>
                                        {stats.chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Pie Chart & Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">สัดส่วนโครงการ</h3>
                            <div className="h-[200px] relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={stats.chartData}
                                            cx="50%" cy="50%"
                                            innerRadius={50} outerRadius={70}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {stats.chartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<CustomTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                                {/* Center Text */}
                                <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                                    <span className="text-3xl font-bold text-gray-800">{stats.total}</span>
                                    <span className="text-xs text-gray-400">โครงการ</span>
                                </div>
                            </div>
                        </div>

                        {/* Highlight Card */}
                        <div className="bg-blue-600 p-6 rounded-2xl shadow-lg text-white flex flex-col justify-between relative overflow-hidden">
                            <div className="relative z-10">
                                <p className="text-blue-200 text-sm font-medium mb-1">Highlight Performance</p>
                                <h3 className="text-2xl font-bold mb-4">อัตราความสำเร็จ</h3>
                                <div className="text-5xl font-bold mb-2">
                                    {stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(0) : 0}%
                                </div>
                                <p className="text-blue-100 text-sm opacity-80">
                                    ของโครงการทั้งหมดดำเนินการเสร็จสิ้นแล้ว
                                </p>
                            </div>
                            <Activity className="absolute -right-4 -bottom-4 text-blue-500 opacity-20 w-32 h-32" />
                        </div>
                    </div>
                </div>

                {/* Right: Recent Activity Feed (1/3 width) */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full">
                    <div className="p-6 border-b border-gray-50 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-gray-800">ความเคลื่อนไหว</h3>
                        <span className="bg-blue-50 text-blue-600 text-xs px-2 py-1 rounded-md font-medium">ล่าสุด</span>
                    </div>

                    <div className="p-6 flex-1 overflow-y-auto">
                        <div className="relative">
                            {/* Vertical Line */}
                            <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-gray-100"></div>

                            <div className="space-y-8">
                                {loadingLogs ? (
                                    <div className="text-center py-10 text-gray-400 animate-pulse">กำลังโหลดข้อมูล...</div>
                                ) : recentLogs.length > 0 ? (
                                    recentLogs.map((log) => (
                                        <div key={log.id} className="relative pl-10 group">
                                            {/* Dot */}
                                            <div className={`
                                                absolute left-3 top-1.5 w-4 h-4 rounded-full border-4 border-white shadow-sm z-10
                                                ${log.action === 'CREATE' ? 'bg-green-500' : 
                                                  log.action === 'DELETE' ? 'bg-red-500' : 
                                                  log.action === 'UPDATE' ? 'bg-blue-500' : 'bg-yellow-500'}
                                            `}></div>
                                            
                                            <div className="flex flex-col">
                                                <p className="text-sm font-semibold text-gray-800 group-hover:text-blue-600 transition-colors line-clamp-2">
                                                    {log.details}
                                                </p>
                                                <div className="flex items-center gap-3 mt-2">
                                                    <div className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                                                        <User size={12} />
                                                        {log.actor}
                                                    </div>
                                                    <span className="text-xs text-gray-400">
                                                        {new Date(log.timestamp).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center text-gray-400 py-10">ไม่มีรายการล่าสุด</div>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <div className="p-4 border-t border-gray-50">
                        <button 
                            onClick={() => onNavigate && onNavigate('logs')}
                            className="w-full py-3 text-sm text-gray-600 font-bold bg-gray-50 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all flex justify-center items-center gap-2 group"
                        >
                            ดูประวัติทั้งหมด
                            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Dashboard;