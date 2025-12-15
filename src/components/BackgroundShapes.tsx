export default function BackgroundShapes() {
    return (
        <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
            {/* Circle */}
            <div className="absolute top-10 left-10 w-20 h-20 rounded-full border-3 border-memphis-black bg-memphis-yellow opacity-50"></div>
            
            {/* Triangle */}
            <div className="absolute bottom-20 left-20 w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-b-[40px] border-b-memphis-cyan opacity-50 rotate-12"></div>
            
            {/* Zigzag */}
            <div className="absolute top-1/3 right-10 w-24 h-6 bg-transparent border-b-4 border-memphis-pink rotate-45"></div>
            
            {/* Square with offset */}
            <div className="absolute bottom-10 right-10 w-16 h-16 bg-memphis-white border-3 border-memphis-black shadow-[4px_4px_0_#232323]"></div>
            
            {/* Dots pattern */}
            <div className="absolute top-1/2 left-10 flex gap-2">
                <div className="w-2 h-2 bg-memphis-black rounded-full"></div>
                <div className="w-2 h-2 bg-memphis-black rounded-full"></div>
                <div className="w-2 h-2 bg-memphis-black rounded-full"></div>
            </div>
        </div>
    );
}
