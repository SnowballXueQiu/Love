"use client";
import { useState, useRef, useEffect } from "react";
import { CHINA_REGIONS_BY_PINYIN } from "@/constants/china-regions";
import { supabase } from "@/lib/supabase";

interface MapEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    visitedPlaces: string[];
}

export default function MapEditModal({ isOpen, onClose, visitedPlaces }: MapEditModalProps) {
    const [loading, setLoading] = useState(false);
    const dialogRef = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        if (isOpen) {
            dialogRef.current?.showModal();
        } else {
            dialogRef.current?.close();
        }
    }, [isOpen]);

    const togglePlace = async (name: string) => {
        if (loading) return;
        setLoading(true);
        
        const isVisited = visitedPlaces.includes(name);
        
        try {
            if (isVisited) {
                // Remove
                await supabase.from('visited_places').delete().eq('name', name);
            } else {
                // Add
                await supabase.from('visited_places').insert([{ name }]);
            }
        } catch (error) {
            console.error("Error toggling place:", error);
        } finally {
            setLoading(false);
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
            <div className="bg-white border-3 border-memphis-black p-6 shadow-[8px_8px_0_#232323] w-full max-w-2xl max-h-[80vh] flex flex-col relative">
                <button 
                    onClick={onClose} 
                    className="absolute top-4 right-4 font-bold hover:scale-110 transition text-xl z-10"
                >
                    &times;
                </button>
                
                <h3 className="text-xl font-bold mb-4 text-center border-b-3 border-memphis-black pb-2">
                    编辑足迹 🗺️
                </h3>

                <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar">
                    {Object.entries(CHINA_REGIONS_BY_PINYIN).map(([letter, regions]) => (
                        <div key={letter} className="mb-4">
                            <h4 className="font-bold text-memphis-blue text-lg mb-2 border-b-2 border-gray-100 sticky top-0 bg-white py-1">
                                {letter}
                            </h4>
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                {regions.map(region => {
                                    const isVisited = visitedPlaces.includes(region);
                                    return (
                                        <button
                                            key={region}
                                            onClick={() => togglePlace(region)}
                                            disabled={loading}
                                            className={`
                                                text-sm p-2 border-2 rounded transition-all flex items-center justify-center gap-1 font-bold
                                                ${isVisited 
                                                    ? 'bg-memphis-pink border-memphis-black shadow-[2px_2px_0_#232323]' 
                                                    : 'bg-white border-memphis-black hover:bg-gray-50 shadow-[2px_2px_0_#232323] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none'
                                                }
                                            `}
                                        >
                                            {region}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </dialog>
    );
}
