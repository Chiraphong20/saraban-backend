import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { Project } from '../types'; // ตรวจสอบ path ให้ตรงกับไฟล์ types.ts ของคุณ

// URL ของ Backend (Render)
const API_URL = 'https://saraban-backend.onrender.com/api/projects';

// Interface สำหรับ Context
interface ProjectContextType {
    projects: Project[];
    loading: boolean;
    error: string | null;
    fetchProjects: () => Promise<void>;
    addProject: (project: Omit<Project, 'id' | 'updated_at'>) => Promise<void>;
    updateProject: (id: number, updatedData: Partial<Project>) => Promise<void>;
    deleteProject: (id: number) => Promise<void>;
    getStats: () => {
        total: number;
        active: number;
        completed: number;
        totalBudget: number;
        chartData: { name: string; value: number }[];
    };
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { token } = useAuth();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // --- 1. Fetch Projects (ดึงข้อมูล) ---
    const fetchProjects = useCallback(async () => {
        if (!token) return; // ถ้าไม่มี Token ยังไม่ดึง

        setLoading(true);
        try {
            // ส่ง Token ไปใน Header (แม้ AuthContext จะ set default แล้ว แต่ใส่ย้ำเพื่อความชัวร์)
            const response = await axios.get(API_URL, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setProjects(response.data);
            setError(null);
        } catch (err: any) {
            console.error("Error fetching projects:", err);
            setError(err.response?.data?.message || 'Failed to fetch projects');
        } finally {
            setLoading(false);
        }
    }, [token]);

    // ดึงข้อมูลเมื่อ component โหลด หรือ token เปลี่ยน
    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

    // --- 2. Add Project (เพิ่ม) ---
    const addProject = async (projectData: Omit<Project, 'id' | 'updated_at'>) => {
        try {
            await axios.post(API_URL, projectData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            await fetchProjects(); // ดึงข้อมูลใหม่ทันที
        } catch (err: any) {
            console.error("Error adding project:", err);
            throw err;
        }
    };

    // --- 3. Update Project (แก้ไข) ---
    const updateProject = async (id: number, updatedData: Partial<Project>) => {
        try {
            await axios.put(`${API_URL}/${id}`, updatedData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            await fetchProjects(); // ดึงข้อมูลใหม่ทันที
        } catch (err: any) {
            console.error("Error updating project:", err);
            throw err;
        }
    };

    // --- 4. Delete Project (ลบ) ---
    const deleteProject = async (id: number) => {
        if (!window.confirm("คุณแน่ใจหรือไม่ที่จะลบโครงการนี้?")) return;

        try {
            await axios.delete(`${API_URL}/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // อัปเดต State ทันทีโดยไม่ต้องรอโหลดใหม่ (Optimistic Update)
            setProjects(prev => prev.filter(p => p.id !== id));
        } catch (err: any) {
            console.error("Error deleting project:", err);
            alert("ลบไม่สำเร็จ: " + (err.response?.data?.message || err.message));
        }
    };

    // --- 5. Get Stats (คำนวณสถิติสำหรับ Dashboard) ---
    const getStats = () => {
        // 5.1 คำนวณงบประมาณรวม (แปลงเป็นตัวเลขป้องกัน NaN)
        const totalBudget = projects.reduce((sum, p) => {
            const budgetVal = Number(p.budget);
            return sum + (isNaN(budgetVal) ? 0 : budgetVal);
        }, 0);

        // 5.2 ฟังก์ชันช่วยจัดกลุ่มสถานะ (Case Insensitive)
        const normalize = (status: string | undefined) => (status || '').toUpperCase().trim();

        // 5.3 นับจำนวนตามกลุ่ม (รองรับทั้งภาษาไทยและอังกฤษ)
        // Active Group (สีเหลือง)
        const activeCount = projects.filter(p => {
            const s = normalize(p.status);
            return ['ACTIVE', 'IN_PROGRESS', 'DOING', 'START', 'ON_GOING', 'ดำเนินการ', 'กำลังทำ'].includes(s);
        }).length;

        // Pending/Hold Group (สีฟ้า)
        const pendingCount = projects.filter(p => {
            const s = normalize(p.status);
            return ['PENDING', 'PENDING_REVIEW', 'HOLD', 'WAITING', 'QUEUE', 'รอตรวจสอบ', 'พัก'].includes(s);
        }).length;

        // Completed Group (สีเขียว)
        const completedCount = projects.filter(p => {
            const s = normalize(p.status);
            return ['COMPLETED', 'COMPLETE', 'DONE', 'FINISH', 'SUCCESS', 'เสร็จสิ้น', 'เรียบร้อย'].includes(s);
        }).length;

        // Cancelled Group (สีแดง)
        const cancelledCount = projects.filter(p => {
            const s = normalize(p.status);
            return ['CANCELLED', 'CANCEL', 'REJECT', 'VOID', 'ยกเลิก', 'ไม่อนุมัติ'].includes(s);
        }).length;

        // Draft Group (สีเทา)
        const draftCount = projects.filter(p => {
            const s = normalize(p.status);
            return ['DRAFT', 'DRAF', 'ร่าง'].includes(s);
        }).length;

        // 5.4 จัดเตรียมข้อมูลกราฟ (ลำดับต้องตรงกับ COLORS ใน Dashboard.tsx)
        const chartData = [
            { name: 'Active', value: activeCount },       // เหลือง
            { name: 'Pending', value: pendingCount },     // ฟ้า
            { name: 'Completed', value: completedCount }, // เขียว
            { name: 'Cancelled', value: cancelledCount }, // แดง
            { name: 'Draft', value: draftCount }          // เทา
        ];

        return {
            total: projects.length,
            active: activeCount,
            completed: completedCount,
            totalBudget,
            chartData
        };
    };

    return (
        <ProjectContext.Provider value={{ 
            projects, 
            loading, 
            error, 
            fetchProjects, 
            addProject, 
            updateProject, 
            deleteProject, 
            getStats 
        }}>
            {children}
        </ProjectContext.Provider>
    );
};

export const useProjects = () => {
    const context = useContext(ProjectContext);
    if (context === undefined) {
        throw new Error('useProjects must be used within a ProjectProvider');
    }
    return context;
};