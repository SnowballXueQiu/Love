import { defineConfig, presetUno, presetAttributify, presetWebFonts } from 'unocss'

export default defineConfig({
    content: {
        filesystem: [
            'src/**/*.{html,js,ts,jsx,tsx}',
        ]
    },
    presets: [
        presetUno(),
        presetAttributify(),
        presetWebFonts({
            provider: 'none',
            fonts: {
                sans: 'var(--font-ark-pixel)',
            },
        }),
    ],
    theme: {
        colors: {
            memphis: {
                bg: '#f0f0f0',
                pink: '#ff90e8',
                cyan: '#23d5ab',
                yellow: '#ffc900',
                purple: '#a06cd5',
                orange: '#ff9f43',
                black: '#232323',
                white: '#ffffff',
            },
        },
    },
    shortcuts: {
        'memphis-card': 'bg-memphis-white border-3 border-memphis-black shadow-[6px_6px_0_#232323] p-5 transition-transform duration-100 hover:translate-x--2px hover:translate-y--2px hover:shadow-[8px_8px_0_#232323]',
        'memphis-btn': 'bg-memphis-white border-3 border-memphis-black px-5 py-2.5 font-bold cursor-pointer shadow-[4px_4px_0_#232323] active:translate-x-2px active:translate-y-2px active:shadow-[2px_2px_0_#232323] transition-all duration-100',
        'memphis-input': 'border-3 border-memphis-black p-2.5 outline-none shadow-[3px_3px_0_#232323] focus:translate-x-1px focus:translate-y-1px focus:shadow-[2px_2px_0_#232323] bg-white',
    },
    safelist: [
        'flex', 'flex-col', 'items-center', 'justify-center', 'min-h-screen', 'p-5', 'w-full', 'max-w-[500px]', 'gap-5',
        'text-center', 'relative', 'absolute', 'top-2', 'right-2', 'text-2xl', 'font-bold', 'mb-1', 'uppercase', 'break-words',
        'bg-memphis-pink', 'bg-memphis-cyan', 'bg-memphis-yellow', 'bg-memphis-purple', 'bg-memphis-orange', 'text-memphis-white', 'text-shadow-sm'
    ]
})
