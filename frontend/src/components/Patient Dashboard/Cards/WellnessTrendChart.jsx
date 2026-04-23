import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import { motion } from 'framer-motion';

export default function WellnessTrendChart({ userId }) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState(7);

    useEffect(() => {
        const fetchWellnessData = async () => {
            if (!userId) return;

            setLoading(true);
            try {
                const res = await axios.get(
                    `http://127.0.0.1:8000/api/recovery-metrics/${userId}?days=${period}`
                );

                if (res.data.status === 'success') {
                    setData(res.data.daily_scores || []);
                }
            } catch (error) {
                console.error('Failed to fetch wellness data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchWellnessData();
    }, [userId, period]);

    if (loading || data.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-[#1e2330] rounded-xl shadow-xl p-6 border border-slate-700/50 h-full flex items-center justify-center"
            >
                <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
            </motion.div>
        );
    }

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-slate-800/95 backdrop-blur-sm px-4 py-3 rounded-xl shadow-lg border border-slate-700"
                >
                    <p className="text-xs text-slate-400 mb-2">{payload[0]?.payload?.date}</p>
                    {payload.map((entry, index) => (
                        <div key={index} className="flex items-center justify-between gap-4 text-sm">
                            <span style={{ color: entry.color }} className="font-medium">{entry.name}:</span>
                            <span className="font-bold text-white">{Math.round(entry.value)}%</span>
                        </div>
                    ))}
                </motion.div>
            );
        }
        return null;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-[#1e2330] rounded-xl shadow-xl p-8 border border-slate-700/50 h-full flex flex-col"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="font-semibold text-lg text-slate-200 tracking-tight">Wellness Trend Over Time</h3>
                    <p className="text-sm text-slate-400 mt-0.5">Sleep, Mood & Fatigue</p>
                </div>

                {/* Period Selector */}
                <div className="flex gap-1.5 bg-slate-800/50 p-1 rounded-xl">
                    {[7, 14, 30].map(days => (
                        <motion.button
                            key={days}
                            onClick={() => setPeriod(days)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 ${period === days
                                ? 'bg-slate-700 text-white shadow-sm'
                                : 'text-slate-400 hover:text-slate-200'
                                }`}
                        >
                            {days}d
                        </motion.button>
                    ))}
                </div>
            </div>

            {/* Chart */}
            <div className="flex-1">
                <ResponsiveContainer width="100%" height={128}>
                    <AreaChart
                        data={data}
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                        <defs>
                            <linearGradient id="colorMood" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#C084FC" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#C084FC" stopOpacity={0.05} />
                            </linearGradient>
                            <linearGradient id="colorSleep" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.05} />
                            </linearGradient>
                            <linearGradient id="colorFatigue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#EC4899" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#EC4899" stopOpacity={0.05} />
                            </linearGradient>
                        </defs>

                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#475569"
                            strokeOpacity={0.3}
                            vertical={true}
                        />


                        <YAxis
                            domain={[0, 100]}
                            stroke="#94a3b8"
                            tick={{ fill: '#94a3b8', fontSize: 11 }}
                            tickLine={{ stroke: '#475569' }}
                            axisLine={{ stroke: '#475569' }}
                            label={{ value: 'Score %', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 12 }}
                        />
                        <Tooltip content={<CustomTooltip />} />

                        <Area
                            type="linear"
                            dataKey="fatigue_score"
                            stroke="#EC4899"
                            strokeWidth={2.5}
                            fill="url(#colorFatigue)"
                            name="Fatigue"
                            animationDuration={1000}
                            dot={{ fill: '#EC4899', strokeWidth: 2, r: 4, stroke: '#fff' }}
                            activeDot={{ r: 6, strokeWidth: 2 }}
                        />

                        <Area
                            type="linear"
                            dataKey="sleep_score"
                            stroke="#3B82F6"
                            strokeWidth={2.5}
                            fill="url(#colorSleep)"
                            name="Sleep"
                            animationDuration={1000}
                            dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4, stroke: '#fff' }}
                            activeDot={{ r: 6, strokeWidth: 2 }}
                        />

                        <Area
                            type="linear"
                            dataKey="mood_score"
                            stroke="#C084FC"
                            strokeWidth={2.5}
                            fill="url(#colorMood)"
                            name="Mood"
                            animationDuration={1000}
                            dot={{ fill: '#C084FC', strokeWidth: 2, r: 4, stroke: '#fff' }}
                            activeDot={{ r: 6, strokeWidth: 2 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-8 mt-6 text-sm">
                <motion.div
                    className="flex items-center gap-2.5"
                    whileHover={{ scale: 1.05 }}
                >
                    <div className="w-3 h-3 rounded-full bg-gradient-to-br from-purple-400 to-purple-500 shadow-sm"></div>
                    <span className="text-slate-300 font-medium">Mood</span>
                </motion.div>
                <motion.div
                    className="flex items-center gap-2.5"
                    whileHover={{ scale: 1.05 }}
                >
                    <div className="w-3 h-3 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 shadow-sm"></div>
                    <span className="text-slate-300 font-medium">Sleep</span>
                </motion.div>
                <motion.div
                    className="flex items-center gap-2.5"
                    whileHover={{ scale: 1.05 }}
                >
                    <div className="w-3 h-3 rounded-full bg-gradient-to-br from-pink-400 to-pink-500 shadow-sm"></div>
                    <span className="text-slate-300 font-medium">Fatigue</span>
                </motion.div>
            </div>
        </motion.div >
    );
}