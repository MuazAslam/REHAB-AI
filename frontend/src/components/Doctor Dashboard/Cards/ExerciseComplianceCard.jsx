import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { ClipboardCheck } from 'lucide-react';

export default function ExerciseComplianceCard({ doctorId }) {
    const [compliance, setCompliance] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCompliance = async () => {
            if (!doctorId) return;

            try {
                const res = await axios.get(
                    `http://127.0.0.1:8000/api/doctor-exercise-compliance/${doctorId}?days=30`
                );

                if (res.data.status === 'success') {
                    setCompliance(res.data);
                }
            } catch (error) {
                console.error('Failed to fetch compliance data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchCompliance();
    }, [doctorId]);

    if (loading || !compliance) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-[#1e2330] rounded-xl p-6 border border-slate-700/50 h-full flex items-center justify-center"
            >
                <div className="w-8 h-8 border-2 border-teal-500/20 border-t-teal-500 rounded-full animate-spin" />
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#1e2330] rounded-2xl p-6 border border-slate-700/50 shadow-xl min-w-0"
        >
            <div className="mb-6">
                <div className="flex items-center gap-3 mb-1">
                    <div className="p-2 bg-teal-500/10 rounded-lg">
                        <ClipboardCheck className="w-5 h-5 text-teal-500" />
                    </div>
                    <h3 className="text-slate-100 text-lg font-bold">Exercise Compliance</h3>
                </div>
                <p className="text-slate-500 text-xs ml-11">Overall patient compliance rate for Last 30 Days</p>
            </div>

            {/* Completion Rate */}

            <div className="mb-6">
                <div className="flex items-baseline gap-2">
                    <motion.span
                        key={compliance.completion_rate}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-5xl font-bold bg-gradient-to-r from-teal-500 to-teal-600 bg-clip-text text-transparent"
                    >
                        {Math.round(compliance.completion_rate)}
                    </motion.span>
                    <span className="text-2xl text-slate-400">%</span>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                    {compliance.total_completed} of {compliance.total_exercises} exercises completed
                </p>
            </div>

            {/* Bar Chart Visualization */}
            <div className="w-full h-[256px] min-w-0">
                <ResponsiveContainer width="100%" height={256}>
                    <BarChart
                        data={[
                            { name: 'Completed', value: compliance.total_completed, color: '#14b8a6' },
                            { name: 'Pending', value: compliance.total_pending, color: '#f59e0b' },
                            { name: 'Missed', value: compliance.total_missed, color: '#ef4444' }
                        ]}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                        <defs>
                            <linearGradient id="completedGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#2dd4bf" />
                                <stop offset="100%" stopColor="#0f766e" />
                            </linearGradient>
                            <linearGradient id="pendingGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#fbbf24" />
                                <stop offset="100%" stopColor="#b45309" />
                            </linearGradient>
                            <linearGradient id="missedGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#f87171" />
                                <stop offset="100%" stopColor="#b91c1c" />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.1} vertical={false} />
                        <XAxis
                            dataKey="name"
                            stroke="#475569"
                            tick={{ fontSize: 12, fill: '#cbd5e1', fontWeight: 500 }}
                            dy={12}
                            tickLine={false}
                            axisLine={false}
                            interval="preserveStartEnd"
                        />
                        <YAxis
                            stroke="#475569"
                            tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 500 }}
                            tickLine={false}
                            axisLine={false}
                            dx={-10}
                        />
                        <Tooltip
                            cursor={{ fill: '#334155', opacity: 0.1 }}
                            contentStyle={{
                                backgroundColor: '#0f172a',
                                borderColor: '#334155',
                                color: '#f8fafc',
                                borderRadius: '12px',
                                padding: '12px',
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                            }}
                            itemStyle={{ fontSize: 13, fontWeight: 500 }}
                            formatter={(value) => [value, 'Exercises']}
                        />

                        <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                            <Cell key="completed" fill="url(#completedGradient)" />
                            <Cell key="pending" fill="url(#pendingGradient)" />
                            <Cell key="missed" fill="url(#missedGradient)" />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </motion.div>
    );
}
