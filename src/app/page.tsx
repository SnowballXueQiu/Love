"use client";
import { useState, useEffect } from "react";
import Countdown from "@/components/Countdown";
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
};

export default function Home() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .single();
      
      if (data) {
        setSettings({
            name1: data.name1,
            avatar1: data.avatar1,
            password1: data.password1_hash, // Mapping from DB column
            name2: data.name2,
            avatar2: data.avatar2,
            password2: data.password2_hash, // Mapping from DB column
            startDate: data.start_date,
        });
      }
      setLoading(false);
    };

    fetchSettings();
  }, []);

  const handleSettingsUpdate = async (newSettings: AppSettings) => {
      setSettings(newSettings);
      // Update DB
      await supabase.from('settings').update({
          name1: newSettings.name1,
          avatar1: newSettings.avatar1,
          password1_hash: newSettings.password1,
          name2: newSettings.name2,
          avatar2: newSettings.avatar2,
          password2_hash: newSettings.password2,
          start_date: newSettings.startDate
      }).eq('id', 1); // Assuming single row with ID 1
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
          onClick={() => setIsSettingsOpen(true)}
          className="absolute top-2 right-2 text-xl hover:scale-110 transition bg-transparent border-none p-0 cursor-pointer"
        >
          ⚙️
        </button>
      </header>

      {/* Countdown */}
      <Countdown targetDate={settings.startDate} />

      {/* Message Board */}
      <MessageBoard settings={settings} />

      {/* Photo Wall */}
      <PhotoWall settings={settings} />

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
