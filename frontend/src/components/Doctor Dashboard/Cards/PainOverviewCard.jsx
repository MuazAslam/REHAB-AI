import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { FaHeartbeat } from 'react-icons/fa';

export default function PainOverviewCard({ doctorId }) {
    const [painData, setPainData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPainData = async () => {
            if (!doctorId) return;

            try {
                const res = await axios.get(
                    `http://127.0.0.1:8000/api/doctor-pain-overview/${doctorId}`
                );

                if (res.data.status === 'success') {
                    setPainData(res.data);
                }
            } catch (error) {
                console.error('Failed to fetch pain data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchPainData();
    }, [doctorId]);

    if (loading || !painData) {
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

    const getStatusColor = (status) => {
        switch (status) {
            case 'active':
                return 'text-red-400 bg-red-500/10';
            case 'recovering':
                return 'text-yellow-400 bg-yellow-500/10';
            case 'recovered':
                return 'text-green-400 bg-green-500/10';
            default:
                return 'text-slate-400 bg-slate-700/10';
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#1e2330] rounded-2xl p-6 border border-slate-700/50 shadow-xl"
        >
            <div className="mb-6">
                <h3 className="text-slate-100 text-lg font-bold">Pain Management</h3>
                <p className="text-slate-500 text-xs mt-1">Across all patients</p>
            </div>

            {/* Status Counts */}
            <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-red-500/10 rounded-lg p-3 border border-red-500/20">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        <span className="text-xs text-red-400">Active</span>
                    </div>
                    <p className="text-2xl font-bold text-red-400">{painData.active}</p>
                </div>
                <div className="bg-yellow-500/10 rounded-lg p-3 border border-yellow-500/20">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                        <span className="text-xs text-yellow-400">Recovering</span>
                    </div>
                    <p className="text-2xl font-bold text-yellow-400">{painData.recovering}</p>
                </div>
                <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/20">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="text-xs text-green-400">Recovered</span>
                    </div>
                    <p className="text-2xl font-bold text-green-400">{painData.recovered}</p>
                </div>
            </div>

            {/* Common Locations */}
            <div>
                <h4 className="text-xs font-semibold text-slate-400 mb-2">Most Common Pain Locations</h4>
                {painData.common_locations && painData.common_locations.length > 0 ? (
                    <div className="space-y-2">
                        {painData.common_locations.map((location, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="flex items-center justify-between bg-slate-800/30 hover:bg-slate-800/50 border border-slate-700/30 rounded-xl p-3 px-4 transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400 group-hover:bg-teal-500/20 group-hover:text-teal-300 transition-colors">
                                        <FaHeartbeat className="w-3.5 h-3.5" />
                                    </div>
                                    <span className="text-sm font-medium text-slate-300 group-hover:text-slate-100 transition-colors capitalize">{location.body_part}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs text-slate-500 group-hover:text-slate-400">
                                        Avg: <span className="text-slate-300 font-semibold">{location.avg_intensity}</span>/10
                                    </span>
                                    <span className="px-2.5 py-1 bg-teal-500/10 text-teal-400 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                                        {location.count} reports
                                    </span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <p className="text-xs text-slate-500 italic">No pain reports available</p>
                )}
            </div>
        </motion.div>
    );
}
