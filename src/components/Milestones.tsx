"use client";
import { useState, useEffect } from "react";
import { AppSettings } from "@/types";
import { supabase } from "@/lib/supabase";

interface MilestonesProps {
    settings: AppSettings;
    currentUser: "name1" | "name2" | null;
}

interface Achievement {
    id: string;
    title: string;
    date: string;
    icon: string;
}

const ICON_CATEGORIES = [
    { name: "热门", icons: ["🏆", "❤️", "✨", "🎉", "📅", "🌟", "🍀", "🌈", "💎", "🔥", "💯", "🎈"] },
    { name: "恋爱", icons: ["💌", "🌹", "💍", "💒", "💏", "💑", "💋", "🧸", "🏩", "💓", "💘", "👫"] },
    { name: "生活", icons: ["🏠", "🔑", "🚗", "🍳", "🎁", "🛒", "🧹", "🛋️", "🛌", "🛁", "🪴", "📱", "💻", "💸"] },
    { name: "娱乐", icons: ["🎬", "🎵", "🎮", "✈️", "🎢", "🎤", "🎧", "🎟️", "🎨", "🎹", "🎸", "🎲", "🎳", "🎪"] },
    { name: "美食", icons: ["🍽️", "🥂", "🎂", "🍦", "☕", "🍔", "🍕", "🍣", "🍎", "🍓", "🍒", "🍞", "🍖", "🍜", "🍩", "🍪", "🍹", "🍺"] },
    { name: "旅行", icons: ["✈️", "🗺️", "🏖️", "🏔️", "🚂", "⛺", "🗽", "🗼", "🛳️", "🚲", "🚕", "🚌", "🏨", "🌉"] },
    { name: "成长", icons: ["🎓", "📚", "✏️", "💼", "📝", "🥇", "🥈", "🥉", "🚀", "💡", "📈", "🤝"] },
    { name: "心情", icons: ["😀", "😂", "🥺", "😭", "😡", "😴", "😷", "🥳", "😎", "🤔", "🥰", "🤪"] },
    { name: "自然", icons: ["🌻", "🌲", "🌊", "☀️", "🌙", "⭐", "🌧️", "❄️", "☁️", "⚡", "🌵", "🌴", "🍁"] },
    { name: "动物", icons: ["🐱", "🐶", "🐰", "🐼", "🦊", "🦁", "🦄", "🦋", "🐯", "🐮", "🐷", "🐸", "🐙", "🐬"] },
    { name: "运动", icons: ["⚽", "🏀", "🎾", "🏊", "🚴", "🧘", "🏋️", "🏃", "🏸", "🏓", "🥊", "⛳", "⛸️"] },
];

export default function Milestones({ settings, currentUser }: MilestonesProps) {
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
    const [newIcon, setNewIcon] = useState("🏆");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchAchievements();
        
        const channel = supabase
            .channel('achievements')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'achievements' }, () => {
                fetchAchievements();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchAchievements = async () => {
        const { data } = await supabase
            .from('achievements')
            .select('*')
            .order('date', { ascending: false });
        
        if (data) setAchievements(data);
    };

    const handleAdd = async () => {
        if (!newTitle.trim() || !newDate) return;
        
        setIsSubmitting(true);
        try {
            const { data, error } = await supabase
                .from('achievements')
                .insert([{
                    title: newTitle,
                    date: newDate,
                    icon: newIcon 
                }])
                .select()
                .single();

            if (!error && data) {
                setAchievements(prev => [data, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                setNewTitle("");
                setNewIcon("🏆");
                setIsAddOpen(false);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("确定要删除这个成就吗？")) return;
        
        // Optimistic update
        setAchievements(prev => prev.filter(a => a.id !== id));
        
        await supabase.from('achievements').delete().eq('id', id);
    };

    return (
        <section className="memphis-card bg-memphis-blue text-white w-full relative">
            <div className="flex justify-between items-center border-b-3 border-memphis-black pb-2 mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    成就墙 <span>🏆</span>
                </h2>
                {currentUser && (
                    <button 
                        onClick={() => setIsAddOpen(!isAddOpen)} 
                        className="memphis-btn bg-memphis-yellow text-black text-sm py-1 px-3"
                    >
                        {isAddOpen ? "取消" : "添加成就"}
                    </button>
                )}
            </div>

            {isAddOpen && currentUser && (
                <div className="bg-white border-3 border-memphis-black p-4 shadow-[4px_4px_0_#232323] flex flex-col gap-3 mb-4 text-black animate-in fade-in zoom-in duration-200">
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-bold flex items-center gap-1">
                            第一次
                            <span className="text-xs font-normal opacity-60">(请输入事件)</span>
                        </label>
                        <input 
                            type="text" 
                            className="memphis-input w-full"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            placeholder="例如：牵手、看电影..."
                            autoFocus
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-bold">日期</label>
                        <input 
                            type="date" 
                            className="memphis-input w-full"
                            value={newDate}
                            onChange={(e) => setNewDate(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-bold">选择图标</label>
                        <div className="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar border-2 border-memphis-black p-2 bg-gray-50 rounded">
                            {ICON_CATEGORIES.map((cat) => (
                                <div key={cat.name}>
                                    <div className="text-xs font-bold opacity-60 mb-1">{cat.name}</div>
                                    <div className="flex flex-wrap gap-2">
                                        {cat.icons.map((icon) => (
                                            <button
                                                key={icon}
                                                onClick={() => setNewIcon(icon)}
                                                className={`w-8 h-8 rounded border-2 flex items-center justify-center text-lg transition cursor-pointer ${
                                                    newIcon === icon 
                                                        ? "bg-memphis-yellow border-memphis-black shadow-[2px_2px_0_#232323]" 
                                                        : "border-transparent hover:bg-white"
                                                }`}
                                            >
                                                {icon}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button 
                        onClick={handleAdd} 
                        disabled={isSubmitting}
                        className="memphis-btn bg-memphis-pink text-white w-full mt-2 cursor-pointer"
                    >
                        {isSubmitting ? "保存中..." : "记录成就 ✨"}
                    </button>
                </div>
            )}

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 max-h-[400px] overflow-y-auto p-2 custom-scrollbar">
                {achievements.length === 0 ? (
                    <div className="col-span-full text-center opacity-60 py-8">
                        <p>还没有记录成就</p>
                        <p className="text-sm mt-2">点击右上角添加你们的第一次吧！</p>
                    </div>
                ) : (
                    achievements.map((item) => (
                        <div key={item.id} className="relative bg-white text-black border-3 border-memphis-black shadow-[4px_4px_0_#232323] p-2 rounded flex flex-col items-center justify-center gap-1 aspect-square hover:-translate-y-1 hover:shadow-[6px_6px_0_#232323] transition-all group">
                            <div className="text-3xl mb-1">{item.icon}</div>
                            <div className="font-bold text-xs text-center line-clamp-2 leading-tight w-full px-1">{item.title}</div>
                            <div className="text-[10px] opacity-60 font-mono bg-gray-100 px-1 rounded">{item.date}</div>
                            
                            {currentUser && (
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(item.id);
                                    }}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold border-2 border-black opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
                                    title="删除"
                                >
                                    &times;
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>
        </section>
    );
}

