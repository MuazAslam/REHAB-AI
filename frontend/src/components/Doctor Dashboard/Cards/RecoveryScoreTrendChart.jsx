import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';

// Color palette for patient lines with gradient definitions
const PATIENT_COLORS = [
    { stroke: '#14b8a6', id: 'colorPatient0' }, // teal
    { stroke: '#3b82f6', id: 'colorPatient1' }, // blue
    { stroke: '#8b5cf6', id: 'colorPatient2' }, // purple
    { stroke: '#ec4899', id: 'colorPatient3' }, // pink
    { stroke: '#f59e0b', id: 'colorPatient4' }, // amber
    { stroke: '#10b981', id: 'colorPatient5' }, // emerald
    { stroke: '#6366f1', id: 'colorPatient6' }, // indigo
    { stroke: '#f97316', id: 'colorPatient7' }, // orange
];

export default function RecoveryScoreTrendChart({ doctorId }) {
    const [chartData, setChartData] = useState([]);
    const [patientLines, setPatientLines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [days, setDays] = useState(7);
    const [viewMode, setViewMode] = useState('cohort');

    useEffect(() => {
        const fetchTrendData = async () => {
            if (!doctorId) return;

            setLoading(true);
            try {
                const res = await axios.get(
                    `http://127.0.0.1:8000/api/doctor-recovery-trends/${doctorId}?days=${days}&view_mode=${viewMode}`
                );

                if (res.data.status === 'success') {
                    if (viewMode === 'patient_wise') {
                        // Process patient-wise data
                        const patients = res.data.patient_trends || [];

                        // Create a unified dataset with all dates
                        const dateMap = new Map();

                        patients.forEach((patient, idx) => {
                            patient.data.forEach(d => {
                                if (!dateMap.has(d.date)) {
                                    dateMap.set(d.date, {
                                        date: d.date,
                                        displayDate: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                    });
                                }
                                dateMap.get(d.date)[`patient_${idx}`] = d.score;
                            });
                        });

                        const sorted = Array.from(dateMap.values()).sort((a, b) =>
                            new Date(a.date) - new Date(b.date)
                        );

                        setChartData(sorted);
                        setPatientLines(patients.map((p, idx) => ({
                            key: `patient_${idx}`,
                            name: p.patient_name,
                            color: PATIENT_COLORS[idx % PATIENT_COLORS.length].stroke,
                            gradientId: PATIENT_COLORS[idx % PATIENT_COLORS.length].id
                        })));
                    } else {
                        // Process cohort data
                        const filtered = res.data.trend_data
                            .filter(d => d.avg_score !== null)
                            .map(d => ({
                                ...d,
                                displayDate: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                            }));
                        setChartData(filtered);
                        setPatientLines([]);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch recovery trends:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchTrendData();
    }, [doctorId, days, viewMode]);

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-[#0f172a]/90 backdrop-blur-md px-4 py-3 rounded-xl shadow-2xl border border-slate-700/50"
                >
                    <p className="text-xs text-slate-300 font-medium mb-1">{payload[0].payload.displayDate}</p>
                    {viewMode === 'cohort' ? (
                        <>
                            <p className="text-sm text-teal-400 font-bold">{Math.round(payload[0].value)}%</p>
                            <p className="text-xs text-slate-500">{payload[0].payload.patient_count} patients</p>
                        </>
                    ) : (
                        <div className="space-y-0.5">
                            {payload.map((entry, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <div
                                        className="w-2 h-2 rounded-full"
                                        style={{ backgroundColor: entry.color }}
                                    />
                                    <span className="text-xs text-slate-400">{entry.name}:</span>
                                    <span className="text-xs font-semibold" style={{ color: entry.color }}>
                                        {Math.round(entry.value)}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </motion.div>
            );
        }
        return null;
    };

    if (loading) {
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
            className="bg-[#1e2330] rounded-2xl p-6 border border-slate-700/50 shadow-xl h-full"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-teal-500/10 rounded-lg">
                        <TrendingUp className="w-5 h-5 text-teal-500" />
                    </div>
                    <div>
                        <h3 className="text-slate-100 text-lg font-bold">Recovery Score Trend</h3>
                        <p className="text-slate-500 text-xs mt-1">
                            {viewMode === 'cohort' ? 'Cohort average over time' : 'Individual patient trends'}
                        </p>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-3">
                    {/* View Mode Toggle */}
                    <div className="flex gap-1.5 bg-slate-800/50 p-1 rounded-xl">
                        <motion.button
                            onClick={() => setViewMode('cohort')}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 ${viewMode === 'cohort'
                                ? 'bg-teal-600 text-white shadow-sm'
                                : 'text-slate-400 hover:text-slate-200'
                                }`}
                        >
                            Cohort
                        </motion.button>
                        <motion.button
                            onClick={() => setViewMode('patient_wise')}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 ${viewMode === 'patient_wise'
                                ? 'bg-teal-600 text-white shadow-sm'
                                : 'text-slate-400 hover:text-slate-200'
                                }`}
                        >
                            Patients
                        </motion.button>
                    </div>

                    {/* Period Selector */}
                    <div className="flex gap-1.5 bg-slate-800/50 p-1 rounded-xl">
                        {[7, 14, 30].map(d => (
                            <motion.button
                                key={d}
                                onClick={() => setDays(d)}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 ${days === d
                                    ? 'bg-slate-700 text-white shadow-sm'
                                    : 'text-slate-400 hover:text-slate-200'
                                    }`}
                            >
                                {d}d
                            </motion.button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="h-80">
                {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={320}>
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                {/* Cohort gradient */}
                                <linearGradient id="colorCohort" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.05} />
                                </linearGradient>

                                {/* Patient-wise gradients */}
                                {PATIENT_COLORS.map((color) => (
                                    <linearGradient key={color.id} id={color.id} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={color.stroke} stopOpacity={0.25} />
                                        <stop offset="95%" stopColor={color.stroke} stopOpacity={0.02} />
                                    </linearGradient>
                                ))}
                            </defs>

                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.1} vertical={false} />
                            <XAxis
                                dataKey="displayDate"
                                stroke="#64748b"
                                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                                tickLine={false}
                                axisLine={false}
                                dy={10}
                            />
                            <YAxis
                                stroke="#64748b"
                                tick={{ fill: '#64748b', fontSize: 11 }}
                                tickLine={false}
                                axisLine={false}
                                domain={[0, 100]}
                                dx={-10}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#14b8a6', strokeWidth: 1 }} />

                            {viewMode === 'cohort' ? (
                                <>
                                    <Area
                                        type="monotone"
                                        dataKey="avg_score"
                                        stroke="#14b8a6"
                                        strokeWidth={3}
                                        fill="url(#colorCohort)"
                                        dot={{ fill: '#14b8a6', strokeWidth: 2, r: 4, stroke: '#fff' }}
                                        activeDot={{ r: 6, strokeWidth: 2 }}
                                        animationDuration={1000}
                                    />
                                    <Legend
                                        verticalAlign="top"
                                        height={36}
                                        iconType="circle"
                                        formatter={() => <span className="text-slate-400 text-xs font-medium ml-1">Cohort Average</span>}
                                    />
                                </>
                            ) : (
                                <>
                                    <Legend
                                        wrapperStyle={{ paddingTop: '20px' }}
                                        iconType="line"
                                        formatter={(value) => (
                                            <span className="text-xs text-slate-400">{value}</span>
                                        )}
                                    />
                                    {patientLines.map((patient) => (
                                        <Area
                                            key={patient.key}
                                            type="monotone"
                                            dataKey={patient.key}
                                            name={patient.name}
                                            stroke={patient.color}
                                            strokeWidth={2.5}
                                            fill={`url(#${patient.gradientId})`}
                                            dot={{ fill: patient.color, strokeWidth: 2, r: 3, stroke: '#fff' }}
                                            activeDot={{ r: 5, strokeWidth: 2 }}
                                            connectNulls
                                            animationDuration={1000}
                                        />
                                    ))}
                                </>
                            )}
                        </AreaChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                        No recovery data available for this period
                    </div>
                )}
            </div>
        </motion.div >
    );
}
