import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Lock, Save, Shield, Key } from 'lucide-react';
import { message } from 'antd'; // ใช้ Ant Design Alert

const ProfilePage: React.FC = () => {
    const { user, updateProfile, changePassword } = useAuth();

    // State สำหรับ Profile Info
    const [fullname, setFullname] = useState('');
    
    // State สำหรับ Password Change
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    useEffect(() => {
        if (user) {
            setFullname(user.fullname);
        }
    }, [user]);

    // Handler: อัปเดตข้อมูลส่วนตัว
    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await updateProfile(fullname);
            message.success('บันทึกข้อมูลส่วนตัวเรียบร้อยแล้ว');
        } catch (error) {
            message.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
        }
    };

    // Handler: เปลี่ยนรหัสผ่าน
    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            message.warning('รหัสผ่านใหม่ไม่ตรงกัน');
            return;
        }
        if (newPassword.length < 4) {
            message.warning('รหัสผ่านต้องมีความยาวอย่างน้อย 4 ตัวอักษร');
            return;
        }

        try {
            await changePassword(currentPassword, newPassword);
            message.success('เปลี่ยนรหัสผ่านสำเร็จ!');
            // Reset Form
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            if (error.response && error.response.status === 401) {
                message.error('รหัสผ่านปัจจุบันไม่ถูกต้อง');
            } else {
                message.error('ไม่สามารถเปลี่ยนรหัสผ่านได้');
            }
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-10">
            
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-blue-100 rounded-full text-blue-600">
                    <User size={32} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">โปรไฟล์ของคุณ</h1>
                    <p className="text-gray-500">จัดการข้อมูลส่วนตัวและความปลอดภัยบัญชี</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* 🟢 การ์ดที่ 1: ข้อมูลส่วนตัว */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 mb-6 border-b pb-4 border-gray-50">
                        <Shield className="text-blue-500" size={20} />
                        <h2 className="text-lg font-bold text-gray-800">ข้อมูลทั่วไป</h2>
                    </div>

                    <form onSubmit={handleUpdateProfile} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Username (เปลี่ยนไม่ได้)</label>
                            <input 
                                type="text" 
                                value={user?.username || ''} 
                                disabled 
                                className="w-full px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-500 cursor-not-allowed"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">ตำแหน่ง / Role</label>
                            <span className="inline-block px-3 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded-full border border-blue-100 uppercase">
                                {user?.role}
                            </span>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ-นามสกุล</label>
                            <input 
                                type="text" 
                                value={fullname} 
                                onChange={(e) => setFullname(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                        </div>

                        <div className="pt-4">
                            <button 
                                type="submit" 
                                className="w-full py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex justify-center items-center gap-2 font-medium shadow-lg shadow-blue-200"
                            >
                                <Save size={18} />
                                บันทึกการเปลี่ยนแปลง
                            </button>
                        </div>
                    </form>
                </div>

                {/* 🔴 การ์ดที่ 2: เปลี่ยนรหัสผ่าน */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 mb-6 border-b pb-4 border-gray-50">
                        <Key className="text-orange-500" size={20} />
                        <h2 className="text-lg font-bold text-gray-800">เปลี่ยนรหัสผ่าน (Reset Password)</h2>
                    </div>

                    <form onSubmit={handleChangePassword} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่านปัจจุบัน</label>
                            <div className="relative">
                                <input 
                                    type="password" 
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    required
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                    placeholder="••••••••"
                                />
                                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            </div>
                        </div>

                        <hr className="border-gray-100 my-2" />

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่านใหม่</label>
                            <input 
                                type="password" 
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                placeholder="ตั้งรหัสผ่านใหม่"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">ยืนยันรหัสผ่านใหม่</label>
                            <input 
                                type="password" 
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                placeholder="พิมพ์รหัสผ่านใหม่ซ้ำอีกครั้ง"
                            />
                        </div>

                        <div className="pt-4">
                            <button 
                                type="submit" 
                                className="w-full py-2.5 bg-white border border-orange-200 text-orange-600 rounded-xl hover:bg-orange-50 transition-colors flex justify-center items-center gap-2 font-medium"
                            >
                                <Lock size={18} />
                                อัปเดตรหัสผ่าน
                            </button>
                        </div>
                    </form>
                </div>

            </div>
        </div>
    );
};

export default ProfilePage;