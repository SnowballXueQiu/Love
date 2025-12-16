"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { PublicMessage } from "@/types";
import useLockBodyScroll from "@/hooks/useLockBodyScroll";

interface BlessingCounterProps {
    currentUser?: "name1" | "name2" | null;
}

interface DanmakuItem extends PublicMessage {
    top: number;
    trackIndex: number;
    duration: number;
    renderId: string;
}

// Define 4 safe tracks (percentages) to avoid top (header) and bottom (input)
// Spread out more to create vertical gaps
const TRACKS = [18, 36, 54, 72];

const getSafeTrack = (recentItems: DanmakuItem[]) => {
    // Check the last 3 items to avoid immediate track reuse
    const occupied = new Set(recentItems.slice(-3).map(i => i.trackIndex));
    const available = TRACKS.map((_, i) => i).filter(i => !occupied.has(i));
    
    if (available.length === 0) {
        return Math.floor(Math.random() * TRACKS.length);
    }
    return available[Math.floor(Math.random() * available.length)];
};

const createDanmakuItem = (msg: PublicMessage, trackIndex: number): DanmakuItem => ({
    ...msg,
    top: TRACKS[trackIndex],
    trackIndex,
    duration: 10, // Constant duration to prevent overtaking
    renderId: Math.random().toString(36).substr(2, 9)
});

export default function BlessingCounter({ currentUser }: BlessingCounterProps) {
    const [count, setCount] = useState<number>(0);
    const [animating, setAnimating] = useState(false);
    const [hasBlessed, setHasBlessed] = useState(false);
    
    // Danmaku state
    const [danmakuMessages, setDanmakuMessages] = useState<PublicMessage[]>([]);
    const [visibleDanmaku, setVisibleDanmaku] = useState<DanmakuItem[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [isListOpen, setIsListOpen] = useState(false);
    const [showSuccessToast, setShowSuccessToast] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const listDialogRef = useRef<HTMLDialogElement>(null);
    const deleteDialogRef = useRef<HTMLDialogElement>(null);

    useLockBodyScroll(isListOpen || !!deleteId);

    useEffect(() => {
        if (deleteId) {
            deleteDialogRef.current?.showModal();
        } else {
            deleteDialogRef.current?.close();
        }
    }, [deleteId]);

    useEffect(() => {
        if (isListOpen) {
            listDialogRef.current?.showModal();
        } else {
            listDialogRef.current?.close();
        }
    }, [isListOpen]);

    useEffect(() => {
        // Fetch initial count
        const fetchCount = async () => {
            const { data } = await supabase
                .from('blessing_stats')
                .select('count')
                .eq('id', 1)
                .single();
            
            if (data) {
                setCount(data.count);
            }
        };

        fetchCount();

        // Fetch recent messages for danmaku
        const fetchMessages = async () => {
            const { data } = await supabase
                .from('public_messages')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(20);
            
            if (data) {
                setDanmakuMessages(data);
                // Initialize with just one message to start to avoid overlap and wall of text
                if (data.length > 0) {
                    setVisibleDanmaku([createDanmakuItem(data[0], Math.floor(Math.random() * TRACKS.length))]);
                }
            }
        };
        fetchMessages();

        // Subscribe to changes
        const channel = supabase
            .channel('blessings_and_messages')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'blessing_stats' }, (payload) => {
                setCount(payload.new.count);
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'public_messages' }, (payload) => {
                const newMsg = payload.new as PublicMessage;
                setDanmakuMessages(prev => {
                    if (prev.some(msg => msg.id === newMsg.id)) return prev;
                    return [newMsg, ...prev];
                });
                // Add to visible danmaku to show animation
                setVisibleDanmaku(prev => {
                    if (prev.some(msg => msg.id === newMsg.id)) return prev;
                    const track = getSafeTrack(prev);
                    return [...prev.slice(-9), createDanmakuItem(newMsg, track)];
                });
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'public_messages' }, (payload) => {
                const deletedId = payload.old.id;
                setDanmakuMessages(prev => prev.filter(msg => msg.id !== deletedId));
                setVisibleDanmaku(prev => prev.filter(msg => msg.id !== deletedId));
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Cycle through danmaku messages
    useEffect(() => {
        if (danmakuMessages.length === 0) return;

        let timeoutId: NodeJS.Timeout;

        const addMessage = () => {
            const randomMsg = danmakuMessages[Math.floor(Math.random() * danmakuMessages.length)];
            setVisibleDanmaku(prev => {
                // Keep max 10 visible
                const next = [...prev];
                if (next.length >= 10) next.shift();
                
                // Add new random message
                const track = getSafeTrack(next);
                next.push(createDanmakuItem(randomMsg, track));
                return next;
            });
            
            // Random interval between 0.8s and 2s to reduce horizontal gaps
            timeoutId = setTimeout(addMessage, 800 + Math.random() * 1200);
        };

        addMessage();

        return () => clearTimeout(timeoutId);
    }, [danmakuMessages]);

    const handleBless = async () => {
        setAnimating(true);
        setTimeout(() => setAnimating(false), 500);

        // Optimistic update
        setCount(prev => prev + 1);
        setHasBlessed(true);

        try {
            const { error } = await supabase.rpc('increment_blessing');

            if (error) throw error;
        } catch (err) {
            console.error('Error sending blessing:', err);
            // Revert on error
            setCount(prev => prev - 1);
            setHasBlessed(false);
        }
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || isSending) return;
        if (newMessage.length > 30) {
            alert("留言不能超过30个字哦 / Max 30 chars");
            return;
        }

        setIsSending(true);
        try {
            const { data, error } = await supabase
                .from('public_messages')
                .insert([{ content: newMessage }])
                .select()
                .single();

            if (error) throw error;

            // Optimistic update
            if (data) {
                const newMsg = data as PublicMessage;
                setDanmakuMessages(prev => [newMsg, ...prev]);
                setVisibleDanmaku(prev => {
                    const track = getSafeTrack(prev);
                    return [...prev.slice(-9), createDanmakuItem(newMsg, track)];
                });
            }

            setNewMessage("");
            setShowSuccessToast(true);
            setTimeout(() => setShowSuccessToast(false), 2000);
        } catch (err) {
            console.error('Error sending message:', err);
            alert('发送失败，请重试');
        } finally {
            setIsSending(false);
        }
    };

    const handleDeleteMessage = (id: string) => {
        setDeleteId(id);
    };

    const executeDelete = async () => {
        if (!deleteId) return;
        
        try {
            const { error } = await supabase
                .from('public_messages')
                .delete()
                .eq('id', deleteId);
            
            if (error) throw error;
            
            // Optimistic update
            setDanmakuMessages(prev => prev.filter(m => m.id !== deleteId));
            setVisibleDanmaku(prev => prev.filter(m => m.id !== deleteId));
            setDeleteId(null);
        } catch (err) {
            console.error('Error deleting message:', err);
            alert('删除失败');
        }
    };

    return (
        <section className="memphis-card bg-memphis-cyan flex flex-col gap-4 relative overflow-hidden group w-full min-h-[260px]">
                {/* Decorative Background Pattern */}
                <div className="absolute inset-0 opacity-10 pointer-events-none" 
                    style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '10px 10px' }}>
                </div>

                {/* Success Toast */}
                {showSuccessToast && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] bg-memphis-pink border-3 border-memphis-black px-6 py-3 shadow-[6px_6px_0_#232323] animate-in fade-in zoom-in duration-200 flex items-center gap-2">
                        <span className="text-2xl">🎉</span>
                        <span className="font-bold text-white text-lg">发送成功!</span>
                    </div>
                )}

                {/* Danmaku Area */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                    {visibleDanmaku.map((msg) => (
                        <div 
                            key={msg.renderId}
                            className="absolute whitespace-nowrap bg-white border-2 border-memphis-black px-3 py-1 rounded-full text-sm font-bold shadow-[2px_2px_0_#232323] animate-danmaku"
                            style={{
                                top: `${msg.top}%`,
                                animationDuration: `${msg.duration}s`,
                            }}
                        >
                            {msg.content}
                        </div>
                    ))}
                </div>

                {/* Top Section: Blessing Count */}
                <div className="flex items-center justify-between z-10 relative">
                    <div className="flex flex-col">
                        <h3 className="text-xl font-bold text-memphis-black mb-1">
                            祝 99
                        </h3>
                        <p className="text-sm font-mono font-bold text-memphis-black/80">
                            已有 <span className="text-2xl text-white text-shadow-sm">{count}</span> 人送上祝福
                        </p>
                    </div>

                    <button 
                        onClick={handleBless}
                        disabled={hasBlessed}
                        className={`
                            relative bg-memphis-yellow border-3 border-memphis-black px-4 py-2 
                            font-bold shadow-[4px_4px_0_#232323] transition-all duration-200
                            flex items-center gap-2
                            ${hasBlessed ? 'opacity-80 cursor-default translate-x-[2px] translate-y-[2px] shadow-[2px_2px_0_#232323]' : 'hover:-translate-y-1 hover:shadow-[6px_6px_0_#232323] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#232323]'}
                        `}
                    >
                        <span className={`text-2xl transition-transform duration-500 ${animating ? 'scale-150 rotate-12' : ''}`}>
                            {hasBlessed ? '❤️' : '👍'}
                        </span>
                        <span className="uppercase tracking-wider">
                            {hasBlessed ? '谢谢喵!' : '99 +1'}
                        </span>
                    </button>
                </div>

                {/* Bottom Section: Input Area */}
                <div className="z-10 relative mt-auto pt-4 border-t-2 border-memphis-black/20 flex gap-2">
                    <input 
                        type="text" 
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        maxLength={30}
                        placeholder="留个言吧 (30字以内)..."
                        className="flex-1 memphis-input text-sm py-1"
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    />
                    <button 
                        onClick={handleSendMessage}
                        disabled={isSending || !newMessage.trim()}
                        className="memphis-btn bg-memphis-pink text-white text-sm px-3 py-1 whitespace-nowrap"
                    >
                        发送
                    </button>
                    <button 
                        onClick={() => setIsListOpen(true)}
                        className="memphis-btn bg-white text-memphis-black text-sm px-3 py-1 whitespace-nowrap"
                        title="查看所有留言"
                    >
                        📜
                    </button>
                </div>

                {/* Floating Hearts Animation Elements */}
                {animating && (
                    <div className="absolute right-10 top-0 pointer-events-none animate-ping text-2xl z-20">
                        ❤️
                    </div>
                )}

                {/* All Messages Modal */}
                <dialog
                    ref={deleteDialogRef}
                    className="bg-transparent p-0 border-none outline-none backdrop:bg-black/50 backdrop:backdrop-blur-sm open:animate-in open:fade-in open:zoom-in-95 duration-200 m-auto z-[200]"
                    onCancel={() => setDeleteId(null)}
                    onClick={(e) => {
                        if (e.target === deleteDialogRef.current) setDeleteId(null);
                    }}
                >
                     <div className="memphis-card bg-white w-[min(90vw,320px)] flex flex-col gap-4 text-center p-6">
                        <h3 className="text-xl font-bold border-b-3 border-memphis-black pb-2">⚠️ 确认删除?</h3>
                        <p className="font-bold text-memphis-black/80 py-2">这条留言将被永久删除，<br/>无法恢复哦！</p>
                        <div className="flex gap-4 justify-center mt-2">
                            <button 
                                onClick={() => setDeleteId(null)}
                                className="memphis-btn bg-white text-memphis-black text-sm px-6 py-2 hover:bg-gray-100"
                            >
                                取消
                            </button>
                            <button 
                                onClick={executeDelete}
                                className="memphis-btn bg-memphis-pink text-white text-sm px-6 py-2 hover:bg-memphis-pink/90"
                            >
                                确定删除
                            </button>
                        </div>
                    </div>
                </dialog>

                <dialog
                    ref={listDialogRef}
                    className="bg-transparent p-0 border-none outline-none backdrop:bg-black/50 backdrop:backdrop-blur-sm open:animate-in open:fade-in open:zoom-in-95 duration-200 m-auto"
                    onClick={(e) => {
                        if (e.target === listDialogRef.current) setIsListOpen(false);
                    }}
                    onCancel={() => setIsListOpen(false)}
                >
                    <div className="memphis-card bg-white w-[min(90vw,500px)] relative max-h-[60vh] flex flex-col">
                        <button onClick={() => setIsListOpen(false)} className="absolute top-3 right-4 text-2xl font-bold hover:scale-110 transition">&times;</button>
                        <h3 className="text-xl font-bold mb-4 text-center border-b-3 border-memphis-black pb-2">
                            留言板 📝
                        </h3>
                        
                        <div className="flex-1 overflow-y-auto p-2 space-y-2">
                            {danmakuMessages.length === 0 ? (
                                <p className="text-center text-gray-500 py-8">还没有留言，快来抢沙发！</p>
                            ) : (
                                danmakuMessages.map((msg) => (
                                    <div key={msg.id} className="bg-gray-50 border-2 border-memphis-black p-3 shadow-[2px_2px_0_#ccc] relative group">
                                        <p className="font-bold text-memphis-black break-words pr-6">{msg.content}</p>
                                        <p className="text-xs text-gray-400 mt-1 text-right">
                                            {new Date(msg.created_at).toLocaleString()}
                                        </p>
                                        {currentUser && (
                                            <button 
                                                onClick={() => handleDeleteMessage(msg.id)}
                                                className="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="删除留言"
                                            >
                                                🗑️
                                            </button>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </dialog>
        </section>
    );
}
