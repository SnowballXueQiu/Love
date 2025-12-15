"use client";
import { useState, useEffect } from "react";
import Countdown from "@/components/Countdown";
import BlessingCounter from "@/components/BlessingCounter";
import MessageBoard from "@/components/MessageBoard";
import PhotoWall from "@/components/PhotoWall";
import SettingsModal from "@/components/SettingsModal";
import MusicPlayer from "@/components/MusicPlayer";
import ChinaMap from "@/components/ChinaMap";
import { AppSettings } from "@/types";
import { supabase } from "@/lib/supabase";
import { setCookie, getCookie, eraseCookie } from "@/utils/cookie";

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

  // Auth state
  const [currentUser, setCurrentUser] = useState<"name1" | "name2" | null>(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // Presence state
  const [partnerOnline, setPartnerOnline] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
        const user = getCookie("love_user");
        if (user === "name1" || user === "name2") {
            setCurrentUser(user);
        }
    };
    checkAuth();

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
          // Insert new row if no ID exists
          const { data, error } = await supabase.from('settings').insert([{
              name1: newSettings.name1,
              avatar1: newSettings.avatar1,
              password1_hash: newSettings.password1,
              name2: newSettings.name2,
              avatar2: newSettings.avatar2,
              password2_hash: newSettings.password2,
              start_date: newSettings.startDate,
              admin_password: newSettings.adminPassword
          }]).select().single();

          if (error) {
              console.error("Error creating settings:", error);
          } else if (data) {
              // Update local state with the new ID
              setSettings(prev => ({ ...prev, id: data.id }));
          }
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

  const handleLogin = () => {
      if (loginPassword === settings.password1) {
          setCurrentUser("name1");
          setCookie("love_user", "name1", 30); // 30 days
          setIsLoginOpen(false);
          setLoginPassword("");
          setLoginError("");
      } else if (loginPassword === settings.password2) {
          setCurrentUser("name2");
          setCookie("love_user", "name2", 30); // 30 days
          setIsLoginOpen(false);
          setLoginPassword("");
          setLoginError("");
      } else {
          setLoginError("密码错误 / Incorrect Password");
      }
  };

  const handleLogout = () => {
      setCurrentUser(null);
      eraseCookie("love_user");
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isLoginOpen) setIsLoginOpen(false);
        if (isUnlockOpen) setIsUnlockOpen(false);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isLoginOpen, isUnlockOpen]);

  useEffect(() => {
    if (!currentUser) {
        setPartnerOnline(false);
        return;
    }

    const channel = supabase.channel('online_users');

    const updateStatus = async (isFocused: boolean) => {
        await channel.track({
            user: currentUser,
            online_at: new Date().toISOString(),
            is_focused: isFocused
        });
    };

    channel
        .on('presence', { event: 'sync' }, () => {
            const newState = channel.presenceState();
            const partnerName = currentUser === 'name1' ? 'name2' : 'name1';
            
            let isPartnerHere = false;
            // Iterate through presence state to find partner
            for (const key in newState) {
                const presences = newState[key];
                for (const p of presences) {
                    // @ts-ignore
                    if (p.user === partnerName && p.is_focused) {
                        isPartnerHere = true;
                        break;
                    }
                }
            }
            setPartnerOnline(isPartnerHere);
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await updateStatus(document.visibilityState === 'visible');
            }
        });

    const handleVisibilityChange = () => {
        updateStatus(document.visibilityState === 'visible');
    };
    
    const handleFocus = () => updateStatus(true);
    const handleBlur = () => updateStatus(false);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
        channel.unsubscribe();
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', handleFocus);
        window.removeEventListener('blur', handleBlur);
    };
  }, [currentUser]);

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
        
        {partnerOnline && (
            <div className="text-xs font-bold text-memphis-white bg-memphis-black/20 inline-block px-2 py-0.5 rounded-full mb-1 animate-pulse">
                👀 对方也在看
            </div>
        )}

        <p className="opacity-80 text-sm font-bold">在一起已经</p>
        
        <div className="absolute top-2 right-2 flex gap-2">
            {currentUser ? (
                <button
                    onClick={handleLogout}
                    className="text-sm font-bold hover:scale-110 transition bg-transparent border-none p-0 cursor-pointer"
                    title="Logout"
                >
                    👋
                </button>
            ) : (
                <button
                    onClick={() => setIsLoginOpen(true)}
                    className="text-sm font-bold hover:scale-110 transition bg-transparent border-none p-0 cursor-pointer"
                    title="Login"
                >
                    🔑
                </button>
            )}
            <button
                onClick={() => setIsUnlockOpen(true)}
                className="text-xl hover:scale-110 transition bg-transparent border-none p-0 cursor-pointer"
                title="Settings"
            >
                ⚙️
            </button>
        </div>
      </header>

      {/* Countdown */}
      <Countdown targetDate={settings.startDate} />

      {/* Blessing Counter */}
      <BlessingCounter />

      {/* Message Board */}
      <MessageBoard settings={settings} currentUser={currentUser} />

      {/* Music Player */}
      <MusicPlayer settings={settings} currentUser={currentUser} />

      {/* China Map */}
      <ChinaMap currentUser={currentUser} />

      {/* Photo Wall */}
      <PhotoWall settings={settings} currentUser={currentUser} />

      {/* Login Modal */}
      {isLoginOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-4">
              <div className="memphis-card bg-memphis-cyan w-full max-w-xs relative flex flex-col gap-3 items-center">
                  <button onClick={() => setIsLoginOpen(false)} className="absolute top-2 right-2 font-bold hover:scale-110 transition">&times;</button>
                  <h3 className="font-bold text-lg">用户登录</h3>
                  <p className="text-sm">请输入您的专属密码</p>
                  <input 
                      type="password" 
                      className="memphis-input w-full"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Password"
                      onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  />
                  {loginError && <p className="text-red-600 font-bold text-sm">{loginError}</p>}
                  <button onClick={handleLogin} className="memphis-btn bg-memphis-white w-full">
                      登录
                  </button>
              </div>
          </div>
      )}

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
