import React from 'react';
import { useProjects } from '../context/ProjectContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Wallet, CheckCircle, Clock, FolderOpen } from 'lucide-react';

// สีตามลำดับ: Active(เหลือง), Pending(ฟ้า), Completed(เขียว), Cancelled(แดง), Draft(เทา)
const COLORS = ['#EAB308', '#3B82F6', '#10B981', '#EF4444', '#6B7280'];

const StatCard = ({ title, value, icon: Icon, color, subtext }: any) => (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
            <div>
                <p className="text-sm font-medium text-gray-500">{title}</p>
                <h3 className="mt-2 text-3xl font-bold text-gray-900">{value}</h3>
            </div>
            <div className={`p-3 rounded-xl ${color}`}>
                <Icon size={24} className="text-white" />
            </div>
        </div>
        {subtext && <p className="mt-4 text-sm text-gray-600">{subtext}</p>}
    </div>
);

const Dashboard: React.FC = () => {
    const { getStats } = useProjects();
    const stats = getStats();

    // ฟังก์ชันแปลงตัวเลขเงินให้สวยงาม (ใส่ลูกน้ำ)
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('th-TH', {
            style: 'currency',
            currency: 'THB',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    // ฟังก์ชันย่อตัวเลขเงิน (เช่น 1.5M)
    const formatBudgetShort = (amount: number) => {
        if (amount >= 1000000) return `฿${(amount / 1000000).toFixed(2)}M`;
        if (amount >= 1000) return `฿${(amount / 1000).toFixed(1)}K`;
        return `฿${amount}`;
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">ภาพรวมโครงการ (Dashboard)</h1>
                <p className="text-gray-500 mt-1">สรุปสถานะและงบประมาณประจำปี 2568</p>
            </div>

            {/* --- ส่วน Card แสดงตัวเลข --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    title="โครงการทั้งหมด" 
                    value={stats.total} 
                    icon={FolderOpen} 
                    color="bg-blue-500"
                    subtext="ทุกสถานะในปีงบประมาณ"
                />
                <StatCard 
                    title="ดำเนินการอยู่ (Active)" 
                    value={stats.active} 
                    icon={Clock} 
                    color="bg-yellow-500"
                    subtext="โครงการที่กำลังขับเคลื่อน"
                />
                <StatCard 
                    title="เสร็จสิ้น (Completed)" 
                    value={stats.completed} 
                    icon={CheckCircle} 
                    color="bg-emerald-500"
                    subtext="โครงการที่ปิดงานแล้ว"
                />
                <StatCard 
                    title="งบประมาณรวม" 
                    value={formatBudgetShort(stats.totalBudget)} 
                    icon={Wallet} 
                    color="bg-indigo-500"
                    subtext={`รวมทั้งหมด ${formatCurrency(stats.totalBudget)}`}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* --- Chart 1: Pie Chart --- */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-6">สัดส่วนสถานะโครงการ</h3>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stats.chartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                    label={({ name, percent }) => percent > 0 ? `${(percent * 100).toFixed(0)}%` : ''}
                                >
                                    {stats.chartData.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => [value, 'จำนวนโครงการ']} />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* --- Chart 2: Bar Chart --- */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-6">จำนวนโครงการแยกตามสถานะ</h3>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={stats.chartData}
                                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} allowDecimals={false} />
                                <Tooltip cursor={{fill: 'transparent'}} />
                                <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                                    {stats.chartData.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;