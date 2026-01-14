import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { AuditLog } from '../types';

interface ExtendedLog extends AuditLog {
    project_code?: string;
}

interface NotificationContextType {
    notifications: ExtendedLog[];
    unreadCount: number;
    fetchNotifications: () => Promise<void>;
    markAsRead: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { token } = useAuth();
    const [notifications, setNotifications] = useState<ExtendedLog[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    // ฟังก์ชันดึงข้อมูล
    const fetchNotifications = async () => {
        if (!token) return;
        try {
            const res = await axios.get('https://saraban-backend.onrender.com/api/notifications', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const latestLogs = res.data;
            setNotifications(latestLogs);

            // คำนวณจำนวนที่ยังไม่ได้อ่าน
            // โดยเทียบกับ ID ล่าสุดที่เราเก็บไว้ใน localStorage
            const lastReadId = parseInt(localStorage.getItem('saraban_last_read_log_id') || '0');
            
            // นับจำนวน Log ที่ ID มากกว่า (ใหม่กว่า) ตัวที่อ่านล่าสุด
            const newCount = latestLogs.filter((log: ExtendedLog) => log.id > lastReadId).length;
            setUnreadCount(newCount);

        } catch (error) {
            console.error("Error fetching notifications:", error);
        }
    };

    // ฟังก์ชันกดอ่าน (เคลียร์ตัวเลข)
    const markAsRead = () => {
        if (notifications.length > 0) {
            // บันทึก ID ของตัวล่าสุดว่าเป็น "อ่านถึงตรงนี้แล้ว"
            const latestId = notifications[0].id;
            localStorage.setItem('saraban_last_read_log_id', latestId.toString());
            setUnreadCount(0);
        }
    };

    // Auto Polling: ดึงข้อมูลใหม่ทุก 30 วินาที
    useEffect(() => {
        fetchNotifications(); // ดึงครั้งแรกทันที

        const interval = setInterval(() => {
            fetchNotifications();
        }, 30000); // 30000 ms = 30 วินาที

        return () => clearInterval(interval);
    }, [token]);

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, fetchNotifications, markAsRead }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};