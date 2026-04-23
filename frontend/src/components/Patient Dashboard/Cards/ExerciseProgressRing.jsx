import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ExerciseProgressRing({ completed, missed, assigned }) {
    const pending = assigned - completed - missed;
    const total = assigned;

    const [hoveredRing, setHoveredRing] = useState('completed');

    const completedPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
    const pendingPercent = total > 0 ? Math.round((pending / total) * 100) : 0;
    const missedPercent = total > 0 ? Math.round((missed / total) * 100) : 0;

    const size = 180;
    const strokeWidth = 20;
    const gap = 2;

    const outerRadius = (size - strokeWidth) / 2;
    const middleRadius = outerRadius - strokeWidth - gap;
    const innerRadius = middleRadius - strokeWidth - gap;

    const getCircleProps = (radius, percent) => {
        const circumference = 2 * Math.PI * radius;
        const progress = (percent / 100) * circumference;
        const offset = circumference - progress;
        return { circumference, offset };
    };

    const completedRing = getCircleProps(outerRadius, completedPercent);
    const pendingRing = getCircleProps(middleRadius, pendingPercent);
    const missedRing = getCircleProps(innerRadius, missedPercent);

    const getDisplayedPercent = () => {
        switch (hoveredRing) {
            case 'completed': return completedPercent;
            case 'pending': return pendingPercent;
            case 'missed': return missedPercent;
            default: return completedPercent;
        }
    };

    const getDisplayedLabel = () => {
        switch (hoveredRing) {
            case 'completed': return 'Done';
            case 'pending': return 'Pending';
            case 'missed': return 'Missed';
            default: return 'Done';
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="bg-[#1e2330] rounded-xl shadow-xl p-6 h-full flex flex-col"
        >
            <div className="mb-4">
                <h3 className="text-sm font-semibold text-slate-200 mb-3">Exercise Progress</h3>
            </div>

            <div className="flex-1 flex items-center justify-center">
                <div className="relative" style={{ width: size, height: size }}>
                    <svg width={size} height={size} className="transform -rotate-90">
                        <defs>
                            <linearGradient id="completedGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#22D3EE" />
                                <stop offset="100%" stopColor="#06B6D4" />
                            </linearGradient>
                            <linearGradient id="pendingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#60A5FA" />
                                <stop offset="100%" stopColor="#3B82F6" />
                            </linearGradient>
                            <linearGradient id="missedGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#A78BFA" />
                                <stop offset="100%" stopColor="#8B5CF6" />
                            </linearGradient>
                        </defs>

                        {/* Completed */}
                        <circle cx={size / 2} cy={size / 2} r={outerRadius} fill="none" stroke="#1e293b" strokeWidth={strokeWidth} />
                        <motion.circle
                            cx={size / 2} cy={size / 2} r={outerRadius}
                            fill="none" stroke="url(#completedGradient)" strokeWidth={strokeWidth}
                            strokeDasharray={completedRing.circumference}
                            initial={{ strokeDashoffset: completedRing.circumference }}
                            animate={{ strokeDashoffset: completedRing.offset }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            strokeLinecap="round"
                            className="cursor-pointer"
                            style={{ filter: hoveredRing === 'completed' ? 'drop-shadow(0 0 8px rgba(34, 211, 238, 0.5))' : 'none' }}
                            onMouseEnter={() => setHoveredRing('completed')}
                            onMouseLeave={() => setHoveredRing('completed')}
                        />

                        {/* Pending */}
                        <circle cx={size / 2} cy={size / 2} r={middleRadius} fill="none" stroke="#1e293b" strokeWidth={strokeWidth} />
                        <motion.circle
                            cx={size / 2} cy={size / 2} r={middleRadius}
                            fill="none" stroke="url(#pendingGradient)" strokeWidth={strokeWidth}
                            strokeDasharray={pendingRing.circumference}
                            initial={{ strokeDashoffset: pendingRing.circumference }}
                            animate={{ strokeDashoffset: pendingRing.offset }}
                            transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
                            strokeLinecap="round"
                            className="cursor-pointer"
                            style={{ filter: hoveredRing === 'pending' ? 'drop-shadow(0 0 8px rgba(96, 165, 250, 0.5))' : 'none' }}
                            onMouseEnter={() => setHoveredRing('pending')}
                            onMouseLeave={() => setHoveredRing('completed')}
                        />

                        {/* Missed */}
                        <circle cx={size / 2} cy={size / 2} r={innerRadius} fill="none" stroke="#1e293b" strokeWidth={strokeWidth} />
                        <motion.circle
                            cx={size / 2} cy={size / 2} r={innerRadius}
                            fill="none" stroke="url(#missedGradient)" strokeWidth={strokeWidth}
                            strokeDasharray={missedRing.circumference}
                            initial={{ strokeDashoffset: missedRing.circumference }}
                            animate={{ strokeDashoffset: missedRing.offset }}
                            transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
                            strokeLinecap="round"
                            className="cursor-pointer"
                            style={{ filter: hoveredRing === 'missed' ? 'drop-shadow(0 0 8px rgba(167, 139, 250, 0.5))' : 'none' }}
                            onMouseEnter={() => setHoveredRing('missed')}
                            onMouseLeave={() => setHoveredRing('completed')}
                        />
                    </svg>

                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={hoveredRing}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                transition={{ duration: 0.2 }}
                                className="text-md font-bold bg-gradient-to-br from-cyan-400 to-blue-500 bg-clip-text text-transparent"
                            >
                                {getDisplayedPercent()}%
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-center gap-4 mt-4 text-xs">
                {[
                    { key: 'completed', label: 'Done', color: 'from-cyan-400 to-cyan-600' },
                    { key: 'pending', label: 'Pending', color: 'from-blue-400 to-blue-600' },
                    { key: 'missed', label: 'Missed', color: 'from-purple-400 to-purple-600' }
                ].map(item => (
                    <motion.div
                        key={item.key}
                        className="flex items-center gap-1.5 cursor-pointer"
                        whileHover={{ scale: 1.1 }}
                        onMouseEnter={() => setHoveredRing(item.key)}
                    >
                        <div className={`w-2.5 h-2.5 rounded-full bg-gradient-to-r ${item.color}`}></div>
                        <span className="text-slate-400">{item.label}</span>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
}