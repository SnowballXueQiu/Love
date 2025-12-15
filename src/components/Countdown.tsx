"use client";
import { useEffect, useState } from "react";

interface CountdownProps {
    targetDate: string;
}

export default function Countdown({ targetDate }: CountdownProps) {
    const [timeLeft, setTimeLeft] = useState({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
    });

    useEffect(() => {
        const calculateTimeLeft = () => {
            const difference = +new Date() - +new Date(targetDate);

            if (difference > 0) {
                setTimeLeft({
                    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                    minutes: Math.floor((difference / 1000 / 60) % 60),
                    seconds: Math.floor((difference / 1000) % 60),
                });
            } else {
                // Future date handling if needed, currently assumes past date (count up)
                setTimeLeft({
                    days: Math.abs(Math.floor(difference / (1000 * 60 * 60 * 24))),
                    hours: Math.abs(Math.floor((difference / (1000 * 60 * 60)) % 24)),
                    minutes: Math.abs(Math.floor((difference / 1000 / 60) % 60)),
                    seconds: Math.abs(Math.floor((difference / 1000) % 60)),
                });
            }
        };

        calculateTimeLeft();
        const timer = setInterval(calculateTimeLeft, 1000);
        return () => clearInterval(timer);
    }, [targetDate]);

    return (
        <section className="memphis-card bg-memphis-cyan flex justify-around items-center w-full">
            <TimeBox value={timeLeft.days} label="天" />
            <TimeBox value={timeLeft.hours} label="时" />
            <TimeBox value={timeLeft.minutes} label="分" />
            <TimeBox value={timeLeft.seconds} label="秒" />
        </section>
    );
}

function TimeBox({ value, label }: { value: number; label: string }) {
    return (
        <div className="flex flex-col items-center">
            <span className="bg-memphis-white border-3 border-memphis-black px-2.5 py-1.5 min-w-[60px] text-center shadow-[3px_3px_0_#232323] mb-1.5 text-2.5rem font-bold block">
                {value}
            </span>
            <span className="text-0.9rem font-bold block">{label}</span>
        </div>
    );
}
