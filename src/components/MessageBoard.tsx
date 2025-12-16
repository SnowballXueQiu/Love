"use client";
import { useState, useEffect, useRef } from "react";
import { AppSettings, Message } from "@/types";
import { supabase } from "@/lib/supabase";

interface MessageBoardProps {
    settings: AppSettings;
    currentUser: "name1" | "name2" | null;
}

export default function MessageBoard({ settings, currentUser }: MessageBoardProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const messagesContainerRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        if (messagesContainerRef.current) {
            const { scrollHeight, clientHeight } = messagesContainerRef.current;
            messagesContainerRef.current.scrollTo({
                top: scrollHeight - clientHeight,
                behavior: "smooth"
            });
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
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
                const newMsg = payload.new as Message;
                setMessages((prev) => {
                    // Prevent duplicates if we already added it manually
                    if (prev.some(m => m.id === newMsg.id)) return prev;
                    return [...prev, newMsg];
                });
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const handleSendMessage = async () => {
        if (!newMessage.trim()) return;
        
        const msgPayload = {
            text: newMessage,
            date: new Date().toISOString(),
            sender: currentUser || undefined,
        };

        const { data, error } = await supabase
            .from('messages')
            .insert([msgPayload])
            .select()
            .single();

        if (data) {
            setMessages((prev) => [...prev, data as Message]);
            setNewMessage("");
        }
    };

    return (
        <section className="memphis-card bg-memphis-yellow flex flex-col h-[60vh] max-h-[500px] w-full">
            <h2 className="text-xl font-bold border-b-3 border-memphis-black pb-2 mb-4 text-center">碎碎念 💌</h2>

            <div 
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto mb-4 pr-2 space-y-3"
            >
                {messages.length === 0 ? (
                    <p className="text-center opacity-60 italic">还没有留言，说点什么吧...</p>
                ) : (
                    messages.map((msg) => {
                        // If logged in: Current user is on the right (standard chat app behavior)
                        // If not logged in: Name1 is on Left, Name2 is on Right (dialogue view)
                        const isRight = currentUser 
                            ? msg.sender === currentUser 
                            : msg.sender === "name2";
                            
                        const senderName = msg.sender === "name1" ? settings.name1 : (msg.sender === "name2" ? settings.name2 : "Unknown");
                        const senderAvatar = msg.sender === "name1" ? settings.avatar1 : (msg.sender === "name2" ? settings.avatar2 : "");
                        
                        return (
                            <div key={msg.id} className={`flex gap-2 ${isRight ? 'flex-row-reverse' : 'flex-row'}`}>
                                {senderAvatar && (
                                    <img src={senderAvatar} alt={senderName} className="w-8 h-8 rounded-full border-2 border-memphis-black bg-white object-cover" />
                                )}
                                <div className={`flex flex-col ${isRight ? 'items-end' : 'items-start'} max-w-[80%]`}>
                                    <div className={`bg-white border-2 border-memphis-black p-3 shadow-[3px_3px_0_rgba(0,0,0,0.1)] ${isRight ? 'bg-memphis-pink' : 'bg-white'}`}>
                                        <div className="text-xs text-gray-500 mb-1 flex justify-between gap-2 items-center">
                                            <span className="font-bold">{senderName}</span>
                                            <span>{new Date(msg.date).toLocaleString()}</span>
                                        </div>
                                        <p className="text-sm md:text-base break-all whitespace-pre-wrap">{msg.text}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {!currentUser ? (
                <div className="border-t-2 border-memphis-black pt-4 text-center">
                    <p className="text-sm font-bold opacity-60">请先登录以发送留言</p>
                </div>
            ) : (
                <div className="flex gap-2 border-t-2 border-memphis-black pt-4">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder={`作为 ${currentUser === 'name1' ? settings.name1 : settings.name2} 发言...`}
                        className="memphis-input flex-1 min-w-0"
                    />
                    <button onClick={handleSendMessage} className="memphis-btn bg-memphis-white px-4 whitespace-nowrap shrink-0">
                        发送
                    </button>
                </div>
            )}
        </section>
    );
}
