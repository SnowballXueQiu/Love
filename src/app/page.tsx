"use client";
import { useState, useEffect } from "react";
import Countdown from "@/components/Countdown";
import BlessingCounter from "@/components/BlessingCounter";
import MessageBoard from "@/components/MessageBoard";
import PhotoWall from "@/components/PhotoWall";
import SettingsModal from "@/components/SettingsModal";
import { AppSettings } from "@/types";
import { supabase } from "@/lib/supabase";

const defaultSettings: AppSettings = {
  name1: "Name1",
  avatar1: "",
  password1: "123",
  name2: "Name2",
  avatar2: "",
  password2: "456",
  startDate: new Date().toISOString().split('T')[0], // Today
  adminPassword: process.env.NEXT_PUBLIC_SETTINGS_PASSWORD || "admin123",
};

export default function Home() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isUnlockOpen, setIsUnlockOpen] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState("");
  const [unlockError, setUnlockError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .single();
      
      if (data) {
        setSettings({
            id: data.id,
            name1: data.name1,
            avatar1: data.avatar1,
            password1: data.password1_hash, // Mapping from DB column
            name2: data.name2,
            avatar2: data.avatar2,
            password2: data.password2_hash, // Mapping from DB column
            startDate: data.start_date,
            adminPassword: data.admin_password || process.env.NEXT_PUBLIC_SETTINGS_PASSWORD || "admin123",
        });
      }
      setLoading(false);
    };

    fetchSettings();
  }, []);

  const handleSettingsUpdate = async (newSettings: AppSettings) => {
      setSettings(newSettings);
      
      if (newSettings.id) {
          // Update existing row
          await supabase.from('settings').update({
              name1: newSettings.name1,
              avatar1: newSettings.avatar1,
              password1_hash: newSettings.password1,
              name2: newSettings.name2,
              avatar2: newSettings.avatar2,
              password2_hash: newSettings.password2,
              start_date: newSettings.startDate,
              admin_password: newSettings.adminPassword
          }).eq('id', newSettings.id);
      } else {
          // Fallback if no ID (shouldn't happen if fetched correctly)
          console.error("No settings ID found, cannot update.");
      }
  };

  const handleUnlockSettings = () => {
      if (unlockPassword === settings.adminPassword) {
          setIsUnlockOpen(false);
          setIsSettingsOpen(true);
          setUnlockPassword("");
          setUnlockError("");
      } else {
          setUnlockError("密码错误");
      }
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen font-bold">Loading...</div>;
  }

  return (
    <main className="w-full max-w-[500px] flex flex-col gap-5">
      {/* Header */}
      <header className="memphis-card bg-memphis-pink relative text-center">
        <h1 className="text-2xl font-bold mb-1 uppercase break-words">
          {settings.name1} <span className="text-memphis-white text-shadow-sm">&</span> {settings.name2}
        </h1>
        <p className="opacity-80 text-sm font-bold">在一起已经</p>
        <button
          onClick={() => setIsUnlockOpen(true)}
          className="absolute top-2 right-2 text-xl hover:scale-110 transition bg-transparent border-none p-0 cursor-pointer"
        >
          ⚙️
        </button>
      </header>

      {/* Countdown */}
      <Countdown targetDate={settings.startDate} />

      {/* Blessing Counter */}
      <BlessingCounter />

      {/* Message Board */}
      <MessageBoard settings={settings} />

      {/* Photo Wall */}
      <PhotoWall settings={settings} />

      {/* Unlock Settings Modal */}
      {isUnlockOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-4">
              <div className="memphis-card bg-memphis-yellow w-full max-w-xs relative flex flex-col gap-3 items-center">
                  <button onClick={() => setIsUnlockOpen(false)} className="absolute top-2 right-2 font-bold hover:scale-110 transition">&times;</button>
                  <h3 className="font-bold text-lg">解锁设置</h3>
                  <p className="text-sm">请输入管理员密码</p>
                  <input 
                      type="password" 
                      className="memphis-input w-full"
                      value={unlockPassword}
                      onChange={(e) => setUnlockPassword(e.target.value)}
                      placeholder="Admin Password"
                  />
                  {unlockError && <p className="text-red-600 font-bold text-sm">{unlockError}</p>}
                  <button onClick={handleUnlockSettings} className="memphis-btn bg-memphis-white w-full">
                      确认
                  </button>
              </div>
          </div>
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={handleSettingsUpdate}
      />
    </main>
  );
}
