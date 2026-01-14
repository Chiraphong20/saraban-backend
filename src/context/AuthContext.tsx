import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

interface User {
    id: number;
    username: string;
    fullname: string;
    role: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, userData: User) => void;
    logout: () => void;
    updateProfile: (fullname: string) => Promise<void>;
    changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        const storedToken = localStorage.getItem('token');
        if (storedToken && storedUser) {
            setUser(JSON.parse(storedUser));
            setToken(storedToken);
        }
    }, []);

    const login = (newToken: string, userData: User) => {
        setToken(newToken);
        setUser(userData);
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(userData));
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // ล้างค่าอื่นๆ ที่อาจค้างอยู่
        localStorage.removeItem('saraban_last_read_log_id');
        window.location.href = '/';
    };

    // ✅ ฟังก์ชันอัปเดตข้อมูลส่วนตัว (ชื่อ)
    const updateProfile = async (fullname: string) => {
        if (!token) return;
        try {
            await axios.put('https://saraban-backend.onrender.com/api/profile', 
                { fullname }, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            // อัปเดต state และ localStorage ทันที
            if (user) {
                const newUser = { ...user, fullname };
                setUser(newUser);
                localStorage.setItem('user', JSON.stringify(newUser));
            }
        } catch (error) {
            throw error;
        }
    };

    // ✅ ฟังก์ชันเปลี่ยนรหัสผ่าน
    const changePassword = async (currentPassword: string, newPassword: string) => {
        if (!token) return;
        try {
            await axios.put('https://saraban-backend.onrender.com/api/change-password', 
                { currentPassword, newPassword }, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
        } catch (error) {
            throw error;
        }
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, updateProfile, changePassword }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};