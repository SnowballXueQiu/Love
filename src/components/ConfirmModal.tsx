"use client";
import { useRef, useEffect } from "react";
import useLockBodyScroll from "@/hooks/useLockBodyScroll";

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel }: ConfirmModalProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);

    useLockBodyScroll(isOpen);

    useEffect(() => {
        if (isOpen) {
            dialogRef.current?.showModal();
        } else {
            dialogRef.current?.close();
        }
    }, [isOpen]);

    return (
        <dialog
            ref={dialogRef}
            className="bg-transparent p-0 border-none outline-none backdrop:bg-black/50 backdrop:backdrop-blur-sm open:animate-in open:fade-in open:zoom-in-95 duration-200 m-auto"
            onClick={(e) => {
                if (e.target === dialogRef.current) onCancel();
            }}
            onCancel={onCancel}
        >
            <div className="bg-white border-3 border-memphis-black p-6 shadow-[8px_8px_0_#232323] max-w-sm w-full flex flex-col gap-4">
                <h3 className="text-xl font-bold text-memphis-black">{title}</h3>
                <p className="text-gray-700">{message}</p>
                <div className="flex gap-3 justify-end mt-2">
                    <button
                        onClick={onCancel}
                        className="memphis-btn bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300"
                    >
                        取消
                    </button>
                    <button
                        onClick={onConfirm}
                        className="memphis-btn bg-memphis-pink text-white px-4 py-2 text-sm hover:bg-red-500"
                    >
                        确认删除
                    </button>
                </div>
            </div>
        </dialog>
    );
}
