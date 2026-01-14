import React, { useState, useEffect } from 'react';
import { useProjects } from '../context/ProjectContext';
import { Project } from '../types';
import { X, Save, Lock, Tag, Hash, Calendar, Activity } from 'lucide-react';
// 1. Import จาก antd
import { message } from 'antd'; 

interface ProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialData?: Project;
}

const PROJECT_TYPES = [
    { code: 'P', label: 'Project (โครงการทั่วไป/ใหญ่)' },
    { code: 'SP', label: 'Sub Project (โครงการย่อย)' },
    { code: 'I', label: 'Innovation (นวัตกรรม)' },
    { code: 'C', label: 'Consulting (ที่ปรึกษา)' },
    { code: 'B', label: 'Booth (บูธ/อีเวนต์)' },
    { code: 'FND', label: 'Funding (ทุนสนับสนุน)' }
];

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
    'DRAFT': { label: 'Draft (ร่างโครงการ)', className: 'bg-gray-100 text-gray-600 border-gray-300' },
    'PENDING': { label: 'Pending (รอตรวจสอบ)', className: 'bg-blue-50 text-blue-600 border-blue-200' },
    'ACTIVE': { label: 'Active (กำลังดำเนินการ)', className: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
    'HOLD': { label: 'Hold (พักโครงการ)', className: 'bg-orange-50 text-orange-700 border-orange-200' },
    'IN_PROGRESS': { label: 'In Progress (ระหว่างทำ)', className: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    'COMPLETED': { label: 'Completed (เสร็จสิ้น)', className: 'bg-green-50 text-green-700 border-green-200' },
    'CANCELLED': { label: 'Cancelled (ยกเลิก)', className: 'bg-red-50 text-red-700 border-red-200' }
};

const ProjectModal: React.FC<ProjectModalProps> = ({ isOpen, onClose, initialData }) => {
    const { projects, addProject, updateProject } = useProjects();
    const [acronym, setAcronym] = useState('');
    const [projectTypeCode, setProjectTypeCode] = useState('P');
    const [formData, setFormData] = useState<Partial<Project>>({
        code: '', name: '', description: '', owner: '', budget: 0, status: 'DRAFT', startDate: '', endDate: ''
    });

    // ... (ส่วน Logic generateCode เดิม ไม่ต้องแก้)
    const generateCode = (acr: string, type: string) => {
        const prefix = acr ? acr.toUpperCase() : 'XXX';
        const currentYear = new Date().getFullYear();
        const yearShort = currentYear.toString().slice(-2); 
        let maxSequence = 0;
        if (projects && projects.length > 0) {
            projects.forEach(p => {
                const parts = p.code.split('-');
                if (parts.length === 3 && parts[1] === yearShort) {
                    const typeAndSeq = parts[2];
                    if (typeAndSeq.startsWith(type)) {
                        const seqString = typeAndSeq.substring(type.length);
                        const seqNumber = parseInt(seqString, 10);
                        if (!isNaN(seqNumber) && seqNumber > maxSequence) maxSequence = seqNumber;
                    }
                }
            });
        }
        const nextSequence = maxSequence + 1;
        const sequenceStr = nextSequence.toString().padStart(3, '0');
        return `${prefix}-${yearShort}-${type}${sequenceStr}`;
    };

    useEffect(() => {
        if (!initialData) {
            const newCode = generateCode(acronym, projectTypeCode);
            setFormData(prev => ({ ...prev, code: newCode }));
        }
    }, [acronym, projectTypeCode, initialData, projects]);

    useEffect(() => {
        if (initialData) {
            setFormData({
                ...initialData,
                budget: Number(initialData.budget),
                startDate: initialData.startDate ? initialData.startDate.split('T')[0] : '',
                endDate: initialData.endDate ? initialData.endDate.split('T')[0] : ''
            });
            const parts = initialData.code.split('-');
            if (parts.length >= 3) {
                setAcronym(parts[0]);
                const lastPart = parts[2] || '';
                const foundType = PROJECT_TYPES.sort((a, b) => b.code.length - a.code.length).find(t => lastPart.startsWith(t.code));
                if (foundType) setProjectTypeCode(foundType.code);
            }
        } else {
            setAcronym(''); setProjectTypeCode('P');
            setFormData({
                code: '', name: '', description: '', owner: '', budget: 0, status: 'DRAFT', startDate: new Date().toISOString().split('T')[0], endDate: ''
            });
        }
    }, [initialData, isOpen]);

    const handleNameChange = (val: string) => {
        setFormData(prev => ({ ...prev, name: val }));
        if (!initialData) {
            const words = val.trim().split(/\s+/);
            if (words.length > 0 && val.length > 0) {
                let generatedAcronym = '';
                if (words.length > 1) generatedAcronym = words.slice(0, 3).map(w => w.charAt(0)).join('');
                else generatedAcronym = words[0].substring(0, 3);
                setAcronym(generatedAcronym.toUpperCase());
            } else { setAcronym(''); }
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (initialData && initialData.id) {
                await updateProject(initialData.id, formData);
                // ✅ 2. แสดง Alert แก้ไขสำเร็จ
                message.success('บันทึกการแก้ไขโครงการเรียบร้อยแล้ว');
            } else {
                if (!formData.name || !formData.code) return;
                await addProject(formData as Project);
                // ✅ 3. แสดง Alert สร้างสำเร็จ
                message.success('สร้างโครงการใหม่เรียบร้อยแล้ว');
            }
            onClose();
        } catch (error) {
            console.error(error);
            // ✅ 4. แสดง Alert Error
            message.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
        }
    };

    if (!isOpen) return null;
    const currentStatusStyle = STATUS_CONFIG[formData.status || 'DRAFT']?.className || 'border-gray-300';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6 border-b pb-4">
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            {initialData ? '✏️ แก้ไขโครงการ' : '🚀 สร้างโครงการใหม่'}
                        </h2>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={24} className="text-gray-500" /></button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100">
                            <h3 className="text-sm font-bold text-blue-800 mb-3 flex items-center gap-2"><Hash size={16} /> โครงสร้างรหัสโครงการ</h3>
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                <div className="md:col-span-3">
                                    <label className="block text-xs font-medium text-gray-500 mb-1">ตัวย่อ (Acronym)</label>
                                    <div className="relative">
                                        <input type="text" value={acronym} onChange={(e) => setAcronym(e.target.value.toUpperCase())} maxLength={5} disabled={!!initialData} className="w-full pl-8 pr-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 uppercase font-bold text-gray-700" />
                                        <Tag size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                    </div>
                                </div>
                                <div className="md:col-span-4">
                                    <label className="block text-xs font-medium text-gray-500 mb-1">ประเภท</label>
                                    <select value={projectTypeCode} onChange={(e) => setProjectTypeCode(e.target.value)} disabled={!!initialData} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm">
                                        {PROJECT_TYPES.map(t => (<option key={t.code} value={t.code}>{t.label}</option>))}
                                    </select>
                                </div>
                                <div className="md:col-span-5">
                                    <label className="block text-xs font-medium text-blue-600 mb-1">รหัสโครงการ (Auto)</label>
                                    <div className="relative">
                                        <input type="text" value={formData.code} readOnly className="w-full pl-9 pr-3 py-2 bg-blue-100 border border-blue-200 rounded-lg text-blue-800 font-mono font-bold cursor-not-allowed" />
                                        <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อโครงการ <span className="text-red-500">*</span></label>
                                <input type="text" name="name" value={formData.name} onChange={(e) => handleNameChange(e.target.value)} required placeholder="ระบุชื่อโครงการ..." className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><Activity size={14} /> สถานะ</label>
                                    <div className="relative">
                                        <select name="status" value={formData.status} onChange={handleChange} className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none font-medium transition-colors ${currentStatusStyle}`}>
                                            {Object.keys(STATUS_CONFIG).map(key => (<option key={key} value={key}>{STATUS_CONFIG[key].label}</option>))}
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500"><svg className="fill-current h-4 w-4" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg></div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">ผู้รับผิดชอบ</label>
                                    <input type="text" name="owner" value={formData.owner} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">งบประมาณ (บาท)</label><input type="number" name="budget" value={formData.budget} onChange={handleChange} min="0" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" /></div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><Calendar size={14} /> วันที่เริ่ม</label><input type="date" name="startDate" value={formData.startDate} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" /></div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><Calendar size={14} /> วันที่สิ้นสุด</label><input type="date" name="endDate" value={formData.endDate} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" /></div>
                            </div>
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">รายละเอียด</label><textarea name="description" value={formData.description} onChange={handleChange} rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none" /></div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">ยกเลิก</button>
                            <button type="submit" className="inline-flex items-center px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all hover:-translate-y-0.5">
                                <Save size={18} className="mr-2" />{initialData ? 'บันทึกการแก้ไข' : 'สร้างโครงการ'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
export default ProjectModal;