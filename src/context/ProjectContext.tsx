import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { Project, AuditLog } from '../types';
import { useAuth } from './AuthContext'; // 1. นำเข้า useAuth

interface ProjectContextType {
    projects: Project[];
    auditLogs: AuditLog[];
    isLoading: boolean;
    addProject: (project: Omit<Project, 'id'>) => Promise<void>;
    updateProject: (id: number, updatedData: Partial<Project>) => Promise<void>;
    deleteProject: (id: number) => Promise<void>;
    getStats: () => any;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { token } = useAuth(); // 2. ดึง token มาเช็ค
    const [projects, setProjects] = useState<Project[]>([]);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [isLoading, setIsLoading] = useState(false); // เปลี่ยนเป็น false เริ่มต้น

    const API_URL = 'http://localhost:3001/api';

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [projectsRes, logsRes] = await Promise.all([
                axios.get(`${API_URL}/projects`),
                axios.get(`${API_URL}/audit-logs`)
            ]);
            setProjects(projectsRes.data);
            setAuditLogs(logsRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // 3. แก้ไข useEffect: ให้ทำงานเมื่อ "token" เปลี่ยนแปลงหรือมีค่าเท่านั้น
    useEffect(() => {
        if (token) {
            fetchData();
        }
    }, [token]); // <-- ใส่ Dependency เป็น [token]

    // ... (ส่วน addProject, updateProject, deleteProject, getStats เหมือนเดิม) ...
    // ... Copy โค้ดเดิมส่วนล่างมาใส่ได้เลย ...

    const addProject = async (projectData: Omit<Project, 'id'>) => {
         // ... code เดิม ...
         try {
            await axios.post(`${API_URL}/projects`, projectData);
            await fetchData(); 
        } catch (error) {
            console.error(error);
        }
    };

    const updateProject = async (id: number, updatedData: Partial<Project>) => {
        // ... code เดิม ...
        try {
            await axios.put(`${API_URL}/projects/${id}`, updatedData);
            await fetchData();
        } catch (error) {
            console.error(error);
        }
    };

    const deleteProject = async (id: number) => {
        // ... code เดิม ...
         try {
            await axios.delete(`${API_URL}/projects/${id}`);
            await fetchData();
        } catch (error) {
            console.error(error);
        }
    };

    const getStats = () => {
        // ... code เดิม ...
        // (Copy Logic getStats เดิมมาใส่ตรงนี้)
        const total = projects.length;
        const active = projects.filter(p => p.status === 'ACTIVE').length;
        const completed = projects.filter(p => p.status === 'COMPLETED').length;
        const totalBudget = projects.reduce((sum, p) => sum + Number(p.budget), 0);
        
        const statusDist = projects.reduce((acc, curr) => {
            acc[curr.status] = (acc[curr.status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const chartData = Object.keys(statusDist).map(key => ({
            name: key,
            value: statusDist[key]
        }));
        return { total, active, completed, totalBudget, chartData };
    };

    return (
        <ProjectContext.Provider value={{ 
            projects, 
            auditLogs, 
            isLoading,
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