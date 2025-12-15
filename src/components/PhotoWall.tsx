"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { AppSettings, PhotoPost } from "@/types";
import { supabase } from "@/lib/supabase";

interface PhotoWallProps {
    settings: AppSettings;
    currentUser: "name1" | "name2" | null;
}

export default function PhotoWall({ settings, currentUser }: PhotoWallProps) {
    const [posts, setPosts] = useState<PhotoPost[]>([]);
    
    // Form state
    const [isAdding, setIsAdding] = useState(false);
    const [newDescription, setNewDescription] = useState("");
    const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);
    
    // Preview state
    const [selectedPost, setSelectedPost] = useState<PhotoPost | null>(null);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const dialogRef = useRef<HTMLDialogElement>(null);

    // Edit state
    const [isEditing, setIsEditing] = useState(false);
    const [editDescription, setEditDescription] = useState("");
    const [editImages, setEditImages] = useState<string[]>([]);
    const [editNewFiles, setEditNewFiles] = useState<File[]>([]);
    const [editNewPreviews, setEditNewPreviews] = useState<string[]>([]);

    // Drag and drop state
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        if (selectedPost) {
            dialogRef.current?.showModal();
            setIsEditing(false);
        } else {
            dialogRef.current?.close();
        }
    }, [selectedPost]);

    const handleClosePreview = () => {
        dialogRef.current?.close();
        setSelectedPost(null);
        setSelectedIndex(0);
    };

    const handlePrevImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!selectedPost) return;
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : selectedPost.imageUrls.length - 1));
    };

    const handleNextImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!selectedPost) return;
        setSelectedIndex(prev => (prev < selectedPost.imageUrls.length - 1 ? prev + 1 : 0));
    };

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
                    date: p.date,
                    uploader: p.uploader
                })));
            }
        };

        fetchPosts();

        const channel = supabase
            .channel('photos')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'photos' }, (payload) => {
                const newPost = payload.new;
                setPosts(prev => {
                    if (prev.some(p => p.id === newPost.id.toString())) return prev;
                    return [{
                        id: newPost.id.toString(),
                        imageUrls: newPost.image_urls,
                        description: newPost.description,
                        date: newPost.date,
                        uploader: newPost.uploader
                    }, ...prev];
                });
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

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

    const handleEditClick = () => {
        if (!selectedPost) return;
        setEditDescription(selectedPost.description || "");
        setEditImages([...selectedPost.imageUrls]);
        setEditNewFiles([]);
        setEditNewPreviews([]);
        setIsEditing(true);
    };

    const handleEditFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            setEditNewFiles(prev => [...prev, ...files]);
            
            files.forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setEditNewPreviews(prev => [...prev, reader.result as string]);
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const handleSaveEdit = async () => {
        if (!selectedPost) return;
        
        if (editImages.length + editNewFiles.length === 0) {
            alert("Please keep at least one photo / 请至少保留一张照片");
            return;
        }

        try {
            let finalImageUrls = [...editImages];

            // Upload new images if any
            if (editNewFiles.length > 0) {
                for (const file of editNewFiles) {
                    const fileName = `${Date.now()}-${file.name}`;
                    const { error } = await supabase.storage
                        .from('photos')
                        .upload(fileName, file);
                    
                    if (error) throw error;
                    
                    const { data: { publicUrl } } = supabase.storage
                        .from('photos')
                        .getPublicUrl(fileName);
                    
                    finalImageUrls.push(publicUrl);
                }
            }

            const { error } = await supabase
                .from('photos')
                .update({ 
                    description: editDescription,
                    image_urls: finalImageUrls
                })
                .eq('id', selectedPost.id);

            if (error) throw error;

            // Update local state
            setPosts(prev => prev.map(p => 
                p.id === selectedPost.id 
                    ? { ...p, description: editDescription, imageUrls: finalImageUrls }
                    : p
            ));
            
            // Update selected post
            setSelectedPost(prev => prev ? { ...prev, description: editDescription, imageUrls: finalImageUrls } : null);
            
            // Reset index if out of bounds
            if (selectedIndex >= finalImageUrls.length) {
                setSelectedIndex(Math.max(0, finalImageUrls.length - 1));
            }
            
            setIsEditing(false);
        } catch (err) {
            console.error(err);
            alert('Failed to update post');
        }
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

            const { data, error } = await supabase.from('photos').insert([{
                image_urls: uploadedUrls,
                description: newDescription,
                date: new Date().toISOString(),
                uploader: currentUser || undefined
            }]).select().single();

            if (data) {
                // Optimistic update
                setPosts(prev => [{
                    id: data.id.toString(),
                    imageUrls: data.image_urls,
                    description: data.description,
                    date: data.date,
                    uploader: data.uploader
                }, ...prev]);
            }

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

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        
        if (e.dataTransfer.files) {
            const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
            if (files.length > 0) {
                setNewImageFiles(prev => [...prev, ...files]);
                
                files.forEach(file => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        setPreviewUrls(prev => [...prev, reader.result as string]);
                    };
                    reader.readAsDataURL(file);
                });
            }
        }
    };

    return (
        <section className="memphis-card bg-memphis-orange flex flex-col gap-4">
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
                !currentUser ? (
                    <div className="bg-white border-3 border-memphis-black p-4 shadow-[4px_4px_0_#232323] flex flex-col gap-3 items-center">
                        <p className="font-bold">请先登录以添加照片</p>
                    </div>
                ) : (
                    <div 
                        className={`bg-white border-3 border-memphis-black p-4 shadow-[4px_4px_0_#232323] flex flex-col gap-3 transition-colors ${isDragging ? 'bg-blue-50 border-dashed' : ''}`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        {isDragging && <div className="text-center font-bold text-memphis-blue pointer-events-none">释放以添加照片...</div>}
                        <div>
                        <label className="font-bold block mb-1">描述 (可选)</label>
                        <input 
                            type="text" 
                            className="memphis-input w-full"
                            value={newDescription}
                            onChange={(e) => setNewDescription(e.target.value)}
                            placeholder={`作为 ${currentUser === 'name1' ? settings.name1 : settings.name2} 记录这一刻...`}
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
                    posts.map(post => {
                        const uploaderName = post.uploader === "name1" ? settings.name1 : (post.uploader === "name2" ? settings.name2 : null);
                        const uploaderAvatar = post.uploader === "name1" ? settings.avatar1 : (post.uploader === "name2" ? settings.avatar2 : null);

                        return (
                        <div key={post.id} className="relative pl-4 border-l-3 border-memphis-black">
                            {/* Timeline dot */}
                            <div className="absolute -left-[9px] top-0 w-4 h-4 bg-memphis-yellow border-3 border-memphis-black rounded-full"></div>
                            
                            <div className="mb-2 flex items-center gap-2">
                                <span className="text-sm font-bold bg-memphis-white border-2 border-memphis-black px-2 py-0.5 shadow-[2px_2px_0_#232323]">
                                    {new Date(post.date).toLocaleDateString()}
                                </span>
                                {uploaderName && (
                                    <div className="flex items-center gap-1 ml-auto">
                                        <span className="text-xs font-bold opacity-70">by {uploaderName}</span>
                                        {uploaderAvatar && (
                                            <img src={uploaderAvatar} alt={uploaderName} className="w-6 h-6 rounded-full border-2 border-memphis-black object-cover" />
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="bg-white border-3 border-memphis-black p-3 shadow-[4px_4px_0_#232323]">
                                {post.description && (
                                    <p className="mb-3 font-bold text-lg">{post.description}</p>
                                )}
                                
                                <div className={`grid gap-2 ${post.imageUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                                    {post.imageUrls.map((url, idx) => (
                                        <div 
                                            key={idx} 
                                            className="relative aspect-square overflow-hidden border-2 border-memphis-black cursor-pointer hover:opacity-90 transition-opacity"
                                            onClick={() => {
                                                setSelectedPost(post);
                                                setSelectedIndex(idx);
                                            }}
                                        >
                                            <Image 
                                                src={url} 
                                                alt={`Photo ${idx + 1}`} 
                                                fill
                                                className="object-cover hover:scale-110 transition-transform duration-300"
                                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                                unoptimized
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )})
                )}
            </div>

            {/* Image Preview Dialog */}
            <dialog 
                ref={dialogRef}
                className="bg-transparent p-0 border-none outline-none backdrop:bg-black/90 backdrop:backdrop-blur-sm open:animate-in open:fade-in open:zoom-in-95 duration-200 overflow-visible m-auto"
                onClick={(e) => {
                    if (e.target === dialogRef.current) handleClosePreview();
                }}
            >
                {selectedPost && (
                    <div className="relative flex flex-col items-center">
                        {/* Photo Frame (Polaroid Style) */}
                        <div className={`bg-white p-3 pb-16 md:p-4 md:pb-20 border-4 border-memphis-black shadow-[12px_12px_0_#232323] relative transition-transform duration-300 ${!isEditing ? 'rotate-1 hover:rotate-0' : ''}`}>
                            
                            {/* Washi Tape Effect */}
                            <div 
                                className="absolute -top-5 left-1/2 -translate-x-1/2 w-36 h-10 bg-gradient-to-br from-memphis-pink/70 to-memphis-pink/50 rotate-[-2deg] shadow-sm z-10 backdrop-blur-[0.5px] mix-blend-multiply"
                                style={{
                                    clipPath: 'polygon(3% 0%, 97% 0%, 100% 10%, 97% 20%, 100% 30%, 97% 40%, 100% 50%, 97% 60%, 100% 70%, 97% 80%, 100% 90%, 97% 100%, 3% 100%, 0% 90%, 3% 80%, 0% 70%, 3% 60%, 0% 50%, 3% 40%, 0% 30%, 3% 20%, 0% 10%)',
                                }}
                            ></div>

                            {isEditing ? (
                                <div className="relative w-[85vw] h-[60vh] md:w-[700px] md:h-[600px] bg-gray-50 border-2 border-memphis-black p-4 overflow-y-auto flex flex-col gap-4">
                                    <h3 className="text-xl font-bold text-memphis-black">Edit Post</h3>
                                    
                                    <div className="flex flex-col gap-2">
                                        <label className="font-bold text-sm">Description</label>
                                        <textarea
                                            value={editDescription}
                                            onChange={(e) => setEditDescription(e.target.value)}
                                            className="memphis-input w-full h-24 resize-none"
                                            placeholder="Write something..."
                                        />
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <label className="font-bold text-sm">Images ({editImages.length + editNewFiles.length})</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {/* Existing Images */}
                                            {editImages.map((url, idx) => (
                                                <div key={`existing-${idx}`} className="relative aspect-square border-2 border-memphis-black group">
                                                    <Image 
                                                        src={url} 
                                                        alt="Edit preview" 
                                                        fill 
                                                        className="object-cover"
                                                        unoptimized
                                                    />
                                                    <button
                                                        onClick={() => setEditImages(prev => prev.filter((_, i) => i !== idx))}
                                                        className="absolute top-1 right-1 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
                                                    >
                                                        &times;
                                                    </button>
                                                </div>
                                            ))}
                                            
                                            {/* New Images */}
                                            {editNewPreviews.map((url, idx) => (
                                                <div key={`new-${idx}`} className="relative aspect-square border-2 border-memphis-black group">
                                                    <Image 
                                                        src={url} 
                                                        alt="New preview" 
                                                        fill 
                                                        className="object-cover"
                                                        unoptimized
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            setEditNewFiles(prev => prev.filter((_, i) => i !== idx));
                                                            setEditNewPreviews(prev => prev.filter((_, i) => i !== idx));
                                                        }}
                                                        className="absolute top-1 right-1 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
                                                    >
                                                        &times;
                                                    </button>
                                                </div>
                                            ))}

                                            {/* Add Button */}
                                            <label className="aspect-square border-2 border-dashed border-memphis-black flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition">
                                                <span className="text-2xl">+</span>
                                                <span className="text-xs font-bold">Add</span>
                                                <input 
                                                    type="file" 
                                                    multiple 
                                                    accept="image/*" 
                                                    className="hidden" 
                                                    onChange={handleEditFileSelect}
                                                />
                                            </label>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 mt-auto pt-4">
                                        <button 
                                            onClick={handleSaveEdit}
                                            className="memphis-btn bg-memphis-cyan text-white flex-1"
                                        >
                                            Save
                                        </button>
                                        <button 
                                            onClick={() => setIsEditing(false)}
                                            className="memphis-btn bg-gray-200 flex-1"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="relative w-[85vw] h-[60vh] md:w-[700px] md:h-[600px] bg-gray-50 border-2 border-memphis-black">
                                        <Image 
                                            src={selectedPost.imageUrls[selectedIndex]} 
                                            alt="Full Preview" 
                                            fill
                                            className="object-contain"
                                            priority
                                            sizes="(max-width: 768px) 85vw, 700px"
                                            unoptimized
                                        />
                                        
                                        {/* Dots Indicator */}
                                        {selectedPost.imageUrls.length > 1 && (
                                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                                                {selectedPost.imageUrls.map((_, idx) => (
                                                    <div 
                                                        key={idx}
                                                        className={`w-3 h-3 rounded-full border-2 border-memphis-black transition-colors shadow-sm ${idx === selectedIndex ? 'bg-memphis-pink' : 'bg-white'}`}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Caption Area */}
                                    <div className="absolute bottom-0 left-0 w-full h-16 md:h-20 flex flex-col items-center justify-center px-6 text-center">
                                        {selectedPost.description && (
                                            <p className="text-lg md:text-xl text-memphis-black truncate w-full font-bold font-sans">
                                                {selectedPost.description}
                                            </p>
                                        )}
                                        <p className="text-xs md:text-sm text-gray-500 font-mono mt-1">
                                            {new Date(selectedPost.date).toLocaleDateString()} • {
                                                selectedPost.uploader === 'name1' ? settings.name1 :
                                                selectedPost.uploader === 'name2' ? settings.name2 :
                                                selectedPost.uploader || 'Anonymous'
                                            }
                                        </p>
                                    </div>

                                    {/* Decorative Sticker */}
                                    <div className="absolute -bottom-5 -right-5 text-5xl rotate-12 drop-shadow-[2px_2px_0_rgba(0,0,0,0.2)] z-20 select-none">
                                        💝
                                    </div>
                                    
                                    {/* Navigation Buttons */}
                                    {selectedPost.imageUrls.length > 1 && (
                                        <>
                                            <button 
                                                onClick={handlePrevImage}
                                                className="absolute -left-5 top-1/2 -translate-y-1/2 bg-memphis-yellow border-2 border-memphis-black w-12 h-12 rounded-full flex items-center justify-center hover:scale-110 transition shadow-[4px_4px_0_#232323] z-20 text-xl font-bold"
                                            >
                                                ←
                                            </button>
                                            <button 
                                                onClick={handleNextImage}
                                                className="absolute -right-5 top-1/2 -translate-y-1/2 bg-memphis-yellow border-2 border-memphis-black w-12 h-12 rounded-full flex items-center justify-center hover:scale-110 transition shadow-[4px_4px_0_#232323] z-20 text-xl font-bold"
                                            >
                                                →
                                            </button>
                                        </>
                                    )}

                                    {/* Edit Button */}
                                    {currentUser && currentUser === selectedPost.uploader && (
                                        <button 
                                            onClick={handleEditClick}
                                            className="absolute top-2 left-2 bg-white border-2 border-memphis-black p-2 rounded-full hover:scale-110 transition shadow-sm z-20"
                                            title="Edit Post"
                                        >
                                            ✏️
                                        </button>
                                    )}
                                </>
                            )}

                            {/* Close Button */}
                            <button 
                                className="absolute -top-6 -right-6 bg-memphis-pink text-white w-12 h-12 rounded-full font-bold border-2 border-memphis-black shadow-[4px_4px_0_#232323] hover:scale-110 transition flex items-center justify-center text-2xl z-30"
                                onClick={handleClosePreview}
                            >
                                &times;
                            </button>
                        </div>
                    </div>
                )}
            </dialog>
        </section>
    );
}
