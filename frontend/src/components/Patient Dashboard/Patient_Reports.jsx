import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import { motion } from "framer-motion";
import PainHeatmap from "./Cards/PainHeatmap";
import {
    Activity,
    Zap,
    Target,
    Clock,
    Flame,
    TrendingUp,
    FileText
} from "lucide-react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    AreaChart,
    Area,
    PieChart,
    Pie,
    Cell,
    ComposedChart,
    Line
} from "recharts";

const Patient_Reports = () => {
    const { user } = useAuth();
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReportData = async () => {
            if (user?.user_id) {
                try {
                    // Fetch Aggregated Report Data directly
                    const res = await axios.get(`http://127.0.0.1:8000/api/patient/reports/${user.user_id}`);
                    if (res.data.status === "success" && res.data.data) {
                        setReportData(res.data.data);
                    } else {
                        setReportData(null);
                    }
                } catch (err) {
                    console.error("Failed to fetch report data", err);
                    setReportData(null);
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchReportData();
    }, [user]);

    // Format duration helper
    const formatDuration = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = Math.round(seconds % 60);
        return `${m}m ${s}s`;
    };

    // MetricCard Component (Matched with Patient_Performance.jsx)
    // MetricCard Component (Matched with Patient_Performance.jsx)
    const MetricCard = ({ title, value, unit, icon: Icon, color, delay }) => (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: delay * 0.1 }}
            className="bg-[#1e2330] p-6 rounded-2xl shadow-xl border border-slate-700/50 hover:border-slate-600 transition-colors group relative overflow-hidden"
        >
            {/* Background Glow */}
            <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full ${color} opacity-10 blur-xl group-hover:opacity-20 transition-opacity`} />

            <div className="flex items-start justify-between mb-4">
                <div>
                    <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{title}</h3>
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-slate-100">{value}</span>
                        {unit && <span className="text-xs text-slate-500 font-medium">{unit}</span>}
                    </div>
                </div>
                <div className={`p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-400 group-hover:text-white transition-colors`}>
                    <Icon size={20} />
                </div>
            </div>
        </motion.div>
    );

    // Date Formatter: 13.Dec/25
    const formatXAxisDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        // helper for month name
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const day = date.getDate();
        const month = months[date.getMonth()];
        const year = date.getFullYear().toString().slice(-2);
        return `${day}/${month}/${year}`;
    };

    // Slice data to last 30 entries
    const recentPerformance = reportData?.performance_history ? reportData.performance_history.slice(-30) : [];
    const recentConfidence = reportData?.confidence_history ? reportData.confidence_history.slice(-30) : [];

    return (
        <div className="min-h-screen bg-white p-6">
            <div className="max-w-[1600px] mx-auto">
                {/* Header */}
                {/* Header */}
                <div className="flex items-end justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                            <FileText size={28} className="text-indigo-600" />
                            Overall Reports
                        </h1>
                        <p className="text-slate-500 text-sm font-medium mt-1 ml-9">
                            Comprehensive Clinical Analysis & History
                        </p>
                    </div>
                </div>

                {loading ? (
                    <div className="min-h-[60vh] flex items-center justify-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div>
                    </div>
                ) : !reportData ? (
                    <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                            <FileText size={32} className="text-slate-300" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-1">No Reports Available</h3>
                        <p className="text-slate-500 text-sm max-w-md mx-auto">
                            Complete your first exercise session to generate detailed analytics.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                            <MetricCard
                                title="Overall Average Accuracy"
                                value={reportData?.avgAccuracy}
                                unit="%"
                                icon={Target}
                                color="bg-emerald-500"
                                delay={1}
                            />
                            <MetricCard
                                title="Overall AI Confidence"
                                value={reportData?.meanConfidence}
                                unit="%"
                                icon={Activity}
                                color="bg-blue-500"
                                delay={2}
                            />
                            <MetricCard
                                title="Total Pain Incidents"
                                value={reportData?.painIncidents}
                                unit="Times"
                                icon={Flame}
                                color="bg-rose-500"
                                delay={3}
                            />
                            <MetricCard
                                title="Overall Longest Streak"
                                value={reportData?.longestStreak}
                                unit="Reps"
                                icon={TrendingUp}
                                color="bg-amber-500"
                                delay={4}
                            />
                            <MetricCard
                                title="Average Session Duration"
                                value={formatDuration(reportData?.avgDuration || 0)}
                                unit=""
                                icon={Clock}
                                color="bg-purple-500"
                                delay={5}
                            />

                        </div>

                        {/* Charts Section */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                            {/* Performance History Chart (Stacked Bar) */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.6 }}
                                className="bg-[#1e2330] p-6 rounded-2xl border border-slate-700/50 shadow-xl"
                            >
                                <h3 className="text-slate-100 font-bold mb-6 flex items-center gap-2">
                                    <Activity size={20} className="text-indigo-400" />
                                    Session Performance History
                                </h3>
                                <div style={{ width: '100%', height: 320 }}>
                                    <ResponsiveContainer width="100%" height={320}>
                                        <BarChart
                                            data={recentPerformance}
                                            margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
                                        >
                                            <defs>
                                                <linearGradient id="correctBarGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#2dd4bf" />
                                                    <stop offset="100%" stopColor="#0f766e" />
                                                </linearGradient>
                                                <linearGradient id="errorBarGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#f472b6" />
                                                    <stop offset="100%" stopColor="#db2777" />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
                                            <XAxis
                                                dataKey="date"
                                                stroke="#475569"
                                                tick={{ fontSize: 12, fill: '#e2e8f0', fontWeight: 500 }}
                                                dy={12}
                                                tickLine={false}
                                                tickFormatter={formatXAxisDate}
                                                interval="preserveStartEnd"
                                                minTickGap={15}
                                            />
                                            <YAxis
                                                width={40}
                                                stroke="#475569"
                                                tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 500 }}
                                                tickLine={false}
                                                axisLine={false}
                                            />
                                            <Tooltip
                                                cursor={{ fill: '#334155', opacity: 0.2 }}
                                                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '12px', padding: '12px' }}
                                                itemStyle={{ fontSize: 13, fontWeight: 500 }}
                                                labelFormatter={formatXAxisDate}
                                            />
                                            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '24px', fontWeight: 600, color: '#f8fafc' }} iconType="circle" />
                                            <Bar dataKey="correct" name="Correct Reps" stackId="a" fill="url(#correctBarGradient)" radius={[0, 0, 4, 4]} barSize={24} />
                                            <Bar dataKey="incorrect" name="Errors" stackId="a" fill="url(#errorBarGradient)" radius={[4, 4, 0, 0]} barSize={24} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </motion.div>

                            {/* Confidence Trend Chart (Area) */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.7 }}
                                className="bg-[#1e2330] p-6 rounded-2xl border border-slate-700/50 shadow-xl"
                            >
                                <h3 className="text-slate-100 font-bold mb-6 flex items-center gap-2">
                                    <TrendingUp size={20} className="text-blue-400" />
                                    Overall AI Confidence Trend
                                </h3>
                                <div style={{ width: '100%', height: 320 }}>
                                    <ResponsiveContainer width="100%" height={320}>
                                        <AreaChart
                                            data={recentConfidence}
                                            margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
                                        >
                                            <defs>
                                                <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.4} />
                                                    <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
                                            <XAxis
                                                dataKey="date"
                                                stroke="#94a3b8"
                                                tick={{ fontSize: 11, fill: '#cbd5e1' }}
                                                dy={10}
                                                tickLine={false}
                                                tickFormatter={formatXAxisDate}
                                                interval="preserveStartEnd"
                                                minTickGap={15}
                                            />
                                            <YAxis
                                                domain={[0, 100]}
                                                stroke="#475569"
                                                tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 500 }}
                                                tickLine={false}
                                                axisLine={false}
                                            />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '12px', padding: '12px' }}
                                                labelStyle={{ color: '#94a3b8', marginBottom: 5 }}
                                                formatter={(value) => [`${Number(value).toFixed(1)}%`, "Confidence"]}
                                                labelFormatter={formatXAxisDate}
                                                itemStyle={{ fontSize: 13, fontWeight: 500, color: '#2dd4bf' }}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="confidence"
                                                name="Confidence %"
                                                stroke="#2dd4bf"
                                                strokeWidth={3}
                                                fillOpacity={1}
                                                fill="url(#confidenceGradient)"
                                                activeDot={{ r: 6, strokeWidth: 0, fill: '#ccfbf1' }}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </motion.div>
                        </div>

                        {/* Grid Container for Pain & Form Charts */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">

                            {/* LEFT COLUMN: Pain Distribution Hierarchy (Sunburst Chart) */}
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.8 }}
                                className="bg-[#1e2330] p-6 rounded-2xl border border-slate-700/50 shadow-xl flex flex-col"
                            >
                                <div className="mb-4">
                                    <h3 className="text-slate-100 font-bold flex items-center gap-2">
                                        <Flame size={18} className="text-rose-500" />
                                        Pain Hierarchy
                                    </h3>
                                    <p className="text-slate-500 text-[11px] uppercase tracking-wider font-medium mt-1">Exercise Source &rarr; Body Location</p>
                                </div>

                                <div style={{ width: '100%', height: 300 }} className="flex justify-center items-center relative">
                                    {reportData?.pain_sunburst_data && reportData.pain_sunburst_data.length > 0 ? (
                                        <>
                                            <ResponsiveContainer width="100%" height={300}>
                                                <PieChart>
                                                    <Tooltip
                                                        contentStyle={{
                                                            backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                                            borderColor: '#334155',
                                                            backdropFilter: 'blur(8px)',
                                                            color: '#f8fafc',
                                                            borderRadius: '12px',
                                                            padding: '12px',
                                                            fontSize: '12px'
                                                        }}
                                                        itemStyle={{ fontWeight: 500 }}
                                                        formatter={(value, name, props) => {
                                                            const label = props.payload.parent ? `${props.payload.parent} > ${name}` : name;
                                                            return [<span className="font-bold">{value}</span>, <span className="text-slate-400">{label}</span>];
                                                        }}
                                                    />
                                                    {/* Inner Pie: Exercises */}
                                                    <Pie
                                                        data={reportData.pain_sunburst_data}
                                                        dataKey="value"
                                                        cx="50%"
                                                        cy="50%"
                                                        outerRadius={75}
                                                        innerRadius={55}
                                                        fill="#8884d8"
                                                        paddingAngle={3}
                                                        stroke="none"
                                                    >
                                                        {
                                                            reportData.pain_sunburst_data.map((entry, index) => {
                                                                const COLORS = ['#2dd4bf', '#3b82f6', '#8b5cf6', '#f43f5e', '#f59e0b', '#ec4899'];
                                                                return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />;
                                                            })
                                                        }
                                                    </Pie>

                                                    {/* Outer Pie: Locations */}
                                                    <Pie
                                                        data={(() => {
                                                            let outerData = [];
                                                            const COLORS = ['#2dd4bf', '#3b82f6', '#8b5cf6', '#f43f5e', '#f59e0b', '#ec4899'];
                                                            reportData.pain_sunburst_data.forEach((parent, index) => {
                                                                const parentColor = COLORS[index % COLORS.length];
                                                                parent.children.forEach((child, cIndex) => {
                                                                    outerData.push({
                                                                        name: child.name,
                                                                        value: child.value,
                                                                        parent: parent.name,
                                                                        color: parentColor,
                                                                        opacity: 0.8 - (cIndex * 0.15)
                                                                    });
                                                                });
                                                            });
                                                            return outerData;
                                                        })()}
                                                        dataKey="value"
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={85}
                                                        outerRadius={105}
                                                        paddingAngle={1}
                                                        label={({ name, percent }) => percent > 0.08 ? name : ''}
                                                        labelLine={false}
                                                        stroke="none"
                                                        style={{ fontSize: '11px', fontWeight: '700', fill: '#f1f5f9', textShadow: '0px 1px 3px rgba(0,0,0,0.5)' }}
                                                    >
                                                        {
                                                            (() => {
                                                                let cells = [];
                                                                const COLORS = ['#2dd4bf', '#3b82f6', '#8b5cf6', '#f43f5e', '#f59e0b', '#ec4899'];
                                                                reportData.pain_sunburst_data.forEach((parent, index) => {
                                                                    const parentColor = COLORS[index % COLORS.length];
                                                                    parent.children.forEach((child, cIndex) => {
                                                                        cells.push(<Cell key={`cell-out-${index}-${cIndex}`} fill={parentColor} fillOpacity={0.8 - (cIndex * 0.15)} />);
                                                                    });
                                                                });
                                                                return cells;
                                                            })()
                                                        }
                                                    </Pie>
                                                </PieChart>
                                            </ResponsiveContainer>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                                <span className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">Total</span>
                                                <span className="text-slate-100 font-black text-3xl tracking-tight">
                                                    {reportData.pain_sunburst_data.reduce((a, b) => a + b.value, 0).toFixed(0)}
                                                </span>
                                                <span className="text-rose-500 text-[10px] font-bold mt-1 bg-rose-500/10 px-2 py-0.5 rounded-full">Pain Score</span>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-center flex flex-col items-center opacity-50">
                                            <div className="p-3 bg-slate-800 rounded-full mb-3">
                                                <Flame size={24} className="text-slate-600" />
                                            </div>
                                            <p className="text-sm font-semibold text-slate-400">No pain statistics available</p>
                                            <p className="text-xs text-slate-500 max-w-[180px] mt-1">Complete exercises with pain feedback to see hierarchy data</p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>

                            {/* RIGHT COLUMN: Form Accuracy Trend (Single Axis Line Chart) */}
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.9 }}
                                className="bg-[#1e2330] p-6 rounded-2xl border border-slate-700/50 shadow-xl flex flex-col"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h3 className="text-slate-100 font-bold flex items-center gap-2">
                                            <Target size={18} className="text-emerald-500" />
                                            Form Accuracy Trend
                                        </h3>
                                        <p className="text-slate-500 text-[11px] uppercase tracking-wider font-medium mt-1">Average Accuracy % Over Time</p>
                                    </div>
                                    {/* Mini Legend */}
                                    <div className="flex gap-3">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                            <span className="text-[10px] text-slate-400 font-semibold">Accuracy</span>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ width: '100%', height: 300 }}>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <AreaChart data={recentPerformance} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                                            <defs>
                                                <linearGradient id="colorAccuracy" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} vertical={false} />
                                            <XAxis
                                                dataKey="date"
                                                stroke="#475569"
                                                tick={{ fontSize: 12, fill: '#e2e8f0', fontWeight: 500 }}
                                                dy={12}
                                                tickLine={false}
                                                axisLine={false}
                                                minTickGap={15}
                                                tickFormatter={formatXAxisDate}
                                                interval="preserveStartEnd"
                                            />
                                            <YAxis
                                                width={40}
                                                stroke="#10b981"
                                                tick={{ fontSize: 11, fill: '#6ee7b7', fontWeight: 500 }}
                                                tickLine={false}
                                                axisLine={false}
                                                domain={[0, 100]}
                                            />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                                                    borderColor: '#334155',
                                                    color: '#f8fafc',
                                                    borderRadius: '12px',
                                                    padding: '12px',
                                                    fontSize: '12px',
                                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                                                }}
                                                cursor={{ stroke: '#475569', strokeWidth: 1, strokeDasharray: '4 4' }}
                                                labelFormatter={formatXAxisDate}
                                                formatter={(value) => [`${value}%`, 'Accuracy']}
                                            />

                                            <Area
                                                type="monotone"
                                                dataKey="accuracy"
                                                stroke="#10b981"
                                                strokeWidth={3}
                                                fillOpacity={1}
                                                fill="url(#colorAccuracy)"
                                                activeDot={{ r: 6, fill: '#1e2330', stroke: '#10b981', strokeWidth: 2 }}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </motion.div>
                        </div>

                        {/* Pain Heatmap Section */}
                        <div className="mt-8">
                            <div className="flex justify-center">
                                <div className="w-full">
                                    <PainHeatmap userId={user?.user_id} />
                                </div>
                            </div>
                        </div>

                    </>
                )}
            </div>
        </div>
    );
};

export default Patient_Reports;
