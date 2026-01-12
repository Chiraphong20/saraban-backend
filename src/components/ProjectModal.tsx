import React, { useState, useEffect } from 'react';
import { useProjects } from '../context/ProjectContext';
import { Project, ProjectStatus } from '../types';
import { X, Save, RefreshCw } from 'lucide-react';

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

const ProjectModal: React.FC<ProjectModalProps> = ({ isOpen, onClose, initialData }) => {
    // 1. เพิ่มการดึง 'projects' ออกมาเพื่อใช้คำนวณเลขลำดับ
    const { projects, addProject, updateProject } = useProjects();
    
    const [acronym, setAcronym] = useState('');
    const [projectTypeCode, setProjectTypeCode] = useState('P');
    
    const [formData, setFormData] = useState<Partial<Project>>({
        code: '',
        name: '',
        owner: '',
        budget: 0,
        startDate: '',
        endDate: '',
        status: 'DRAFT',
        description: ''
    });

    // --- ฟังก์ชันสร้างรหัสแบบรันเลข (Auto Increment) ---
    const generateCode = (acr: string, type: string) => {
        const prefix = acr ? acr.toUpperCase() : 'XXX';
        const currentYear = new Date().getFullYear();
        const yearShort = currentYear.toString().slice(-2); // "25"
        
        // ลอจิกการหาเลขลำดับล่าสุด
        let maxSequence = 0;

        // วนลูปเช็คโครงการทั้งหมดที่มีอยู่
        if (projects && projects.length > 0) {
            projects.forEach(p => {
                // สมมติ format เป็น: PREFIX-YY-TYPExxx (เช่น GS-25-P001)
                const parts = p.code.split('-');
                
                // ต้องมี 3 ส่วน และส่วนกลางต้องตรงกับปีปัจจุบัน (25)
                if (parts.length === 3 && parts[1] === yearShort) {
                    const typeAndSeq = parts[2]; // เช่น P001, SP005
                    
                    // เช็คว่าส่วนท้ายขึ้นต้นด้วย Type ที่เราเลือกหรือไม่ (เช่น P)
                    if (typeAndSeq.startsWith(type)) {
                        // ตัด Type ออกเพื่อเอาตัวเลข (P001 -> 001)
                        const seqString = typeAndSeq.substring(type.length);
                        
                        // แปลงเป็นตัวเลขและตรวจสอบว่าเป็นตัวเลขจริงๆ หรือไม่
                        const seqNumber = parseInt(seqString, 10);
                        if (!isNaN(seqNumber)) {
                            // ถ้าเลขนี้มากกว่าที่เคยเจอ ให้จำไว้เป็นค่าสูงสุด
                            if (seqNumber > maxSequence) {
                                maxSequence = seqNumber;
                            }
                        }
                    }
                }
            });
        }

        // เลขถัดไป = เลขสูงสุด + 1
        const nextSequence = maxSequence + 1;
        const sequenceStr = nextSequence.toString().padStart(3, '0'); // เติม 0 ข้างหน้าให้ครบ 3 หลัก

        // รวมร่าง: GS-25-P001
        return `${prefix}-${yearShort}-${type}${sequenceStr}`;
    };

    // อัปเดตรหัสทันทีเมื่อมีการเปลี่ยน Acronym หรือ Type (เฉพาะตอนสร้างใหม่)
    useEffect(() => {
        if (!initialData) {
            const newCode = generateCode(acronym, projectTypeCode);
            setFormData(prev => ({ ...prev, code: newCode }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [acronym, projectTypeCode, initialData, projects]); // เพิ่ม projects ใน dependency เพื่อให้คำนวณใหม่ถ้าข้อมูลเปลี่ยน

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
            const parts = initialData.code.split('-');
            if (parts.length >= 2) {
                setAcronym(parts[0]);
                // พยายามดึง Type จากส่วนท้าย (เช่น P001 -> P)
                // (อาจจะซับซ้อนหน่อยถ้า Type ยาวไม่เท่ากัน แต่เอาแบบง่ายคือดูว่ามัน Match กับ list เราไหม)
                const lastPart = parts[2] || '';
                const foundType = PROJECT_TYPES.find(t => lastPart.startsWith(t.code));
                if (foundType) {
                    setProjectTypeCode(foundType.code);
                }
            }
        } else {
            setAcronym('');
            setProjectTypeCode('P');
            setFormData({
                // เรียกใช้ฟังก์ชัน generateCode เพื่อเริ่มรหัสแรก
                code: generateCode('', 'P'), 
                name: '',
                owner: '',
                budget: 0,
                startDate: new Date().toISOString().split('T')[0],
                endDate: '',
                status: 'DRAFT',
                description: ''
            });
        }
    }, [initialData, isOpen]);

    const handleNameChange = (val: string) => {
        setFormData({ ...formData, name: val });
        if (!initialData && !acronym) {
            const words = val.trim().split(/\s+/);
            if (words.length > 0) {
                let generatedAcronym = '';
                if (words.length > 1) {
                    generatedAcronym = words.map(w => w.charAt(0)).join('').substring(0, 3);
                } else {
                    generatedAcronym = words[0].substring(0, 2);
                }
                setAcronym(generatedAcronym.toUpperCase());
            }
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (initialData) {
            updateProject(initialData.id, formData);
        } else {
            if (!formData.name || !formData.code) return;
            addProject(formData as Omit<Project, 'id'>);
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity bg-black bg-opacity-60" onClick={onClose}></div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="inline-block w-full max-w-2xl px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-white rounded-2xl shadow-xl sm:my-8 sm:align-middle sm:p-6 animate-fade-in-up">
                    <div className="flex justify-between items-center mb-5 pb-4 border-b border-gray-100">
                        <h3 className="text-xl font-bold text-gray-900">
                            {initialData ? 'แก้ไขโครงการ' : 'เพิ่มโครงการใหม่'}
                        </h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                            <X size={24} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        
                        {/* --- ส่วน Config รหัสโครงการ --- */}
                        {!initialData && (
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
                                <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center">
                                    <RefreshCw size={16} className="mr-2 text-blue-600" /> 
                                    ตั้งค่ารหัสโครงการ
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                    <div className="md:col-span-4">
                                        <label className="block text-xs font-semibold text-slate-500 mb-1">ตัวย่อ (Acronym)</label>
                                        <input
                                            type="text"
                                            value={acronym}
                                            onChange={(e) => setAcronym(e.target.value.toUpperCase())}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 uppercase font-bold text-blue-700"
                                            placeholder="เช่น GS"
                                        />
                                        <p className="text-[10px] text-slate-400 mt-1">มาจากชื่อโครงการ (Grow Store)</p>
                                    </div>
                                    <div className="md:col-span-8">
                                        <label className="block text-xs font-semibold text-slate-500 mb-1">ประเภท/ขนาด (Type)</label>
                                        <select
                                            value={projectTypeCode}
                                            onChange={(e) => setProjectTypeCode(e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                                        >
                                            {PROJECT_TYPES.map(type => (
                                                <option key={type.code} value={type.code}>
                                                    {type.code} - {type.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">รหัสโครงการ (Auto)</label>
                                <input
                                    type="text"
                                    required
                                    readOnly
                                    value={formData.code}
                                    onChange={(e) => setFormData({...formData, code: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 font-mono font-bold cursor-not-allowed"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ผู้รับผิดชอบ</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.owner}
                                    onChange={(e) => setFormData({...formData, owner: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="ระบุชื่อผู้รับผิดชอบ"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อโครงการ</label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => handleNameChange(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="เช่น Grow Store"
                            />
                        </div>
                        {/* ส่วนที่เหลือคงเดิม ... */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">รายละเอียดโดยย่อ</label>
                            <textarea
                                rows={3}
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="อธิบายขอบเขตงานพอสังเขป..."
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">งบประมาณ (บาท)</label>
                                <input
                                    type="number"
                                    min="0"
                                    required
                                    value={formData.budget}
                                    onChange={(e) => setFormData({...formData, budget: Number(e.target.value)})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">สถานะ</label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({...formData, status: e.target.value as ProjectStatus})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                                >
                                    <option value="DRAFT">Draft</option>
                                    <option value="ACTIVE">Active</option>
                                    <option value="HOLD">Hold</option>
                                    <option value="COMPLETED">Completed</option>
                                    <option value="CANCELLED">Cancelled</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">วันที่เริ่ม</label>
                                <input
                                    type="date"
                                    value={formData.startDate}
                                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">วันที่สิ้นสุด</label>
                                <input
                                    type="date"
                                    value={formData.endDate}
                                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                ยกเลิก
                            </button>
                            <button
                                type="submit"
                                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm"
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