import React, { useState } from 'react';
import { useProjects } from '../context/ProjectContext';
import { Project, ProjectStatus } from '../types';
import { Search, Plus, Filter, Edit2, Trash2, FileText, Eye, AlertCircle, Calendar } from 'lucide-react';
import ProjectModal from './ProjectModal';
import { message, Modal } from 'antd'; 

// 1. ✅ Import useNavigate จาก Router
import { useNavigate } from 'react-router-dom';

const ProjectList: React.FC = () => {
    const { projects, deleteProject } = useProjects();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'ALL'>('ALL');
    
    // State สำหรับ Modal แก้ไข/สร้าง
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | undefined>(undefined);

    // 2. ✅ เรียกใช้ Hook
    const navigate = useNavigate();

    // Filter Logic
    const filteredProjects = projects.filter(project => {
        const term = searchTerm.toLowerCase();
        const matchesSearch = 
            (project.name || '').toLowerCase().includes(term) || 
            (project.code || '').toLowerCase().includes(term) ||
            (project.owner || '').toLowerCase().includes(term);

        const matchesStatus = statusFilter === 'ALL' || project.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    // Delete Logic
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

    // 3. ✅ แก้ฟังก์ชันนี้ให้ใช้ navigate ของ Router
    const handleViewTimeline = (project: Project) => {
        navigate(`/project/${project.id}/timeline`);
    };

    // Helper สีสถานะ
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'IDEA': return 'bg-purple-50 text-purple-700 border-purple-200'; 
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
        <div className="space-y-6 animate-fade-in pb-20">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900">จัดการโครงการ (Projects)</h1>
                    <p className="text-sm text-gray-500 mt-1">รายการโครงการทั้งหมด {filteredProjects.length} รายการ</p>
                </div>
                <button 
                    onClick={handleCreate}
                    className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200 text-sm md:text-base"
                >
                    <Plus size={20} className="mr-2" />
                    เพิ่มโครงการใหม่
                </button>
            </div>

            {/* Filters Section */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input 
                        type="text" 
                        placeholder="ค้นหาชื่อโครงการ, รหัส, หรือผู้รับผิดชอบ..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                    />
                </div>
                <div className="flex items-center space-x-2 md:min-w-[200px]">
                    <Filter className="text-gray-400" size={20} />
                    <select 
                        value={statusFilter} 
                        onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | 'ALL')} 
                        className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                    >
                        <option value="IDEA">Idea (ริเริ่ม)</option>
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

            {/* ✅ Desktop Table View (Hidden on Mobile) */}
            <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
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
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <FileText size={48} className="text-gray-300 mb-4" />
                                            <p>ไม่พบข้อมูลโครงการ</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredProjects.map((project) => (
                                    <tr key={project.id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-medium text-gray-900 font-mono">{project.code}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="max-w-xs truncate">
                                                <p className="text-sm font-semibold text-gray-900">{project.name}</p>
                                                <p className="text-xs text-gray-500 truncate">{project.description}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-gray-700 font-medium">฿{Number(project.budget).toLocaleString()}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(project.status)}`}>
                                                {project.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold mr-2">
                                                    {project.owner.charAt(0)}
                                                </div>
                                                <span className="text-sm text-gray-600">{project.owner}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end space-x-2">
                                                <button 
                                                    onClick={() => handleViewTimeline(project)}
                                                    className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                    title="ดูแผนงานและ Timeline"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => handleEdit(project)}
                                                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="แก้ไข"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(project.id)}
                                                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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

            {/* ✅ Mobile Card View (Visible only on Mobile) */}
            <div className="md:hidden space-y-4">
                {filteredProjects.length === 0 ? (
                     <div className="text-center p-8 bg-white rounded-xl border border-dashed border-gray-300 text-gray-400">
                        <FileText size={32} className="mx-auto mb-2 opacity-50" />
                        <p>ไม่พบข้อมูลโครงการ</p>
                     </div>
                ) : (
                    filteredProjects.map(project => (
                        <div key={project.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                            {/* Card Header: Code & Status */}
                            <div className="flex justify-between items-start mb-3">
                                <span className="font-mono text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                    {project.code}
                                </span>
                                <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusColor(project.status)}`}>
                                    {project.status}
                                </span>
                            </div>
                            
                            {/* Card Body: Name & Desc */}
                            <div className="mb-4">
                                <h3 className="font-bold text-gray-900 text-lg leading-tight mb-1">{project.name}</h3>
                                <p className="text-sm text-gray-500 line-clamp-2">{project.description || '-'}</p>
                            </div>
                            
                            {/* Card Info: Budget & Owner */}
                            <div className="flex justify-between items-center text-sm text-gray-600 mb-4 border-t border-b border-gray-50 py-3 bg-gray-50/50 -mx-4 px-4">
                                <div className="font-semibold text-gray-700">
                                    ฿{Number(project.budget).toLocaleString()}
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold">
                                        {project.owner.charAt(0)}
                                    </div>
                                    <span className="text-xs truncate max-w-[100px]">{project.owner}</span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="grid grid-cols-3 gap-2">
                                <button 
                                    onClick={() => handleViewTimeline(project)}
                                    className="flex items-center justify-center gap-1 py-2 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-medium hover:bg-indigo-100 transition-colors"
                                >
                                    <Eye size={14} /> Timeline
                                </button>
                                <button 
                                    onClick={() => handleEdit(project)}
                                    className="flex items-center justify-center gap-1 py-2 rounded-lg bg-blue-50 text-blue-600 text-xs font-medium hover:bg-blue-100 transition-colors"
                                >
                                    <Edit2 size={14} /> แก้ไข
                                </button>
                                <button 
                                    onClick={() => handleDelete(project.id)}
                                    className="flex items-center justify-center gap-1 py-2 rounded-lg bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 transition-colors"
                                >
                                    <Trash2 size={14} /> ลบ
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal สำหรับสร้าง/แก้ไข */}
            {isModalOpen && (
                <ProjectModal 
                    isOpen={isModalOpen} 
                    onClose={() => setIsModalOpen(false)} 
                    initialData={editingProject} 
                />
            )}
        </div>
    );
};

export default ProjectList;