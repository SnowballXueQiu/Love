"use client";
import { useState, useEffect } from "react";
import { AppSettings, PhotoPost } from "@/types";
import { supabase } from "@/lib/supabase";

interface PhotoWallProps {
    settings: AppSettings;
}

export default function PhotoWall({ settings }: PhotoWallProps) {
    const [posts, setPosts] = useState<PhotoPost[]>([]);
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [inputPassword, setInputPassword] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    
    // Form state
    const [isAdding, setIsAdding] = useState(false);
    const [newDescription, setNewDescription] = useState("");
    const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        const fetchPosts = async () => {
            const { data } = await supabase
                .from('photos')
                .select('*')
                .order('date', { ascending: false });
            
            if (data) {
                setPosts(data.map(p => ({
                    id: p.id.toString(),
                    imageUrls: p.image_urls,
                    description: p.description,
                    date: p.date
                })));
            }
        };

        fetchPosts();

        const channel = supabase
            .channel('photos')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'photos' }, (payload) => {
                const newPost = payload.new;
                setPosts(prev => [{
                    id: newPost.id.toString(),
                    imageUrls: newPost.image_urls,
                    description: newPost.description,
                    date: newPost.date
                }, ...prev]);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const handleUnlock = () => {
        if (inputPassword === settings.password1 || inputPassword === settings.password2) {
            setIsUnlocked(true);
            setErrorMsg("");
        } else {
            setErrorMsg("密码错误 / Incorrect Password");
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            setNewImageFiles(prev => [...prev, ...files]);
            
            files.forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setPreviewUrls(prev => [...prev, reader.result as string]);
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const handleRemoveImage = (index: number) => {
        setNewImageFiles(prev => prev.filter((_, i) => i !== index));
        setPreviewUrls(prev => prev.filter((_, i) => i !== index));
    };

    const handlePost = async () => {
        if (newImageFiles.length === 0) return;
        setUploading(true);

        try {
            const uploadedUrls: string[] = [];

            for (const file of newImageFiles) {
                const fileName = `${Date.now()}-${file.name}`;
                const { data, error } = await supabase.storage
                    .from('photos')
                    .upload(fileName, file);
                
                if (error) throw error;
                
                const { data: { publicUrl } } = supabase.storage
                    .from('photos')
                    .getPublicUrl(fileName);
                
                uploadedUrls.push(publicUrl);
            }

            await supabase.from('photos').insert([{
                image_urls: uploadedUrls,
                description: newDescription,
                date: new Date().toISOString(),
            }]);

            setIsAdding(false);
            setNewDescription("");
            setNewImageFiles([]);
            setPreviewUrls([]);
        } catch (error) {
            console.error('Error uploading photos:', error);
            alert('Failed to upload photos');
        } finally {
            setUploading(false);
        }
    };

    return (
        <section className="memphis-card bg-memphis-cyan flex flex-col gap-4">
            <div className="flex justify-between items-center border-b-3 border-memphis-black pb-2">
                <h2 className="text-xl font-bold">照片墙 📸</h2>
                <button 
                    onClick={() => setIsAdding(!isAdding)} 
                    className="memphis-btn bg-memphis-yellow text-sm py-1 px-3"
                >
                    {isAdding ? "取消" : "添加照片"}
                </button>
            </div>

            {isAdding && (
                !isUnlocked ? (
                    <div className="bg-white border-3 border-memphis-black p-4 shadow-[4px_4px_0_#232323] flex flex-col gap-3 items-center">
                        <p className="font-bold">请输入密码以添加照片</p>
                        <div className="flex gap-2 w-full items-center justify-center">
                            <input
                                type="password"
                                value={inputPassword}
                                onChange={(e) => setInputPassword(e.target.value)}
                                placeholder="Password"
                                className="memphis-input flex-1"
                            />
                            <button onClick={handleUnlock} className="memphis-btn bg-memphis-pink text-sm whitespace-nowrap">
                                解锁
                            </button>
                        </div>
                        {errorMsg && <p className="text-red-600 font-bold text-sm">{errorMsg}</p>}
                    </div>
                ) : (
                    <div className="bg-white border-3 border-memphis-black p-4 shadow-[4px_4px_0_#232323] flex flex-col gap-3">
                        <div>
                        <label className="font-bold block mb-1">描述 (可选)</label>
                        <input 
                            type="text" 
                            className="memphis-input w-full"
                            value={newDescription}
                            onChange={(e) => setNewDescription(e.target.value)}
                            placeholder="记录这一刻..."
                        />
                    </div>
                    <div>
                        <label className="font-bold block mb-1">照片 / Photos</label>
                        <input 
                            type="file" 
                            accept="image/*"
                            multiple
                            className="memphis-input w-full mb-2"
                            onChange={handleFileSelect}
                        />
                        
                        {previewUrls.length > 0 && (
                            <div className="grid grid-cols-3 gap-2 mt-2">
                                {previewUrls.map((url, index) => (
                                    <div key={index} className="relative aspect-square border-2 border-memphis-black">
                                        <img src={url} alt="Preview" className="w-full h-full object-cover" />
                                        <button 
                                            onClick={() => handleRemoveImage(index)}
                                            className="absolute top-0 right-0 bg-memphis-pink border-l-2 border-b-2 border-memphis-black w-6 h-6 flex items-center justify-center font-bold text-xs hover:bg-red-500"
                                        >
                                            X
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <button 
                        onClick={handlePost}
                        className="memphis-btn bg-memphis-green w-full mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={newImageFiles.length === 0 || uploading}
                    >
                        {uploading ? "发布中..." : "发布"}
                    </button>
                </div>
            ))}

            <div className="flex flex-col gap-6 mt-2">
                {posts.length === 0 ? (
                    <p className="text-center opacity-60 italic py-10">还没有照片，去添加一些美好的回忆吧...</p>
                ) : (
                    posts.map(post => (
                        <div key={post.id} className="relative pl-4 border-l-3 border-memphis-black">
                            {/* Timeline dot */}
                            <div className="absolute -left-[9px] top-0 w-4 h-4 bg-memphis-yellow border-3 border-memphis-black rounded-full"></div>
                            
                            <div className="mb-2">
                                <span className="text-sm font-bold bg-memphis-white border-2 border-memphis-black px-2 py-0.5 shadow-[2px_2px_0_#232323]">
                                    {new Date(post.date).toLocaleDateString()}
                                </span>
                            </div>

                            <div className="bg-white border-3 border-memphis-black p-3 shadow-[4px_4px_0_#232323]">
                                {post.description && (
                                    <p className="mb-3 font-bold text-lg">{post.description}</p>
                                )}
                                
                                <div className={`grid gap-2 ${post.imageUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                                    {post.imageUrls.map((url, idx) => (
                                        <div key={idx} className="aspect-square overflow-hidden border-2 border-memphis-black">
                                            <img 
                                                src={url} 
                                                alt={`Photo ${idx + 1}`} 
                                                className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = "https://placehold.co/400x400?text=No+Image";
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </section>
    );
}
