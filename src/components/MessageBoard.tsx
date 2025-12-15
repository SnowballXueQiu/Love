"use client";
import { useState, useEffect } from "react";
import { AppSettings, Message } from "@/types";
import { supabase } from "@/lib/supabase";

interface MessageBoardProps {
    settings: AppSettings;
}

export default function MessageBoard({ settings }: MessageBoardProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [currentUser, setCurrentUser] = useState<"name1" | "name2" | null>(null);
    const [inputPassword, setInputPassword] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const [newMessage, setNewMessage] = useState("");

    useEffect(() => {
        if (!isUnlocked) return;

        // Fetch initial messages
        const fetchMessages = async () => {
            const { data } = await supabase
                .from('messages')
                .select('*')
                .order('date', { ascending: true });
            
            if (data) setMessages(data);
        };

        fetchMessages();

        // Subscribe to new messages
        const channel = supabase
            .channel('messages')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
                setMessages((prev) => [...prev, payload.new as Message]);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [isUnlocked]);

    const handleUnlock = () => {
        if (inputPassword === settings.password1) {
            setIsUnlocked(true);
            setCurrentUser("name1");
            setErrorMsg("");
        } else if (inputPassword === settings.password2) {
            setIsUnlocked(true);
            setCurrentUser("name2");
            setErrorMsg("");
        } else {
            setErrorMsg("密码错误 / Incorrect Password");
        }
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim()) return;
        
        const msg = {
            text: newMessage,
            date: new Date().toISOString(),
            sender: currentUser || undefined,
        };

        await supabase.from('messages').insert([msg]);
        setNewMessage("");
    };

    if (!isUnlocked) {
        return (
            <section className="memphis-card bg-memphis-yellow min-h-[300px] flex flex-col items-center justify-center gap-4">
                <h2 className="text-xl font-bold border-b-3 border-memphis-black pb-2 mb-2 w-full text-center">留言板 💌</h2>
                <div className="flex flex-col items-center gap-3 w-full max-w-xs mx-auto">
                    <p className="font-bold">请输入密码查看留言</p>
                    <div className="flex gap-2 w-full items-center justify-center">
                        <input
                            type="password"
                            value={inputPassword}
                            onChange={(e) => setInputPassword(e.target.value)}
                            placeholder="Password"
                            className="memphis-input flex-1"
                        />
                        <button onClick={handleUnlock} className="memphis-btn bg-memphis-white text-sm whitespace-nowrap">
                            解锁
                        </button>
                    </div>
                    {errorMsg && <p className="text-red-600 font-bold text-sm">{errorMsg}</p>}
                </div>
            </section>
        );
    }

    return (
        <section className="memphis-card bg-memphis-yellow min-h-[300px] flex flex-col h-full">
            <h2 className="text-xl font-bold border-b-3 border-memphis-black pb-2 mb-4 text-center">留言板 💌</h2>

            <div className="flex-1 overflow-y-auto mb-4 pr-2 max-h-[300px] space-y-3">
                {messages.length === 0 ? (
                    <p className="text-center opacity-60 italic">还没有留言，说点什么吧...</p>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.sender === currentUser;
                        const senderName = msg.sender === "name1" ? settings.name1 : (msg.sender === "name2" ? settings.name2 : "Unknown");
                        const senderAvatar = msg.sender === "name1" ? settings.avatar1 : (msg.sender === "name2" ? settings.avatar2 : "");
                        
                        return (
                            <div key={msg.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                {senderAvatar && (
                                    <img src={senderAvatar} alt={senderName} className="w-8 h-8 rounded-full border-2 border-memphis-black bg-white object-cover" />
                                )}
                                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[80%]`}>
                                    <div className={`bg-white border-2 border-memphis-black p-3 shadow-[3px_3px_0_rgba(0,0,0,0.1)] ${isMe ? 'bg-memphis-pink' : 'bg-white'}`}>
                                        <div className="text-xs text-gray-500 mb-1 flex justify-between gap-2 items-center">
                                            <span className="font-bold">{senderName}</span>
                                            <span>{new Date(msg.date).toLocaleString()}</span>
                                        </div>
                                        <p className="text-sm md:text-base break-words">{msg.text}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            <div className="flex gap-2">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="写下你想说的话..."
                    className="memphis-input flex-1"
                />
                <button onClick={handleSendMessage} className="memphis-btn bg-memphis-white">
                    发送
                </button>
            </div>
        </section>
    );
}
