import React, { useEffect, useState } from 'react';
import { useProjects } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { 
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, 
    BarChart, Bar, XAxis, YAxis, CartesianGrid 
} from 'recharts';
import { 
    Wallet, CheckCircle, Clock, FolderOpen, 
    Activity, ArrowRight, User 
} from 'lucide-react';
import { AuditLog } from '../types';

// กำหนดสีสำหรับกราฟตามสถานะ
// Active(เหลือง), Pending/Hold(ฟ้า), Completed(เขียว), Cancelled(แดง), Draft(เทา)
const COLORS = ['#EAB308', '#3B82F6', '#10B981', '#EF4444', '#6B7280'];

// --- Sub-Component: การ์ดแสดงตัวเลข ---
const StatCard = ({ title, value, icon: Icon, color, subtext, onClick }: any) => (
    <div 
        onClick={onClick}
        className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer group"
    >
        <div className="flex items-start justify-between">
            <div>
                <p className="text-sm font-medium text-gray-500">{title}</p>
                <h3 className="mt-2 text-3xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {value}
                </h3>
            </div>
            <div className={`p-3 rounded-xl ${color} bg-opacity-10 group-hover:scale-110 transition-transform`}>
                <Icon size={24} className={color.replace('bg-', 'text-')} />
            </div>
        </div>
        {subtext && <p className="mt-4 text-xs text-gray-400">{subtext}</p>}
    </div>
);

const Dashboard: React.FC = () => {
    const { getStats } = useProjects();
    const { user, token } = useAuth();
    const stats = getStats();

    // State สำหรับ Recent Logs
    const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(true);

    // ดึง Log ล่าสุด 5 รายการมาแสดง
    useEffect(() => {
        const fetchRecentActivity = async () => {
            if (!token) return;
            try {
                // ใช้ Route Notifications หรือ Audit Logs ก็ได้ (ดึงมาแค่นิดเดียว)
                const res = await axios.get('https://saraban-backend.onrender.com/api/notifications', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                // ตัดเอาแค่ 5 อันแรก
                setRecentLogs(res.data.slice(0, 5));
            } catch (error) {
                console.error("Failed to fetch dashboard activities");
            } finally {
                setLoadingLogs(false);
            }
        };

        fetchRecentActivity();
    }, [token]);

    // ฟังก์ชันจัดรูปแบบเงิน
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('th-TH', {
            style: 'currency',
            currency: 'THB',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    // ฟังก์ชันย่อตัวเลขเงิน (1.5M, 200K)
    const formatBudgetShort = (amount: number) => {
        if (amount >= 1000000) return `฿${(amount / 1000000).toFixed(2)}M`;
        if (amount >= 1000) return `฿${(amount / 1000).toFixed(1)}K`;
        return `฿${amount.toLocaleString()}`;
    };

    // วันที่ปัจจุบันแบบไทย
    const today = new Date().toLocaleDateString('th-TH', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    return (
        <div className="space-y-8 animate-fade-in p-2 md:p-0">
            
            {/* --- Header Section --- */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        สวัสดีคุณ, {user?.fullname || user?.username} 👋
                    </h1>
                    <p className="text-gray-500 mt-1 text-sm">{today}</p>
                </div>
                <div>
                    <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl shadow-sm hover:bg-blue-700 transition-colors flex items-center gap-2">
                        <FolderOpen size={16} />
                        จัดการโครงการ
                    </button>
                </div>
            </div>

            {/* --- Stats Grid --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    title="โครงการทั้งหมด" 
                    value={stats.total} 
                    icon={FolderOpen} 
                    color="bg-blue-500 text-blue-600"
                    subtext="รวมทุกสถานะในปีงบประมาณ"
                />
                <StatCard 
                    title="กำลังดำเนินการ (Active)" 
                    value={stats.active} 
                    icon={Clock} 
                    color="bg-yellow-500 text-yellow-600"
                    subtext="โครงการที่กำลังขับเคลื่อน"
                />
                <StatCard 
                    title="เสร็จสิ้น (Completed)" 
                    value={stats.completed} 
                    icon={CheckCircle} 
                    color="bg-emerald-500 text-emerald-600"
                    subtext="โครงการที่ปิดเล่มแล้ว"
                />
                <StatCard 
                    title="งบประมาณรวม" 
                    value={formatBudgetShort(stats.totalBudget)} 
                    icon={Wallet} 
                    color="bg-indigo-500 text-indigo-600"
                    subtext={`รวมทั้งหมด ${formatCurrency(stats.totalBudget)}`}
                />
            </div>

            {/* --- Main Content Grid --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* --- Left Column: Charts (2/3 width) --- */}
                <div className="lg:col-span-2 space-y-8">
                    
                    {/* Chart 1: Bar Chart (Overview) */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-gray-800">จำนวนโครงการแยกตามสถานะ</h3>
                        </div>
                        <div className="h-72 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={stats.chartData}
                                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                                    <XAxis 
                                        dataKey="name" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{fill: '#9CA3AF', fontSize: 12}} 
                                        dy={10} 
                                    />
                                    <YAxis 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{fill: '#9CA3AF', fontSize: 12}} 
                                    />
                                    <Tooltip 
                                        cursor={{fill: '#F9FAFB'}} 
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px -5px rgba(0,0,0,0.1)' }} 
                                    />
                                    <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={50}>
                                        {stats.chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Chart 2: Pie Chart (Proportion) */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center gap-8">
                        <div className="flex-1 w-full">
                            <h3 className="text-lg font-bold text-gray-800 mb-2">สัดส่วนโครงการ</h3>
                            <p className="text-sm text-gray-500 mb-4">แสดงเปอร์เซ็นต์ของงานในแต่ละสถานะ</p>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={stats.chartData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {stats.chartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        {/* Summary Text Side */}
                        <div className="md:w-48 w-full bg-blue-50 p-4 rounded-xl border border-blue-100">
                            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">Highlight</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
                            <p className="text-sm text-gray-600 mb-3">โครงการกำลังวิ่ง</p>
                            <div className="w-full h-1 bg-blue-200 rounded-full mb-1">
                                <div className="h-1 bg-blue-500 rounded-full" style={{ width: `${(stats.active / stats.total) * 100}%` }}></div>
                            </div>
                            <p className="text-xs text-gray-400">
                                คิดเป็น {stats.total > 0 ? ((stats.active / stats.total) * 100).toFixed(0) : 0}% จากทั้งหมด
                            </p>
                        </div>
                    </div>

                </div>

                {/* --- Right Column: Recent Activity (1/3 width) --- */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <Activity size={20} className="text-blue-500" />
                            ความเคลื่อนไหวล่าสุด
                        </h3>
                    </div>

                    <div className="space-y-6">
                        {loadingLogs ? (
                            <div className="text-center text-gray-400 py-10">กำลังโหลด...</div>
                        ) : recentLogs.length > 0 ? (
                            recentLogs.map((log) => (
                                <div key={log.id} className="relative pl-6 border-l-2 border-gray-100 last:pb-0">
                                    <div className={`absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white ${
                                        log.action === 'CREATE' ? 'bg-green-500' :
                                        log.action === 'DELETE' ? 'bg-red-500' :
                                        log.action === 'UPDATE' ? 'bg-blue-500' : 'bg-yellow-500'
                                    }`}></div>
                                    
                                    <div className="flex flex-col gap-1">
                                        <p className="text-sm text-gray-800 font-medium line-clamp-2">
                                            {log.details}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-200">
                                                <User size={10} />
                                                {log.actor}
                                            </span>
                                            <span className="text-xs text-gray-400">
                                                {new Date(log.timestamp).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center text-gray-400 py-10 text-sm">
                                ยังไม่มีกิจกรรมเร็วๆ นี้
                            </div>
                        )}
                    </div>

                    <button className="w-full mt-6 py-2.5 text-sm text-blue-600 font-medium bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors flex justify-center items-center gap-2 group">
                        ดูประวัติทั้งหมด
                        <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>

            </div>
        </div>
    );
};

export default Dashboard;