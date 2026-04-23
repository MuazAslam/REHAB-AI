import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function ActivityHeatmap({ userId }) {
    const [activityData, setActivityData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchActivity = async () => {
            try {
                const res = await fetch(`http://127.0.0.1:8000/api/patient-exercises/${userId}`);
                const data = await res.json();

                if (data.status !== "success") return;

                const today = new Date();
                const days = [];

                for (let i = 89; i >= 0; i--) {
                    const date = new Date(today);
                    date.setDate(today.getDate() - i);
                    const dateStr = date.toISOString().split('T')[0];

                    const dayExercises = data.exercises.filter(ex => {
                        const exDate = new Date(ex.assigned_date).toISOString().split('T')[0];
                        return exDate === dateStr;
                    });

                    const assigned = dayExercises.length;
                    const completed = dayExercises.filter(ex => ex.status === 'completed').length;

                    let level = 0;
                    if (assigned === 0) level = 0;
                    else if (completed === 0) level = 0;
                    else if (completed < assigned) level = 1;
                    else level = 2;

                    days.push({ date: dateStr, level, assigned, completed });
                }

                setActivityData(days);
            } catch (error) {
                console.error('Error fetching activity:', error);
            } finally {
                setLoading(false);
            }
        };

        if (userId) fetchActivity();
    }, [userId]);

    const getLevelStyle = (level) => {
        switch (level) {
            case 0: return 'bg-slate-700';
            case 1: return 'bg-gradient-to-br from-teal-200 to-teal-400';
            case 2: return 'bg-gradient-to-br from-teal-500 to-teal-800';
            default: return 'bg-slate-700';
        }
    };

    const weeks = [];
    for (let i = 0; i < activityData.length; i += 7) {
        weeks.push(activityData.slice(i, i + 7));
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-[#1e2330] rounded-xl shadow-xl p-6 border border-slate-700/50 h-full flex flex-col"
        >
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="font-semibold text-lg text-slate-200 tracking-tight">Consistency Streak</h3>
                    <p className="text-sm text-slate-400 mt-0.5">Last 3 months</p>
                </div>
            </div>

            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
                </div>
            ) : (
                <div className="flex-1 flex flex-col justify-center">
                    <div className="flex gap-1 justify-center overflow-x-auto pb-2">
                        {weeks.map((week, weekIdx) => (
                            <div key={weekIdx} className="flex flex-col gap-1">
                                {week.map((day, dayIdx) => (
                                    <motion.div
                                        key={dayIdx}
                                        initial={{ opacity: 0, scale: 0 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{
                                            duration: 0.3,
                                            delay: (weekIdx * 7 + dayIdx) * 0.005,
                                            ease: "easeOut"
                                        }}
                                        whileHover={{ scale: 1.3, zIndex: 10 }}
                                        className="relative group"
                                    >
                                        <div
                                            className={`w-3 h-3 rounded ${getLevelStyle(day.level)} cursor-pointer shadow-sm`}
                                            style={{
                                                boxShadow: day.level > 0 ? '0 1px 3px rgba(0,0,0,0.3)' : 'none'
                                            }}
                                        >
                                            <motion.div
                                                initial={{ opacity: 0, y: 5 }}
                                                whileHover={{ opacity: 1, y: 0 }}
                                                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 pointer-events-none"
                                            >
                                                <div className="bg-slate-900/95 backdrop-blur-sm text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-xl border border-slate-700">
                                                    <div className="font-semibold mb-1">{new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                                                    <div className="text-slate-300 text-[10px]">
                                                        {day.assigned > 0 ? `${day.completed}/${day.assigned} completed` : 'No exercises'}
                                                    </div>
                                                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45 -mt-1"></div>
                                                </div>
                                            </motion.div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        ))}
                    </div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8 }}
                        className="flex items-center justify-center gap-2 mt-6 text-xs text-slate-400"
                    >
                        <span>Less</span>
                        <div className="flex gap-1">
                            <div className="w-3 h-3 rounded bg-slate-700 shadow-sm"></div>
                            <div className="w-3 h-3 rounded bg-gradient-to-br from-teal-200 to-teal-400 shadow-sm"></div>
                            <div className="w-3 h-3 rounded bg-gradient-to-br from-teal-500 to-teal-800 shadow-sm"></div>
                        </div>
                        <span>More</span>
                    </motion.div>
                </div>
            )}
        </motion.div>
    );
}
