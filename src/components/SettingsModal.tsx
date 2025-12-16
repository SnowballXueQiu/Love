"use client";
import { useState, useEffect, useRef } from "react";
import { AppSettings } from "@/types";
import { supabase } from "@/lib/supabase";
import useLockBodyScroll from "@/hooks/useLockBodyScroll";

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: AppSettings;
    onSave: (newSettings: AppSettings) => void;
}

export default function SettingsModal({ isOpen, onClose, settings, onSave }: SettingsModalProps) {
    const [formData, setFormData] = useState<AppSettings>(settings);
    const [avatar1File, setAvatar1File] = useState<File | null>(null);
    const [avatar2File, setAvatar2File] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const dialogRef = useRef<HTMLDialogElement>(null);

    useLockBodyScroll(isOpen);

    useEffect(() => {
        setFormData(settings);
    }, [settings]);

    useEffect(() => {
        if (isOpen) {
            dialogRef.current?.showModal();
        } else {
            dialogRef.current?.close();
        }
    }, [isOpen]);

    const uploadAvatar = async (file: File) => {
        const fileName = `avatar-${Date.now()}-${file.name}`;
        const { data, error } = await supabase.storage
            .from('avatars')
            .upload(fileName, file);
        
        if (error) {
            throw error
        };
        
        const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);
            
        return publicUrl;
    };

    const handleSubmit = async () => {
        setUploading(true);
        try {
            let newAvatar1 = formData.avatar1;
            let newAvatar2 = formData.avatar2;

            if (avatar1File) {
                newAvatar1 = await uploadAvatar(avatar1File);
            }

            if (avatar2File) {
                newAvatar2 = await uploadAvatar(avatar2File);
            }

            onSave({
                ...formData,
                avatar1: newAvatar1,
                avatar2: newAvatar2
            });
            onClose();
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('Failed to save settings');
        } finally {
            setUploading(false);
        }
    };

    return (
        <dialog
            ref={dialogRef}
            className="bg-transparent p-0 border-none outline-none backdrop:bg-black/50 backdrop:backdrop-blur-sm open:animate-in open:fade-in open:zoom-in-95 duration-200 m-auto"
            onClick={(e) => {
                if (e.target === dialogRef.current) onClose();
            }}
            onCancel={onClose}
        >
            <div className="memphis-card bg-memphis-pink w-full max-w-sm relative">
                <button onClick={onClose} className="absolute top-3 right-4 text-2xl font-bold hover:scale-110 transition">&times;</button>
                <h2 className="text-xl font-bold mb-4 text-center">设置</h2>

                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                    <div className="border-b-2 border-memphis-black pb-4">
                        <h3 className="font-bold mb-2 text-memphis-pink bg-white inline-block px-2 border-2 border-memphis-black shadow-[2px_2px_0_#232323]">Person 1</h3>
                        <div className="space-y-2 mt-2">
                            <div>
                                <label className="block text-sm font-bold mb-1">名字 / Name</label>
                                <input
                                    type="text"
                                    className="memphis-input w-full"
                                    value={formData.name1}
                                    onChange={(e) => setFormData({ ...formData, name1: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">头像 / Avatar</label>
                                <div className="flex gap-2 items-center">
                                    {formData.avatar1 && (
                                        <img src={formData.avatar1} alt="Avatar 1" className="w-10 h-10 rounded-full border-2 border-memphis-black object-cover" />
                                    )}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="memphis-input w-full text-sm"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                setAvatar1File(file);
                                                // Preview
                                                const reader = new FileReader();
                                                reader.onloadend = () => {
                                                    setFormData(prev => ({ ...prev, avatar1: reader.result as string }));
                                                };
                                                reader.readAsDataURL(file);
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">密码 / Password</label>
                                <input
                                    type="password"
                                    className="memphis-input w-full"
                                    value={formData.password1}
                                    onChange={(e) => setFormData({ ...formData, password1: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="border-b-2 border-memphis-black pb-4">
                        <h3 className="font-bold mb-2 text-memphis-cyan bg-white inline-block px-2 border-2 border-memphis-black shadow-[2px_2px_0_#232323]">Person 2</h3>
                        <div className="space-y-2 mt-2">
                            <div>
                                <label className="block text-sm font-bold mb-1">名字 / Name</label>
                                <input
                                    type="text"
                                    className="memphis-input w-full"
                                    value={formData.name2}
                                    onChange={(e) => setFormData({ ...formData, name2: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">头像 / Avatar</label>
                                <div className="flex gap-2 items-center">
                                    {formData.avatar2 && (
                                        <img src={formData.avatar2} alt="Avatar 2" className="w-10 h-10 rounded-full border-2 border-memphis-black object-cover" />
                                    )}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="memphis-input w-full text-sm"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                setAvatar2File(file);
                                                // Preview
                                                const reader = new FileReader();
                                                reader.onloadend = () => {
                                                    setFormData(prev => ({ ...prev, avatar2: reader.result as string }));
                                                };
                                                reader.readAsDataURL(file);
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">密码 / Password</label>
                                <input
                                    type="password"
                                    className="memphis-input w-full"
                                    value={formData.password2}
                                    onChange={(e) => setFormData({ ...formData, password2: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="border-b-2 border-memphis-black pb-4">
                        <h3 className="font-bold mb-2 text-memphis-yellow bg-white inline-block px-2 border-2 border-memphis-black shadow-[2px_2px_0_#232323]">模块开关 / Modules</h3>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                            {[
                                { key: 'showCountdown', label: '倒计时 / Countdown' },
                                { key: 'showBlessing', label: '祝福 / Blessing' },
                                { key: 'showMessageBoard', label: '对话 / Chat' },
                                { key: 'showPhotoWall', label: '照片墙 / Photos' },
                                { key: 'showMusicPlayer', label: '音乐 / Music' },
                                { key: 'showMap', label: '地图 / Map' },
                            ].map(({ key, label }) => (
                                <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={!!formData[key as keyof AppSettings]}
                                            onChange={(e) => setFormData({ ...formData, [key]: e.target.checked })}
                                        />
                                        <div className="w-10 h-6 bg-gray-200 border-2 border-memphis-black rounded-full peer peer-checked:bg-memphis-green peer-focus:ring-2 peer-focus:ring-memphis-black transition-all"></div>
                                        <div className="absolute left-[4px] top-[4px] bg-white border-2 border-memphis-black w-3 h-3 rounded-full transition-all peer-checked:translate-x-4"></div>
                                    </div>
                                    <span className="text-sm font-bold">{label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block font-bold mb-1">开始时间 / Start Date</label>
                        <input
                            type="date"
                            className="memphis-input w-full"
                            value={formData.startDate}
                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        />
                    </div>
                </div>
                <button 
                    onClick={handleSubmit} 
                    className="memphis-btn w-full mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={uploading}
                >
                    {uploading ? "保存中..." : "保存"}
                </button>
            </div>
        </dialog>
    );
}
