import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const Login: React.FC = () => {
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await axios.post('http://localhost:3001/api/login', { username, password });
            login(res.data.token, res.data.user);
        } catch (err) {
            setError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
        }
    };

    // ปุ่มแถม: สำหรับสร้าง User แรก (ใช้ครั้งเดียวแล้วลบออกได้)
    const handleRegisterAdmin = async () => {
        await axios.post('http://localhost:3001/api/register', {
            username: 'admin',
            password: '123456',
            fullname: 'Admin Saraban'
        });
        alert('สร้าง Admin (pass: 123456) สำเร็จ! กด Login ได้เลย');
    };

    return (
        <div className="flex items-center justify-center h-screen bg-gray-100">
            <div className="p-8 bg-white rounded-lg shadow-lg w-96">
                <h2 className="mb-6 text-2xl font-bold text-center text-indigo-600">ระบบสารบัญ</h2>
                {error && <p className="mb-4 text-sm text-red-500 text-center">{error}</p>}
                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Username</label>
                        <input 
                            type="text" 
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                            value={username} onChange={e => setUsername(e.target.value)} required 
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Password</label>
                        <input 
                            type="password" 
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                            value={password} onChange={e => setPassword(e.target.value)} required 
                        />
                    </div>
                    <button type="submit" className="w-full py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">
                        เข้าสู่ระบบ
                    </button>
                </form>
                
                <div className="mt-4 text-center">
                    <button onClick={handleRegisterAdmin} className="text-xs text-gray-400 hover:text-gray-600">
                        (First Run: Click to Create Admin)
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Login;