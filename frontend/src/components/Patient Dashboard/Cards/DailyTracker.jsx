import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function DailyTracker({ userId }) {
    const [weekData, setWeekData] = useState([]);
    const [loading, setLoading] = useState(true);

    const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const fullDayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    useEffect(() => {
        const fetchWeeklyProgress = async () => {
            try {
                const res = await fetch(`http://127.0.0.1:8000/api/patient-exercises/${userId}`);
                const data = await res.json();

                if (data.status !== "success") return;

                const today = new Date();
                const todayStr = today.toISOString().split('T')[0];

                // Get Monday of current week
                const currentDay = today.getDay();
                const diff = currentDay === 0 ? -6 : 1 - currentDay;
                const monday = new Date(today);
                monday.setDate(today.getDate() + diff);

                // Generate 7 days starting from Monday
                const weekDays = Array.from({ length: 7 }, (_, i) => {
                    const date = new Date(monday);
                    date.setDate(monday.getDate() + i);
                    return date;
                });

                const weekProgress = weekDays.map((date, idx) => {
                    const dateStr = date.toISOString().split('T')[0];

                    const assignedExercises = data.exercises.filter(ex => {
                        const assignedDate = new Date(ex.assigned_date).toISOString().split('T')[0];
                        return assignedDate === dateStr;
                    });

                    const completedExercises = assignedExercises.filter(ex => ex.status === 'completed');

                    const isPast = dateStr < todayStr;
                    const isToday = dateStr === todayStr;
                    const isFuture = dateStr > todayStr;

                    const completionPercentage = assignedExercises.length > 0
                        ? (completedExercises.length / assignedExercises.length) * 100
                        : 0;

                    return {
                        day: daysOfWeek[idx],
                        fullName: fullDayNames[idx],
                        isPast,
                        isToday,
                        isFuture,
                        date: dateStr,
                        assigned: assignedExercises.length,
                        completed: completedExercises.length,
                        completionPercentage
                    };
                });

                setWeekData(weekProgress);
            } catch (error) {
                console.error('Error fetching weekly progress:', error);
            } finally {
                setLoading(false);
            }
        };

        if (userId) {
            fetchWeeklyProgress();
        }
    }, [userId]);

    if (loading) {
        return (
            <div className="flex gap-2">
                <div className="w-8 h-8 border-2 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex justify-between gap-2">
            {weekData.map((day, idx) => (
                <div key={idx} className="group relative">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{
                            duration: 0.5,
                            delay: idx * 0.1,
                            type: "spring",
                            stiffness: 200
                        }}
                        whileHover={{
                            scale: [1, 1.3, 1],
                            transition: {
                                duration: 0.6,
                                times: [0, 0.5, 1],
                                ease: "easeInOut"
                            }
                        }}
                        className="relative w-10 h-10"
                    >
                        {/* Circle with progress ring or solid fill */}
                        {day.isFuture ? (
                            // Future days: Empty circle with gray outline
                            <div className="w-full h-full rounded-full border-2 border-slate-700/50 flex items-center justify-center text-[11px] font-semibold text-slate-500 cursor-pointer">
                                {day.day.charAt(0)}
                            </div>
                        ) : day.isToday ? (
                            // Today: Filled circle with gradient
                            <div className="w-full h-full rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center text-[11px] font-bold text-white cursor-pointer shadow-lg shadow-cyan-500/50">
                                {day.day.charAt(0)}
                                {/* Pulsing indicator */}
                                <motion.div
                                    animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className="absolute inset-0 rounded-full border-2 border-cyan-400"
                                />
                            </div>
                        ) : (
                            // Past days: Progress ring based on completion percentage
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 40 40">
                                {/* Background circle */}
                                <circle
                                    cx="20"
                                    cy="20"
                                    r="17"
                                    fill="none"
                                    stroke="#475569"
                                    strokeWidth="3"
                                    opacity="0.2"
                                />
                                {/* Progress circle */}
                                <motion.circle
                                    cx="20"
                                    cy="20"
                                    r="17"
                                    fill="none"
                                    stroke={day.completionPercentage === 100 ? "#14b8a6" : day.completionPercentage > 0 ? "#facc15" : "#ef4444"}
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    initial={{ strokeDashoffset: 107 }}
                                    animate={{
                                        strokeDashoffset: 107 - (107 * day.completionPercentage / 100)
                                    }}
                                    transition={{ duration: 1, delay: idx * 0.1, ease: "easeOut" }}
                                    style={{
                                        strokeDasharray: 107,
                                        filter: 'drop-shadow(0 0 3px rgba(20, 184, 166, 0.5))'
                                    }}
                                />
                                {/* Center text */}
                                <text
                                    x="20"
                                    y="20"
                                    textAnchor="middle"
                                    dominantBaseline="central"
                                    className="text-[11px] font-semibold"
                                    fill={day.completionPercentage === 100 ? "#14b8a6" : day.completionPercentage > 0 ? "#facc15" : "#ef4444"}
                                    transform="rotate(90 20 20)"
                                >
                                    {day.day.charAt(0)}
                                </text>
                            </svg>
                        )}
                    </motion.div>

                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-slate-900/95 backdrop-blur-sm text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-xl border border-slate-700"
                        >
                            <div className="font-semibold mb-1">{day.fullName}</div>
                            <div className="text-slate-300 text-[10px]">
                                {day.isFuture ? (
                                    'Upcoming'
                                ) : day.isToday ? (
                                    day.assigned > 0 ? (
                                        `${day.completed}/${day.assigned} done (Today)`
                                    ) : (
                                        'No exercises today'
                                    )
                                ) : day.assigned > 0 ? (
                                    <>
                                        {day.completed}/{day.assigned} completed
                                        <span className={`ml-2 font-semibold ${day.completionPercentage === 100 ? 'text-teal-400' :
                                                day.completionPercentage > 0 ? 'text-yellow-400' : 'text-red-400'
                                            }`}>
                                            ({Math.round(day.completionPercentage)}%)
                                        </span>
                                    </>
                                ) : (
                                    'No exercises'
                                )}
                            </div>
                            {/* Arrow */}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45 -mt-1 border-r border-b border-slate-700"></div>
                        </motion.div>
                    </div>
                </div>
            ))}
        </div>
    );
}
