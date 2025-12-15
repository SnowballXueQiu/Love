"use client";
import { useState, useEffect, useRef } from "react";
import { AppSettings, Song } from "@/types";
import { supabase } from "@/lib/supabase";
import ConfirmModal from "./ConfirmModal";

interface MusicPlayerProps {
    settings: AppSettings;
    currentUser: "name1" | "name2" | null;
}

export default function MusicPlayer({ settings, currentUser }: MusicPlayerProps) {
    const [songs, setSongs] = useState<Song[]>([]);
    const [currentSongIndex, setCurrentSongIndex] = useState<number>(-1);
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolume] = useState(0.5);
    const audioRef = useRef<HTMLAudioElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Upload state
    const [isAdding, setIsAdding] = useState(false);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploadTitle, setUploadTitle] = useState("");
    const [uploadArtist, setUploadArtist] = useState("");
    const [isUploading, setIsUploading] = useState(false);

    // Drag and drop state
    const [isDragging, setIsDragging] = useState(false);

    // Delete confirmation state
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [songToDelete, setSongToDelete] = useState<Song | null>(null);

    useEffect(() => {
        const fetchSongs = async () => {
            const { data } = await supabase
                .from('songs')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (data) {
                setSongs(data);
                if (data.length > 0 && currentSongIndex === -1) {
                    setCurrentSongIndex(0);
                }
            }
        };

        fetchSongs();

        const channel = supabase
            .channel('songs')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'songs' }, (payload) => {
                setSongs(prev => [payload.new as Song, ...prev]);
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'songs' }, (payload) => {
                setSongs(prev => prev.filter(song => song.id !== payload.old.id));
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
            if (isPlaying) {
                audioRef.current.play().catch(e => console.log("Playback prevented:", e));
            } else {
                audioRef.current.pause();
            }
        }
    }, [isPlaying, volume, currentSongIndex]);

    const handlePlayPause = () => {
        setIsPlaying(!isPlaying);
    };

    const handleNext = () => {
        if (songs.length === 0) return;
        setCurrentSongIndex((prev) => (prev + 1) % songs.length);
        setIsPlaying(true);
    };

    const handlePrev = () => {
        if (songs.length === 0) return;
        setCurrentSongIndex((prev) => (prev - 1 + songs.length) % songs.length);
        setIsPlaying(true);
    };

    const handleSongEnd = () => {
        handleNext();
    };

    const handleUpload = async () => {
        if (!uploadFile || !currentUser) return;
        setIsUploading(true);

        try {
            const fileExt = uploadFile.name.split('.').pop();
            const fileName = `${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('music')
                .upload(filePath, uploadFile);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('music')
                .getPublicUrl(filePath);

            const { error: dbError } = await supabase
                .from('songs')
                .insert([{
                    title: uploadTitle || uploadFile.name,
                    artist: uploadArtist || "Unknown",
                    url: publicUrl,
                    uploader: currentUser
                }]);

            if (dbError) throw dbError;

            setIsAdding(false);
            setUploadFile(null);
            setUploadTitle("");
            setUploadArtist("");
        } catch (error) {
            console.error("Error uploading song:", error);
            alert("Upload failed");
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteSong = async (e: React.MouseEvent, song: Song) => {
        e.stopPropagation();
        if (!currentUser) return;
        
        setSongToDelete(song);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!songToDelete) return;

        try {
            // 1. Delete from Storage
            // Extract filename from URL. URL format: .../music/filename.ext
            const fileName = songToDelete.url.split('/').pop();
            if (fileName) {
                const { error: storageError } = await supabase.storage
                    .from('music')
                    .remove([fileName]);
                
                if (storageError) {
                    console.error("Error deleting file:", storageError);
                    // Continue to delete DB record even if storage delete fails (or maybe file doesn't exist)
                }
            }

            // 2. Delete from Database
            const { error: dbError } = await supabase
                .from('songs')
                .delete()
                .eq('id', songToDelete.id);

            if (dbError) throw dbError;

            setSongs(prev => prev.filter(s => s.id !== songToDelete.id));
            
            // If deleted song was playing, stop or play next
            if (currentSong?.id === songToDelete.id) {
                setIsPlaying(false);
                setCurrentSongIndex(-1);
            }

        } catch (error) {
            console.error("Error deleting song:", error);
            alert("删除失败");
        } finally {
            setIsDeleteModalOpen(false);
            setSongToDelete(null);
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
        
        const file = e.dataTransfer.files?.[0];
        if (file && (file.type.startsWith('audio/') || file.name.endsWith('.flac'))) {
            setUploadFile(file);
            if (!uploadTitle) {
                setUploadTitle(file.name.replace(/\.[^/.]+$/, ""));
            }
            
            // Sync to input
            if (fileInputRef.current) {
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                fileInputRef.current.files = dataTransfer.files;
            }
        }
    };

    const currentSong = songs[currentSongIndex];

    return (
        <section className="memphis-card bg-memphis-blue flex flex-col gap-4">
            <div className="flex justify-between items-center border-b-3 border-memphis-black pb-2">
                <h2 className="text-xl font-bold text-white text-shadow-sm">音乐盒 🎵</h2>
                <button 
                    onClick={() => setIsAdding(!isAdding)} 
                    className="memphis-btn bg-memphis-yellow text-sm py-1 px-3"
                >
                    {isAdding ? "取消" : "上传"}
                </button>
            </div>

            {isAdding && (
                !currentUser ? (
                    <div className="bg-white border-3 border-memphis-black p-4 shadow-[4px_4px_0_#232323] flex flex-col gap-3 items-center">
                        <p className="font-bold">请先登录以上传音乐</p>
                    </div>
                ) : (
                    <div 
                        className={`bg-white border-3 border-memphis-black p-4 shadow-[4px_4px_0_#232323] flex flex-col gap-3 transition-colors ${isDragging ? 'bg-blue-50 border-dashed' : ''}`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        {isDragging && <div className="text-center font-bold text-memphis-blue pointer-events-none">释放以添加音乐...</div>}
                        <div>
                            <label className="font-bold block mb-1">文件 (MP3/WAV/FLAC)</label>
                            <input 
                                ref={fileInputRef}
                                type="file" 
                                accept="audio/*,.flac"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        setUploadFile(file);
                                        if (!uploadTitle) {
                                            setUploadTitle(file.name.replace(/\.[^/.]+$/, ""));
                                        }
                                    }
                                }}
                                className="memphis-input w-full text-sm mb-2"
                            />
                        </div>

                        <div>
                            <label className="font-bold block mb-1">标题</label>
                            <input 
                                type="text" 
                                value={uploadTitle}
                                onChange={(e) => setUploadTitle(e.target.value)}
                                className="memphis-input w-full"
                                placeholder="Song Title"
                            />
                        </div>

                        <div>
                            <label className="font-bold block mb-1">歌手</label>
                            <input 
                                type="text" 
                                value={uploadArtist}
                                onChange={(e) => setUploadArtist(e.target.value)}
                                className="memphis-input w-full"
                                placeholder="Artist Name"
                            />
                        </div>

                        <button 
                            onClick={handleUpload} 
                            disabled={isUploading || !uploadFile}
                            className="memphis-btn bg-memphis-green w-full mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isUploading ? "上传中..." : "确认上传"}
                        </button>
                    </div>
                )
            )}

            {/* Player Controls */}
            <div className="bg-white border-3 border-memphis-black p-4 shadow-[4px_4px_0_#232323] flex flex-col gap-3 items-center">
                {currentSong ? (
                    <>
                        <div className="text-center w-full overflow-hidden">
                            <h3 className="font-bold text-lg truncate">{currentSong.title}</h3>
                            <p className="text-sm text-gray-500 truncate">{currentSong.artist}</p>
                        </div>
                        
                        <div className="flex items-center gap-4 w-full justify-center mt-2">
                            <button 
                                onClick={handlePrev} 
                                className="memphis-btn bg-white p-2 rounded-full hover:bg-gray-100 flex items-center justify-center w-10 h-10"
                                title="Previous"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <polygon points="19 20 9 12 19 4 19 20"></polygon>
                                    <line x1="5" y1="19" x2="5" y2="5"></line>
                                </svg>
                            </button>
                            
                            <button 
                                onClick={handlePlayPause} 
                                className="memphis-btn bg-memphis-yellow p-3 rounded-full hover:bg-yellow-300 flex items-center justify-center w-14 h-14"
                                title={isPlaying ? "Pause" : "Play"}
                            >
                                {isPlaying ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="6" y="4" width="4" height="16"></rect>
                                        <rect x="14" y="4" width="4" height="16"></rect>
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1">
                                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                                    </svg>
                                )}
                            </button>

                            <button 
                                onClick={handleNext} 
                                className="memphis-btn bg-white p-2 rounded-full hover:bg-gray-100 flex items-center justify-center w-10 h-10"
                                title="Next"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <polygon points="5 4 15 12 5 20 5 4"></polygon>
                                    <line x1="19" y1="5" x2="19" y2="19"></line>
                                </svg>
                            </button>
                        </div>

                        <div className="w-full flex items-center gap-2 mt-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                            </svg>
                            <input 
                                type="range" 
                                min="0" 
                                max="1" 
                                step="0.1" 
                                value={volume}
                                onChange={(e) => setVolume(parseFloat(e.target.value))}
                                className="w-full accent-memphis-black h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer border-2 border-memphis-black"
                            />
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                            </svg>
                        </div>

                        <audio 
                            ref={audioRef} 
                            src={currentSong.url} 
                            onEnded={handleSongEnd}
                        />
                    </>
                ) : (
                    <p className="text-gray-500 italic">暂无歌曲，请上传...</p>
                )}
            </div>

            {/* Playlist */}
            <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-1">
                {songs.map((song, index) => (
                    <div 
                        key={song.id}
                        onClick={() => {
                            setCurrentSongIndex(index);
                            setIsPlaying(true);
                        }}
                        className={`
                            flex justify-between items-center p-2 border-2 border-memphis-black cursor-pointer transition-all
                            ${index === currentSongIndex ? 'bg-memphis-yellow shadow-[2px_2px_0_#232323] translate-x-[-2px] translate-y-[-2px]' : 'bg-white hover:bg-gray-100'}
                        `}
                    >
                        <div className="flex flex-col overflow-hidden flex-1">
                            <span className="font-bold text-sm truncate">{song.title}</span>
                            <span className="text-xs text-gray-500 truncate">{song.artist}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            {index === currentSongIndex && <span className="animate-pulse">🎵</span>}
                            {currentUser && (
                                <button 
                                    onClick={(e) => handleDeleteSong(e, song)}
                                    className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 transition"
                                    title="删除"
                                >
                                    🗑️
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Delete Confirmation Modal */}
            <ConfirmModal 
                isOpen={isDeleteModalOpen} 
                onCancel={() => {
                    setIsDeleteModalOpen(false);
                    setSongToDelete(null);
                }}
                onConfirm={confirmDelete}
                title="确认删除"
                message={songToDelete ? `确定要删除 "${songToDelete.title}" 吗?` : "确定要删除吗?"}
            />
        </section>
    );
}
