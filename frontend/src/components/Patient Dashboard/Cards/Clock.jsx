import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function Clock() {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const hours = time.getHours();
    const minutes = time.getMinutes();
    const seconds = time.getSeconds();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;

    const formatDate = (date) => {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-3 bg-gradient-to-br from-slate-800 to-slate-900 px-4 py-2.5 rounded-xl shadow-lg border border-slate-700/50"
        >
            {/* Animated Clock Icon */}
            <div className="relative w-10 h-10">
                {/* Clock Face */}
                <div className="absolute inset-0 rounded-full bg-slate-700/50 shadow-md border-2 border-slate-600/50 flex items-center justify-center overflow-hidden backdrop-blur-sm">
                    {/* Hour Hand */}
                    <div
                        className="absolute bg-slate-200 rounded-full"
                        style={{
                            width: '2px',
                            height: '12px',
                            bottom: '50%',
                            left: '50%',
                            transformOrigin: 'bottom center',
                            transform: `translateX(-50%) rotate(${(displayHours * 30) + (minutes * 0.5)}deg)`,
                            transition: 'transform 1s cubic-bezier(0.4, 0.0, 0.2, 1)'
                        }}
                    />
                    {/* Minute Hand */}
                    <div
                        className="absolute bg-slate-300 rounded-full"
                        style={{
                            width: '1.5px',
                            height: '16px',
                            bottom: '50%',
                            left: '50%',
                            transformOrigin: 'bottom center',
                            transform: `translateX(-50%) rotate(${minutes * 6}deg)`,
                            transition: 'transform 1s cubic-bezier(0.4, 0.0, 0.2, 1)'
                        }}
                    />
                    {/* Second Hand */}
                    <motion.div
                        className="absolute bg-teal-400 rounded-full"
                        style={{
                            width: '1px',
                            height: '18px',
                            bottom: '50%',
                            left: '50%',
                            transformOrigin: 'bottom center',
                            transform: `translateX(-50%) rotate(${seconds * 6}deg)`,
                            transition: seconds === 0 ? 'none' : 'transform 1s cubic-bezier(0.4, 0.0, 0.2, 1)'
                        }}
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                    />
                    {/* Center Dot */}
                    <div className="absolute w-1.5 h-1.5 bg-teal-400 rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 shadow-sm shadow-teal-400/50" />
                </div>
            </div>

            {/* Digital Time */}
            <div className="flex flex-col leading-tight">
                <div className="flex items-baseline gap-1">
                    <motion.span
                        key={`${displayHours}:${minutes}`}
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-xl font-semibold text-slate-200 tabular-nums"
                    >
                        {String(displayHours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}
                    </motion.span>
                    <span className="text-xs font-medium text-teal-400 tabular-nums">
                        :{String(seconds).padStart(2, '0')}
                    </span>
                    <span className="text-xs font-medium text-slate-400 ml-0.5">
                        {ampm}
                    </span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium tracking-wide">
                    {formatDate(time)}
                </span>
            </div>
        </motion.div>
    );
}
