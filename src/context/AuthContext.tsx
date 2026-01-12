import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import axios from 'axios';

// ... (Interface User และ AuthContextType เหมือนเดิม) ...
interface User {
    id: number;
    username: string;
    fullname: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, user: User) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);

    // ฟังก์ชัน Logout แยกออกมาเพื่อให้เรียกใช้ได้ง่าย
    const performLogout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('saraban_token');
        localStorage.removeItem('saraban_user');
        delete axios.defaults.headers.common['Authorization'];
        // อาจจะเพิ่ม window.location.href = '/login' ถ้าจำเป็น
    };

    useEffect(() => {
        const savedToken = localStorage.getItem('saraban_token');
        const savedUser = localStorage.getItem('saraban_user');

        if (savedToken && savedUser) {
            setToken(savedToken);
            setUser(JSON.parse(savedUser));
            axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
        }

        // 🔥 เพิ่ม Interceptor: ดักจับ Error 401/403
        const interceptorId = axios.interceptors.response.use(
            response => response,
            error => {
                if (error.response && (error.response.status === 401 || error.response.status === 403)) {
                    // ถ้า Server บอกว่า Token ใช้ไม่ได้ -> ให้ Logout ทันที
                    performLogout();
                }
                return Promise.reject(error);
            }
        );

        // Cleanup interceptor เมื่อ Unmount
        return () => {
            axios.interceptors.response.eject(interceptorId);
        };
    }, []);

    const login = (newToken: string, newUser: User) => {
        setToken(newToken);
        setUser(newUser);
        localStorage.setItem('saraban_token', newToken);
        localStorage.setItem('saraban_user', JSON.stringify(newUser));
        axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    };

    const logout = () => {
        performLogout();
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};