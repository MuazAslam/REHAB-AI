import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Activity, Brain, CheckCircle, TrendingUp } from 'lucide-react';

const MetricCard = ({ label, value, icon: Icon, color, delay, changeType }) => (
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
                <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{label}</h3>
                <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-slate-100">{value}</span>
                </div>
            </div>
            <div className={`p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-400 group-hover:text-white transition-colors`}>
                <Icon size={20} />
            </div>
        </div>

        {/* Simple change indicator if needed */}
        {changeType === 'positive' && (
            <div className="flex items-center gap-1 text-emerald-400 text-xs font-medium">
                <TrendingUp size={12} />
                <span>Trending up</span>
            </div>
        )}
    </motion.div>
);

export default function DoctorOverviewStats({ doctorId }) {
    const [stats, setStats] = useState({
        avg_ai_confidence: 0,
        avg_correct_percentage: 0,
        avg_recovery_score: 0,
        pain_improvement_rate: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            if (!doctorId) return;

            try {
                const res = await axios.get(
                    `http://127.0.0.1:8000/api/doctor-overview/${doctorId}`
                );

                if (res.data.status === 'success') {
                    setStats({
                        avg_ai_confidence: res.data.avg_ai_confidence || 0,
                        avg_correct_percentage: res.data.avg_correct_percentage || 0,
                        avg_recovery_score: res.data.avg_recovery_score || 0,
                        pain_improvement_rate: res.data.pain_improvement_rate || 0
                    });
                }
            } catch (error) {
                console.error('Failed to fetch overview stats:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [doctorId]);

    if (loading) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="bg-[#1e2330] rounded-xl p-3 border border-slate-700/50 h-24 animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <MetricCard
                icon={Brain}
                label="Global AI Confidence"
                value={`${stats.avg_ai_confidence}%`}
                color="bg-indigo-500"
                delay={1}
                changeType="positive"
            />
            <MetricCard
                icon={CheckCircle}
                label="Global Pose Accuracy"
                value={`${stats.avg_correct_percentage}%`}
                color="bg-emerald-500"
                delay={2}
                changeType="positive"
            />
            <MetricCard
                icon={TrendingUp}
                label="Avg Recovery Score"
                value={`${stats.avg_recovery_score}%`}
                color="bg-purple-500"
                delay={3}
                changeType="positive"
            />
            <MetricCard
                icon={Activity}
                label="Pain Improvement"
                value={`${stats.pain_improvement_rate}%`}
                color="bg-amber-500"
                delay={4}
                changeType="positive"
            />
        </div>
    );
}
