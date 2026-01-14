import React, { useState } from 'react';
import { useProjects } from '../context/ProjectContext';
import { Project, ProjectStatus } from '../types';
import { Search, Plus, Filter, Edit2, Trash2, FileText, Eye, AlertCircle } from 'lucide-react';
import ProjectModal from './ProjectModal';
import { message, Modal } from 'antd'; 

// ✅ เพิ่ม Interface Props
interface ProjectListProps {
    onNavigateToTimeline?: (id: number) => void;
}

// รับ Props เข้ามา
const ProjectList: React.FC<ProjectListProps> = ({ onNavigateToTimeline }) => {
    const { projects, deleteProject } = useProjects();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'ALL'>('ALL');
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | undefined>(undefined);

    // ❌ ลบ State Modal Timeline เดิมออก เพราะไม่ใช้แล้ว

    const filteredProjects = projects.filter(project => {
        const term = searchTerm.toLowerCase();
        const matchesSearch = 
            (project.name || '').toLowerCase().includes(term) || 
            (project.code || '').toLowerCase().includes(term) ||
            (project.owner || '').toLowerCase().includes(term);

        const matchesStatus = statusFilter === 'ALL' || project.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const handleDelete = (id: number) => {
        Modal.confirm({
            title: 'ยืนยันการลบโครงการ',
            content: 'คุณแน่ใจหรือไม่ที่จะลบโครงการนี้? ข้อมูลและประวัติทั้งหมดจะหายไปและไม่สามารถกู้คืนได้',
            okText: 'ลบโครงการ',
            okType: 'danger',
            cancelText: 'ยกเลิก',
            centered: true,
            icon: <AlertCircle className="text-red-500" />,
            onOk: async () => {
                try {
                    await deleteProject(id);
                    message.success('ลบโครงการเรียบร้อยแล้ว');
                } catch (error) {
                    message.error('ไม่สามารถลบโครงการได้');
                }
            },
        });
    };

    const handleEdit = (project: Project) => {
        setEditingProject(project);
        setIsModalOpen(true);
    };

    const handleCreate = () => {
        setEditingProject(undefined);
        setIsModalOpen(true);
    };

    // ✅ เปลี่ยนฟังก์ชัน View Timeline ให้เปลี่ยนหน้า
    const handleViewTimeline = (project: Project) => {
        if (onNavigateToTimeline) {
            onNavigateToTimeline(project.id);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'DRAFT': return 'bg-gray-100 text-gray-600 border-gray-200';
            case 'PENDING': return 'bg-blue-50 text-blue-600 border-blue-200';
            case 'ACTIVE': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
            case 'HOLD': return 'bg-orange-50 text-orange-700 border-orange-200';
            case 'IN_PROGRESS': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
            case 'COMPLETED': return 'bg-green-50 text-green-700 border-green-200';
            case 'CANCELLED': return 'bg-red-50 text-red-700 border-red-200';
            default: return 'bg-gray-100 text-gray-600 border-gray-200';
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">จัดการโครงการ (Projects)</h1>
                    <p className="text-gray-500 mt-1">รายการโครงการทั้งหมด {filteredProjects.length} รายการ</p>
                </div>
                <button onClick={handleCreate} className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200">
                    <Plus size={20} className="mr-2" />เพิ่มโครงการใหม่
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input type="text" placeholder="ค้นหาชื่อโครงการ, รหัส, หรือผู้รับผิดชอบ..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                </div>
                <div className="flex items-center space-x-2 min-w-[200px]">
                    <Filter className="text-gray-400" size={20} />
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | 'ALL')} className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                        <option value="ALL">ทุกสถานะ</option>
                        <option value="DRAFT">Draft (ร่าง)</option>
                        <option value="PENDING">Pending (รอตรวจสอบ)</option>
                        <option value="ACTIVE">Active (กำลังดำเนินการ)</option>
                        <option value="IN_PROGRESS">In Progress (ระหว่างทำ)</option>
                        <option value="HOLD">Hold (พักโครงการ)</option>
                        <option value="COMPLETED">Completed (เสร็จสิ้น)</option>
                        <option value="CANCELLED">Cancelled (ยกเลิก)</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full whitespace-nowrap">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-left">
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">รหัสโครงการ</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">ชื่อโครงการ</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">งบประมาณ</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">สถานะ</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">ผู้รับผิดชอบ</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredProjects.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500"><div className="flex flex-col items-center justify-center"><FileText size={48} className="text-gray-300 mb-4" /><p>ไม่พบข้อมูลโครงการ</p></div></td></tr>
                            ) : (
                                filteredProjects.map((project) => (
                                    <tr key={project.id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="px-6 py-4"><span className="text-sm font-medium text-gray-900 font-mono">{project.code}</span></td>
                                        <td className="px-6 py-4"><div className="max-w-xs truncate"><p className="text-sm font-semibold text-gray-900">{project.name}</p><p className="text-xs text-gray-500 truncate">{project.description}</p></div></td>
                                        <td className="px-6 py-4"><span className="text-sm text-gray-700 font-medium">฿{Number(project.budget).toLocaleString()}</span></td>
                                        <td className="px-6 py-4"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(project.status)}`}>{project.status}</span></td>
                                        <td className="px-6 py-4"><div className="flex items-center"><div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold mr-2">{project.owner.charAt(0)}</div><span className="text-sm text-gray-600">{project.owner}</span></div></td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {/* ✅ ปุ่มดูรายละเอียด (เปลี่ยนหน้า) */}
                                                <button onClick={() => handleViewTimeline(project)} className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="ดูรายละเอียด Timeline"><Eye size={16} /></button>
                                                <button onClick={() => handleEdit(project)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="แก้ไข"><Edit2 size={16} /></button>
                                                <button onClick={() => handleDelete(project.id)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="ลบ"><Trash2 size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && <ProjectModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} initialData={editingProject} />}
        </div>
    );
};
export default ProjectList;