import React, { useState, useEffect } from 'react';
import { useProjects } from '../context/ProjectContext';
import { Project } from '../types';
import { X, Save, RefreshCw } from 'lucide-react';

interface ProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialData?: Project;
}

// ประเภทโครงการสำหรับระบบ Auto-Gen Code
const PROJECT_TYPES = [
    { code: 'P', label: 'Project (โครงการทั่วไป/ใหญ่)' },
    { code: 'SP', label: 'Sub Project (โครงการย่อย)' },
    { code: 'I', label: 'Innovation (นวัตกรรม)' },
    { code: 'C', label: 'Consulting (ที่ปรึกษา)' },
    { code: 'B', label: 'Booth (บูธ/อีเวนต์)' },
    { code: 'FND', label: 'Funding (ทุนสนับสนุน)' }
];

// ✅ ตัวเลือกสถานะครบถ้วน (ตรงกับที่ Database รองรับ)
const STATUS_OPTIONS = [
    { value: 'DRAFT', label: 'Draft (ร่างโครงการ)' },
    { value: 'PENDING', label: 'Pending (รอตรวจสอบ)' },
    { value: 'ACTIVE', label: 'Active (กำลังดำเนินการ)' }, // 🟢 สำคัญ
    { value: 'HOLD', label: 'Hold (พักโครงการ)' },         // 🔵 สำคัญ
    { value: 'IN_PROGRESS', label: 'In Progress (ระหว่างทำ)' },
    { value: 'COMPLETED', label: 'Completed (เสร็จสิ้น)' },
    { value: 'CANCELLED', label: 'Cancelled (ยกเลิก)' }
];

const ProjectModal: React.FC<ProjectModalProps> = ({ isOpen, onClose, initialData }) => {
    const { projects, addProject, updateProject } = useProjects();
    
    // State สำหรับ Auto-Gen Code
    const [acronym, setAcronym] = useState('');
    const [projectTypeCode, setProjectTypeCode] = useState('P');
    
    // State สำหรับ Form Data
    const [formData, setFormData] = useState<Partial<Project>>({
        code: '',
        name: '',
        description: '',
        owner: '',
        budget: 0,
        status: 'DRAFT',
        startDate: '',
        endDate: ''
    });

    // โหลดข้อมูลเดิมเมื่อเปิด Modal (กรณีแก้ไข)
    useEffect(() => {
        if (initialData) {
            setFormData({
                ...initialData,
                budget: Number(initialData.budget), // แปลงเป็นตัวเลข
                // ตัดเวลา T00:00:00 ออก เพื่อให้ใส่ใน <input type="date"> ได้
                startDate: initialData.startDate ? initialData.startDate.split('T')[0] : '',
                endDate: initialData.endDate ? initialData.endDate.split('T')[0] : ''
            });

            // พยายามดึง Acronym จากรหัสเดิม (เช่น 68-HR-P-001 -> ดึง HR)
            const parts = initialData.code?.split('-');
            if (parts && parts.length >= 3) {
                setAcronym(parts[1]); 
            }
        } else {
            // กรณีสร้างใหม่ Reset ค่า
            setFormData({
                code: '',
                name: '',
                description: '',
                owner: '',
                budget: 0,
                status: 'DRAFT',
                startDate: '',
                endDate: ''
            });
            setAcronym('');
        }
    }, [initialData, isOpen]);

    // ฟังก์ชันสร้างรหัสอัตโนมัติ (แก้ไขได้)
    const generateCode = () => {
        if (!acronym) {
            alert("กรุณากรอกตัวย่อโครงการ (Acronym) ก่อนสร้างรหัส");
            return;
        }
        const currentYear = new Date().getFullYear() + 543; // ปี พ.ศ.
        const yearShort = String(currentYear).slice(-2);    // 68
        
        // นับจำนวนโครงการในปีนี้
        const count = projects.filter(p => p.code.startsWith(yearShort)).length + 1;
        const runNumber = String(count).padStart(3, '0');

        // Format: 68-HR-P-001
        const newCode = `${yearShort}-${acronym.toUpperCase()}-${projectTypeCode}-${runNumber}`;
        setFormData(prev => ({ ...prev, code: newCode }));
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (initialData && initialData.id) {
                // โหมดแก้ไข: ส่งข้อมูลไป Update
                await updateProject(initialData.id, formData);
            } else {
                // โหมดสร้างใหม่: ส่งข้อมูลไป Create
                await addProject(formData as Project);
            }
            onClose(); // ปิด Modal เมื่อสำเร็จ
        } catch (error) {
            console.error(error);
            alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-6 border-b pb-4">
                        <h2 className="text-xl font-bold text-gray-800">
                            {initialData ? '✏️ แก้ไขโครงการ' : '➕ สร้างโครงการใหม่'}
                        </h2>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <X size={24} className="text-gray-500" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        
                        {/* Section 1: ส่วนสร้างรหัส (ใช้ได้ทั้งสร้างใหม่และแก้ไข) */}
                        <div className="bg-blue-50 p-5 rounded-xl border border-blue-100 shadow-sm">
                            <h3 className="text-sm font-semibold text-blue-800 flex items-center gap-2 mb-3">
                                <RefreshCw size={16} /> เครื่องมือสร้างรหัส (Optional)
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">ตัวย่อ (Acronym)</label>
                                    <input
                                        type="text"
                                        value={acronym}
                                        onChange={(e) => setAcronym(e.target.value.toUpperCase())}
                                        placeholder="เช่น IT, HR"
                                        className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none uppercase text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">ประเภท</label>
                                    <select
                                        value={projectTypeCode}
                                        onChange={(e) => setProjectTypeCode(e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                    >
                                        {PROJECT_TYPES.map(t => (
                                            <option key={t.code} value={t.code}>{t.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex items-end">
                                    <button
                                        type="button"
                                        onClick={generateCode}
                                        className="w-full px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-all shadow-sm active:scale-95"
                                    >
                                        กดสร้างรหัส
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Section 2: ข้อมูลหลัก (แก้ไขได้ทุกช่อง) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            
                            {/* รหัสโครงการ - แก้ไขมือได้ */}
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    รหัสโครงการ <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="code"
                                    value={formData.code}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono text-blue-900 bg-gray-50 focus:bg-white"
                                    placeholder="เช่น 68-IT-P-001"
                                />
                            </div>

                            {/* สถานะ - เลือกได้ครบ */}
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    สถานะปัจจุบัน
                                </label>
                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                >
                                    {STATUS_OPTIONS.map(status => (
                                        <option key={status.value} value={status.value}>
                                            {status.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    ชื่อโครงการ <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    placeholder="ระบุชื่อโครงการ"
                                />
                            </div>

                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">รายละเอียด</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    rows={3}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                                    placeholder="รายละเอียดสังเขป..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ผู้รับผิดชอบ</label>
                                <input
                                    type="text"
                                    name="owner"
                                    value={formData.owner}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">งบประมาณ (บาท)</label>
                                <input
                                    type="number"
                                    name="budget"
                                    value={formData.budget}
                                    onChange={handleChange}
                                    min="0"
                                    step="0.01"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">วันที่เริ่ม</label>
                                <input
                                    type="date"
                                    name="startDate"
                                    value={formData.startDate}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">วันที่สิ้นสุด</label>
                                <input
                                    type="date"
                                    name="endDate"
                                    value={formData.endDate}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                />
                            </div>
                        </div>

                        {/* Footer Buttons */}
                        <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                            >
                                ยกเลิก
                            </button>
                            <button
                                type="submit"
                                className="inline-flex items-center px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all hover:-translate-y-0.5"
                            >
                                <Save size={18} className="mr-2" />
                                บันทึกข้อมูล
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ProjectModal;