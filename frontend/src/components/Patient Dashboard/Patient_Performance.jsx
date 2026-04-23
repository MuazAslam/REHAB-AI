import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
    Activity,
    Calendar as CalendarIcon,
    Clock,
    CheckCircle,
    AlertCircle,
    BarChart2,
    Target,
    Zap,
    Filter
} from "lucide-react";
import Calendar from "react-calendar";
import 'react-calendar/dist/Calendar.css';
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
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Line,
    ComposedChart,
    RadialBarChart,
    RadialBar,
    Cell
} from 'recharts';

const Patient_Performance = () => {
    const { user } = useAuth();
    const [performanceData, setPerformanceData] = useState([]);
    const [selectedDate, setSelectedDate] = useState(null);
    const [filteredStats, setFilteredStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showCalendar, setShowCalendar] = useState(false);

    // Fetch Data
    useEffect(() => {
        const fetchData = async () => {
            if (user?.user_id) {
                try {
                    const res = await axios.get(`http://127.0.0.1:8000/api/patient/performance/${user.user_id}?exercise=Plank`);
                    if (res.data.status === "success") {
                        setPerformanceData(res.data.data);
                        // Default to latest session if available
                        if (res.data.data.length > 0) {
                            setFilteredStats(res.data.data[0]);
                            setSelectedDate(new Date(res.data.data[0].date));
                        }
                    }
                } catch (err) {
                    console.error("Failed to fetch performance data", err);
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchData();
    }, [user]);

    // Filter Logic
    const handleDateChange = (date) => {
        setSelectedDate(date);
        setShowCalendar(false);

        // Find session for this date
        // Format date to YYYY-MM-DD
        const dateStr = date.toLocaleDateString('en-CA'); // YYYY-MM-DD local
        const session = performanceData.find(d => d.date === dateStr);

        if (session) {
            console.log("Selected Session Data:", session);
            setFilteredStats(session);
        } else {
            console.log("No session found for date:", dateStr);
            setFilteredStats(null); // No data for this date
        }
    };

    // Helper to check if a date has data (for calendar tile highlighting)
    const tileContent = ({ date, view }) => {
        if (view === 'month') {
            const dateStr = date.toLocaleDateString('en-CA');
            const hasData = performanceData.some(d => d.date === dateStr);
            if (hasData) {
                return <div className="dot mt-1 mx-auto w-1.5 h-1.5 bg-teal-500 rounded-full"></div>;
            }
        }
        return null;
    };

    // Format duration helper
    const formatDuration = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = Math.round(seconds % 60);
        return `${m}m ${s}s`;
    };

    // Card Component
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

    return (
        <div className="min-h-screen bg-white p-6">
            <div className="max-w-[1600px] mx-auto">

                {/* Header */}
                <div className="flex items-end justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                            <Activity className="text-teal-600" size={28} />
                            Performance
                        </h1>
                        <p className="text-slate-500 text-sm font-medium mt-1 ml-11">
                            AI Analysis & Session Metrics
                        </p>
                    </div>

                    {/* Date Filter */}
                    <div className="relative z-50">
                        <button
                            onClick={() => setShowCalendar(!showCalendar)}
                            className="bg-[#1e2330] border border-slate-700/50 shadow-lg hover:border-teal-500/50 hover:shadow-teal-500/10 transition-all px-4 py-2.5 rounded-xl flex items-center gap-3 text-sm font-semibold text-slate-300"
                        >
                            <div className="p-1.5 bg-slate-800 rounded-lg text-teal-500">
                                <CalendarIcon size={16} />
                            </div>
                            {selectedDate ? selectedDate.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : "Select Date"}
                            <Filter size={14} className="ml-2 text-slate-500" />
                        </button>

                        <AnimatePresence>
                            {showCalendar && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute right-0 top-full mt-3 bg-[#1e2330] p-4 rounded-2xl shadow-2xl border border-slate-700 w-80 z-50 origin-top-right backdrop-blur-xl"
                                >
                                    <style>{`
                                        .react-calendar {
                                            border: none;
                                            font-family: inherit;
                                        }
                                        .react-calendar__navigation button {
                                            color: #e2e8f0;
                                            min-width: 44px;
                                            background: none;
                                            font-size: 16px;
                                            margin-top: 8px;
                                            font-weight: 600;
                                        }
                                        .react-calendar__navigation button:enabled:hover,
                                        .react-calendar__navigation button:enabled:focus {
                                            background-color: #334155;
                                            border-radius: 8px;
                                        }
                                        .react-calendar__navigation button:disabled {
                                            background-color: transparent;
                                            color: #475569;
                                        }
                                        .react-calendar__month-view__weekdays {
                                            text-align: center;
                                            text-transform: uppercase;
                                            font-weight: bold;
                                            font-size: 0.75em;
                                            color: #64748b;
                                            margin-bottom: 10px;
                                        }
                                        .react-calendar__month-view__weekdays__weekday {
                                            padding: 0.5em;
                                        }
                                        .react-calendar__month-view__weekdays__weekday abbr {
                                            text-decoration: none;
                                        }
                                        .react-calendar__tile {
                                            color: #cbd5e1;
                                            padding: 10px 6.6667px;
                                            background: none;
                                            text-align: center;
                                            line-height: 16px;
                                            font-weight: 500;
                                        }
                                        .react-calendar__tile:disabled {
                                            background-color: transparent;
                                            color: #334155;
                                        }
                                        .react-calendar__tile:enabled:hover,
                                        .react-calendar__tile:enabled:focus {
                                            background-color: #334155;
                                            border-radius: 8px;
                                        }
                                        .react-calendar__tile--now {
                                            background: #1e293b;
                                            border-radius: 8px;
                                            color: #60a5fa;
                                            font-weight: 600;
                                        }
                                        .react-calendar__tile--now:enabled:hover,
                                        .react-calendar__tile--now:enabled:focus {
                                            background: #334155;
                                        }
                                        .react-calendar__tile--active {
                                            background: #14b8a6 !important;
                                            border-radius: 8px;
                                            color: white !important;
                                            font-weight: 600;
                                        }
                                        .react-calendar__tile--active:enabled:hover,
                                        .react-calendar__tile--active:enabled:focus {
                                            background: #0d9488 !important;
                                        }
                                    `}</style>
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 px-2">Select Session Date</h4>
                                    <Calendar
                                        onChange={handleDateChange}
                                        value={selectedDate}
                                        tileContent={tileContent}
                                        tileDisabled={({ date }) => {
                                            const dateStr = date.toLocaleDateString('en-CA');
                                            return !performanceData.some(d => d.date === dateStr);
                                        }}
                                        className="border-none font-sans text-sm w-full !bg-transparent"
                                        tileClassName={({ date, view }) =>
                                            "rounded-lg hover:bg-teal-50 focus:bg-teal-100 transition-colors h-10 w-10 flex flex-col items-center justify-center p-0"
                                        }
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
                    </div>
                ) : filteredStats ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">

                        <MetricCard
                            title="Exercise Duration"
                            value={formatDuration(filteredStats.duration_seconds)}
                            unit=""
                            icon={Clock}
                            color="bg-blue-500"
                            delay={1}
                        />

                        <MetricCard
                            title="Non-Average Percentage"
                            value={filteredStats.not_form_percentage}
                            unit="%"
                            icon={Zap}
                            color="bg-purple-500"
                            delay={2}
                        />

                        <MetricCard
                            title="Total Predictions"
                            value={filteredStats.total_predictions}
                            unit="scans"
                            icon={Target}
                            color="bg-indigo-500"
                            delay={3}
                        />

                        <MetricCard
                            title="Avg Form Score"
                            value={filteredStats.form_percentage}
                            unit="%"
                            icon={CheckCircle}
                            color={filteredStats.form_percentage >= 80 ? 'bg-emerald-500' : filteredStats.form_percentage >= 50 ? 'bg-amber-500' : 'bg-rose-500'}
                            delay={4}
                        />

                        <MetricCard
                            title="AI Confidence"
                            value={Number(filteredStats.avg_confidence).toFixed(2)}
                            unit="%"
                            icon={BarChart2}
                            color="bg-teal-500"
                            delay={5}
                        />

                    </div>
                ) : (
                    // Empty State
                    <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-12 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg shadow-slate-100 mb-6 group">
                            <CalendarIcon size={32} className="text-slate-300 group-hover:text-teal-500 transition-colors" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">No Data Selected</h3>
                        <p className="text-slate-500 max-w-sm mx-auto mb-6">
                        </p>
                    </div>
                )}

                {/* Charts Section - Shows data for the SELECTED session (filteredStats) */}
                {!loading && filteredStats && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                        {/* Left: Feedback Timeline (Stacked Bar Chart) */}
                        <div className="bg-[#1e2330] p-6 rounded-2xl shadow-xl border border-slate-700/50 min-w-0">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-slate-100 text-lg font-bold">Session Feedback</h3>
                                    <p className="text-slate-500 text-xs">Correct vs Errors over time</p>
                                </div>
                                <div className="p-2 bg-slate-800 rounded-lg">
                                    <BarChart2 size={18} className="text-purple-500" />
                                </div>
                            </div>
                            <div className="h-80 w-full">
                                <ResponsiveContainer width="100%" height={320}>
                                    <BarChart
                                        data={filteredStats.feedback_timeline || []}
                                        margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
                                    >
                                        <defs>
                                            <linearGradient id="correctGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#2dd4bf" />
                                                <stop offset="100%" stopColor="#0f766e" />
                                            </linearGradient>
                                            {/* Blue Gradient (Sleep) */}
                                            <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#60a5fa" />
                                                <stop offset="100%" stopColor="#2563eb" />
                                            </linearGradient>
                                            {/* Purple Gradient (Mood) */}
                                            <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#a78bfa" />
                                                <stop offset="100%" stopColor="#7c3aed" />
                                            </linearGradient>
                                            {/* Pink Gradient (Fatigue) */}
                                            <linearGradient id="pinkGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#f472b6" />
                                                <stop offset="100%" stopColor="#db2777" />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
                                        <XAxis
                                            dataKey="time"
                                            stroke="#94a3b8"
                                            tick={{ fontSize: 11, fill: '#cbd5e1' }}
                                            dy={10}
                                            label={{ value: 'Session Time', position: 'insideBottom', offset: -15, fill: '#94a3b8', fontSize: 14, fontWeight: 600 }}
                                        />
                                        <YAxis
                                            stroke="#94a3b8"
                                            tick={{ fontSize: 11, fill: '#cbd5e1' }}
                                            label={{ value: 'Frames', angle: -90, position: 'insideLeft', offset: 0, fill: '#94a3b8', fontSize: 14, fontWeight: 600 }}
                                        />
                                        <Tooltip
                                            cursor={{ fill: '#334155', opacity: 0.2 }}
                                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '12px', padding: '12px' }}
                                            itemStyle={{ fontSize: 13, fontWeight: 500 }}
                                        />
                                        <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '20px', fontWeight: 600, color: '#e2e8f0' }} iconType="circle" />

                                        {/* Dynamic Error Bars (Gradients) */}
                                        {(() => {
                                            const data = filteredStats.feedback_timeline || [];
                                            const allKeys = new Set();
                                            data.forEach(item => {
                                                Object.keys(item).forEach(k => {
                                                    if (k !== 'time' && k !== 'Correct') allKeys.add(k);
                                                });
                                            });

                                            // Gradients array matching the requested design
                                            const gradients = ['url(#purpleGradient)', 'url(#blueGradient)', 'url(#pinkGradient)'];

                                            return Array.from(allKeys).map((key, index) => (
                                                <Bar
                                                    key={key}
                                                    dataKey={key}
                                                    stackId="a"
                                                    fill={gradients[index % gradients.length]}
                                                    barSize={24}
                                                    radius={[2, 2, 0, 0]}
                                                />
                                            ));
                                        })()}
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Right: AI Confidence Over Time (Area Chart) */}
                        <div className="bg-[#1e2330] p-6 rounded-2xl shadow-xl border border-slate-700/50 min-w-0">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-slate-100 text-lg font-bold">Confidence Timeline</h3>
                                    <p className="text-slate-500 text-xs">Real-time AI confidence during session</p>
                                </div>
                                <div className="p-2 bg-slate-800 rounded-lg">
                                    <Activity size={18} className="text-teal-500" />
                                </div>
                            </div>
                            <div className="h-80 w-full">
                                <ResponsiveContainer width="100%" height={320}>
                                    <AreaChart data={filteredStats.confidence_trend} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                                        <defs>
                                            <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.4} />
                                                <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
                                        <XAxis
                                            dataKey="time"
                                            stroke="#94a3b8"
                                            tick={{ fontSize: 11, fill: '#cbd5e1' }}
                                            dy={10}
                                            label={{ value: 'Duration (Seconds)', position: 'insideBottom', offset: -15, fill: '#94a3b8', fontSize: 14, fontWeight: 600 }}
                                        />
                                        <YAxis
                                            stroke="#94a3b8"
                                            tick={{ fontSize: 11, fill: '#cbd5e1' }}
                                            domain={[0, 'auto']}
                                            label={{ value: 'Confidence (%)', angle: -90, position: 'insideLeft', offset: 15, fill: '#94a3b8', fontSize: 14, fontWeight: 600 }}
                                        />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#8890a3ff', borderColor: '#334155', color: '#f8fafc', borderRadius: '12px', padding: '12px' }}
                                            labelStyle={{ color: '#94a3b8', marginBottom: 5 }}
                                            formatter={(value) => [`${Number(value).toFixed(1)}%`, "Confidence"]}
                                            labelFormatter={(label) => `Time: ${label}s`}
                                            itemStyle={{ fontSize: 13, fontWeight: 500, color: '#2dd4bf' }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="confidence"
                                            stroke="#2dd4bf"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#confidenceGradient)"
                                            activeDot={{ r: 6, strokeWidth: 0, fill: '#ccfbf1' }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}

                {/* NEW SECTION: Stability & Radar Charts & Risk Meter */}
                {!loading && filteredStats && (
                    <div className="flex flex-col gap-6 mt-6 pb-6">

                        {/* 1. Posture Stability (Full Width) */}
                        <div className="bg-[#1e2330] p-6 rounded-2xl shadow-xl border border-slate-700/50 min-w-0">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-slate-100 text-lg font-bold">Posture Stability Timeline</h3>
                                    <p className="text-slate-500 text-xs">Real-time Stability (Blue) vs Fatigue Trend (Amber)</p>
                                </div>
                                <div className="p-2 bg-slate-800 rounded-lg">
                                    <Activity size={18} className="text-blue-500" />
                                </div>
                            </div>
                            <div className="h-96 w-full">
                                <ResponsiveContainer width="100%" height={384}>
                                    <ComposedChart
                                        data={filteredStats.posture_quality_timeline || []}
                                        margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
                                        <XAxis
                                            dataKey="time"
                                            stroke="#94a3b8"
                                            tick={{ fontSize: 11, fill: '#cbd5e1' }}
                                            dy={10}
                                            label={{ value: 'Duration (Seconds)', position: 'insideBottom', offset: -15, fill: '#94a3b8', fontSize: 14, fontWeight: 600 }}
                                        />
                                        <YAxis
                                            stroke="#94a3b8"
                                            tick={{ fontSize: 11, fill: '#cbd5e1' }}
                                            domain={[0, 100]}
                                            label={{ value: 'Stability (%)', angle: -90, position: 'insideLeft', offset: 15, fill: '#94a3b8', fontSize: 14, fontWeight: 600 }}
                                        />
                                        <Tooltip
                                            cursor={{ fill: '#334155', opacity: 0.2 }}
                                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '12px', padding: '12px' }}
                                            labelFormatter={(label) => `Time: ${label}`}
                                        />
                                        <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '30px', fontWeight: 600, color: '#e2e8f0' }} iconType="circle" />

                                        <Line type="monotone" dataKey="raw_stability" name="Raw Stability" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                                        <Line type="monotone" dataKey="rolling_average" name="Rolling Avg (Fatigue)" stroke="#f59e0b" strokeWidth={3} strokeDasharray="5 5" dot={false} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Bottom Row: Radar & Risk Meter */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                            {/* 2. Consistency Radar (Half Width) */}
                            <div className="bg-[#1e2330] p-6 rounded-2xl shadow-xl border border-slate-700/50 min-w-0">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="text-slate-100 text-lg font-bold">Performance Matrix</h3>
                                        <p className="text-slate-500 text-xs">Multi-dimensional Analysis</p>
                                    </div>
                                    <div className="p-2 bg-slate-800 rounded-lg">
                                        <Target size={18} className="text-pink-500" />
                                    </div>
                                </div>
                                <div className="h-80 w-full flex justify-center items-center">
                                    <ResponsiveContainer width="100%" height={320}>
                                        <RadarChart outerRadius="75%" data={filteredStats.radar_metrics || []}>
                                            <PolarGrid stroke="#334155" />
                                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#cbd5e1', fontSize: 13, fontWeight: 600 }} />
                                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} />
                                            <Radar
                                                name="Performance"
                                                dataKey="A"
                                                stroke="#ec4899"
                                                strokeWidth={3}
                                                fill="#ec4899"
                                                fillOpacity={0.4}
                                            />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '12px', padding: '12px' }}
                                                formatter={(value) => [`${value}%`]}
                                            />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* 3. Risk Meter (Half Width - Enhanced) */}
                            <div className="bg-[#1e2330] p-6 rounded-2xl shadow-xl border border-slate-700/50 min-w-0 flex flex-col relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-32 bg-red-500/5 blur-[100px] rounded-full point-events-none"></div>

                                <div className="flex items-center justify-between mb-2 z-10">
                                    <div>
                                        <h3 className="text-slate-100 text-lg font-bold">Injury Risk Assessment</h3>
                                        <p className="text-slate-500 text-xs">Based on form, fatigue & pain</p>
                                    </div>
                                    <div className="p-2 bg-slate-800 rounded-lg">
                                        <AlertCircle size={18} className="text-red-500" />
                                    </div>
                                </div>

                                <div className="flex-1 flex flex-col justify-center items-center relative z-10 mt-4">
                                    <div className="h-64 w-full relative">
                                        <ResponsiveContainer width="100%" height={256}>
                                            <RadialBarChart
                                                cx="50%"
                                                cy="80%"
                                                innerRadius="70%"
                                                outerRadius="100%"
                                                barSize={20}
                                                data={[{
                                                    name: 'Risk',
                                                    value: filteredStats.risk_analysis?.score || 0,
                                                    fill: 'url(#riskGradient)'
                                                }]}
                                                startAngle={180}
                                                endAngle={0}
                                            >
                                                <defs>
                                                    <linearGradient id="riskGradient" x1="0" y1="0" x2="1" y2="0">
                                                        <stop offset="0%" stopColor="#22c55e" />
                                                        <stop offset="50%" stopColor="#f59e0b" />
                                                        <stop offset="100%" stopColor="#ef4444" />
                                                    </linearGradient>
                                                </defs>
                                                <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                                                <RadialBar background={{ fill: '#334155', opacity: 0.3 }} clockWise dataKey="value" cornerRadius={10} />
                                                <Tooltip cursor={false} contentStyle={{ display: 'none' }} />
                                            </RadialBarChart>
                                        </ResponsiveContainer>

                                        {/* Center Gauge Stats */}
                                        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 text-center">
                                            <div className="text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-amber-400 to-red-500 drop-shadow-sm">
                                                {filteredStats.risk_analysis?.score || 0}
                                            </div>
                                            <div className="text-slate-400 text-sm font-semibold mt-1">
                                                RISK SCORE
                                            </div>
                                            <div className={`text-xs font-bold mt-1 px-3 py-1 rounded-full inline-block ${(filteredStats.risk_analysis?.score || 0) < 30 ? 'bg-emerald-500/20 text-emerald-400' :
                                                (filteredStats.risk_analysis?.score || 0) < 60 ? 'bg-amber-500/20 text-amber-400' :
                                                    'bg-red-500/20 text-red-400'
                                                }`}>
                                                {(filteredStats.risk_analysis?.score || 0) < 30 ? 'LOW RISK' :
                                                    (filteredStats.risk_analysis?.score || 0) < 60 ? 'CAUTION' :
                                                        'HIGH ALERT'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Breakdown Stats */}
                                    <div className="w-full grid grid-cols-3 gap-3 mt-4">
                                        {(filteredStats.risk_analysis?.factors || []).map((factor, idx) => (
                                            <div key={idx} className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/30 backdrop-blur-sm flex flex-col items-center">
                                                <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">{factor.name}</div>
                                                <div className="text-lg font-bold" style={{ color: factor.fill }}>{factor.value}%</div>
                                                <div className="w-full bg-slate-700/50 h-1 rounded-full mt-2 overflow-hidden">
                                                    <div className="h-full rounded-full" style={{ width: `${factor.value}%`, backgroundColor: factor.fill }}></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Patient_Performance;
