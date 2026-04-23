import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { LineChart, Line, ResponsiveContainer, Tooltip, YAxis } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

export default function RecoveryTrendCard({ userId }) {
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState(7);

    useEffect(() => {
        const fetchMetrics = async () => {
            if (!userId) return;

            setLoading(true);
            try {
                const res = await axios.get(
                    `http://127.0.0.1:8000/api/recovery-metrics/${userId}?days=${period}`
                );

                if (res.data.status === 'success') {
                    setMetrics(res.data);
                }
            } catch (error) {
                console.error('Failed to fetch recovery metrics:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchMetrics();
    }, [userId, period]);

    if (loading || !metrics) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-[#1e2330] backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-gray-100/50 h-full flex items-center justify-center"
            >
                <div className="w-8 h-8 border-2 border-teal-500/20 border-t-teal-500 rounded-full animate-spin" />
            </motion.div>
        );
    }

    const currentScore = metrics.current_score;
    const trend = metrics.trend;
    const warnings = metrics.warnings || [];
    const dailyScores = metrics.daily_scores || [];

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white/95 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg border border-gray-200"
                >
                    <p className="text-xs text-teal-600 font-semibold">{Math.round(payload[0].value)}%</p>
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
            className="bg-[#1e2330] rounded-xl shadow-xl p-6 border border-slate-700/50 h-full flex flex-col"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="font-semibold text-lg text-slate-200 tracking-tight">Recovery Progress Over Time </h3>
                    <p className="text-sm text-slate-400 mt-0.5">Comprehensive health tracking</p>
                </div>

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

            {/* Score */}
            <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 100 }}
                className="mb-4"
            >
                <div className="flex items-baseline gap-2">
                    <motion.span
                        key={currentScore}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-5xl font-bold bg-gradient-to-r from-teal-500 to-teal-600 bg-clip-text text-transparent"
                    >
                        {Math.round(currentScore)}
                    </motion.span>
                    <span className="text-2xl text-gray-400">%</span>

                    <AnimatePresence mode="wait">
                        {trend.direction === 'improving' && (
                            <motion.span
                                key="improving"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                className="text-green-600 text-sm font-medium"
                            >
                                ↗ +{trend.delta}%
                            </motion.span>
                        )}
                        {trend.direction === 'declining' && (
                            <motion.span
                                key="declining"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                className="text-red-600 text-sm font-medium"
                            >
                                ↘ {trend.delta}%
                            </motion.span>
                        )}
                        {trend.direction === 'stable' && (
                            <motion.span
                                key="stable"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                className="text-yellow-600 text-sm font-medium"
                            >
                                → Stable
                            </motion.span>
                        )}
                    </AnimatePresence>
                </div>

                <div className="text-sm text-slate-400 mt-1">
                    {currentScore >= 70
                        ? 'Excellent recovery'
                        : currentScore >= 40
                            ? 'Moderate progress'
                            : 'Needs attention'}
                </div>
            </motion.div>

            {/* Sparkline */}
            <div className="mb-4 h-16">
                <ResponsiveContainer width="100%" height={150}>
                    <LineChart data={dailyScores}>
                        <defs>
                            <linearGradient id="recoverySparklineGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.3} />
                                <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.05} />
                            </linearGradient>
                        </defs>
                        <YAxis domain={[0, 60]} hide={true} />
                        <Tooltip content={<CustomTooltip />} cursor={false} />
                        <Line
                            type="monotone"
                            dataKey="composite_score"
                            stroke="#14b8a6"
                            strokeWidth={2}
                            dot={{ fill: '#14b8a6', strokeWidth: 0, r: 5 }}
                            activeDot={{ r: 7, strokeWidth: 0 }}
                            fill="url(#recoverySparklineGradient)"
                            animationDuration={1000}
                            animationEasing="ease-in-out"
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Warnings */}
            <AnimatePresence>
                {warnings.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-2"
                    >
                        {warnings.slice(0, 2).map((warning, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className={`px-3 py-2 rounded-lg text-xs ${warning.severity === 'high'
                                    ? 'bg-red-50 text-red-600 border border-red-100'
                                    : 'bg-yellow-50 text-yellow-600 border border-yellow-100'
                                    }`}
                            >
                                ⚠️ {warning.message}
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
