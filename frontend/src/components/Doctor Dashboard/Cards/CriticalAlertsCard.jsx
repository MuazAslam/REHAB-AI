import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { FaExclamationTriangle, FaChartLine, FaHeartbeat, FaClock } from 'react-icons/fa';

export default function CriticalAlertsCard({ doctorId }) {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAlerts = async () => {
            if (!doctorId) return;

            try {
                const res = await axios.get(
                    `http://127.0.0.1:8000/api/doctor-alerts/${doctorId}`
                );

                if (res.data.status === 'success') {
                    setAlerts(res.data.alerts || []);
                }
            } catch (error) {
                console.error('Failed to fetch alerts:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAlerts();
    }, [doctorId]);

    const getAlertIcon = (type) => {
        switch (type) {
            case 'sudden_drop':
                return <FaChartLine className="w-4 h-4" />;
            case 'active_pain':
                return <FaHeartbeat className="w-4 h-4" />;
            case 'overdue_exercises':
                return <FaClock className="w-4 h-4" />;
            default:
                return <FaExclamationTriangle className="w-4 h-4" />;
        }
    };

    const getSeverityStyles = (severity) => {
        switch (severity) {
            case 'high':
                return {
                    bg: 'bg-red-500/10',
                    border: 'border-red-500/30',
                    text: 'text-red-400',
                    badge: 'bg-red-500'
                };
            case 'medium':
                return {
                    bg: 'bg-yellow-500/10',
                    border: 'border-yellow-500/30',
                    text: 'text-yellow-400',
                    badge: 'bg-yellow-500'
                };
            default:
                return {
                    bg: 'bg-slate-700/10',
                    border: 'border-slate-600/30',
                    text: 'text-slate-400',
                    badge: 'bg-slate-500'
                };
        }
    };

    if (loading) {
        return (
            <div className="bg-[#1e2330] rounded-xl p-4 border border-slate-700/50">
                <div className="animate-pulse flex items-center justify-center h-20">
                    <div className="w-8 h-8 border-2 border-teal-500/20 border-t-teal-500 rounded-full animate-spin" />
                </div>
            </div>
        );
    }

    if (alerts.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#1e2330] rounded-xl p-4 border border-slate-700/50"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/10 rounded-lg">
                        <FaExclamationTriangle className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-slate-200">No Critical Alerts</h3>
                        <p className="text-xs text-slate-400 mt-0.5">All patients are doing well</p>
                    </div>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#1e2330] rounded-2xl p-6 border border-slate-700/50 shadow-xl h-full flex flex-col"
        >
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-500/10 rounded-lg">
                        <FaExclamationTriangle className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                        <h3 className="text-slate-100 text-lg font-bold">Critical Alerts</h3>
                        <p className="text-slate-500 text-xs">Immediate attention required</p>
                    </div>
                </div>
                <span className="px-2 py-1 bg-red-500/10 text-red-400 rounded-full text-xs font-medium">
                    Top 5 Alerts
                </span>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800/50 hover:scrollbar-thumb-teal-500">
                <AnimatePresence>
                    {alerts.slice(0,).map((alert, index) => {
                        const styles = getSeverityStyles(alert.severity);
                        return (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                transition={{ delay: index * 0.05 }}
                                className={`p-4 rounded-xl border ${styles.bg} ${styles.border} hover:bg-opacity-80 transition-all cursor-pointer group`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`p-1.5 rounded ${styles.text}`}>
                                        {getAlertIcon(alert.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-slate-200 font-medium truncate">
                                            {alert.message}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`px-2 py-0.5 ${styles.badge} text-white rounded-full text-[10px] font-medium`}>
                                                {alert.severity.toUpperCase()}
                                            </span>
                                            <span className="text-[10px] text-slate-400">
                                                Priority {alert.priority}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}
