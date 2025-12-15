"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function BlessingCounter() {
    const [count, setCount] = useState<number>(0);
    const [animating, setAnimating] = useState(false);
    const [hasBlessed, setHasBlessed] = useState(false);

    useEffect(() => {
        // Fetch initial count
        const fetchCount = async () => {
            const { count } = await supabase
                .from('blessings')
                .select('*', { count: 'exact', head: true });
            
            if (count !== null) {
                setCount(count);
            }
        };

        fetchCount();

        // Subscribe to changes
        const channel = supabase
            .channel('blessings_count')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'blessings' }, () => {
                setCount(prev => prev + 1);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const handleBless = async () => {
        setAnimating(true);
        setTimeout(() => setAnimating(false), 500);

        // Optimistic update
        setCount(prev => prev + 1);
        setHasBlessed(true);

        try {
            const { error } = await supabase
                .from('blessings')
                .insert([{}]); // Insert empty row, assuming id and created_at are auto-generated

            if (error) throw error;
        } catch (err) {
            console.error('Error sending blessing:', err);
            // Revert on error
            setCount(prev => prev - 1);
            setHasBlessed(false);
        }
    };

    return (
        <section className="memphis-card bg-memphis-cyan flex items-center justify-between relative overflow-hidden group w-full">
                {/* Decorative Background Pattern */}
                <div className="absolute inset-0 opacity-10 pointer-events-none" 
                    style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '10px 10px' }}>
                </div>

                <div className="flex flex-col z-10">
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
                        relative z-10 bg-memphis-yellow border-3 border-memphis-black px-4 py-2 
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

                {/* Floating Hearts Animation Elements (Simplified CSS implementation) */}
                {animating && (
                    <div className="absolute right-10 top-0 pointer-events-none animate-ping text-2xl">
                        ❤️
                    </div>
                )}
        </section>
    );
}
