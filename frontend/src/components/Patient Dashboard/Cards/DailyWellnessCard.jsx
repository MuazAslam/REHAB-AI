import { motion } from 'framer-motion';

export default function WellnessCheckCard({ mood, sleep, fatigue }) {
    const getMoodEmoji = (score) => {
        if (score >= 80) return "😁";
        if (score >= 60) return "🙂";
        if (score >= 40) return "😕";
        return "😢";
    };

    const getFatigueEmoji = (score) => {
        if (score >= 80) return "💪";
        if (score >= 50) return "😐";
        return "😫";
    };

    const getSleepEmoji = (hours) => {
        if (hours >= 8) return "😊";
        if (hours >= 6) return "🙂";
        return "😴";
    };

    const wellnessItems = [
        { label: `Sleep Quality (${sleep}h)`, value: sleep, max: 12, emoji: getSleepEmoji(sleep), gradient: 'from-blue-400 to-blue-600' },
        { label: `Fatigue Level`, value: fatigue, max: 100, emoji: getFatigueEmoji(fatigue), gradient: 'from-orange-400 to-orange-600' },
        { label: `Mood Level`, value: mood, max: 100, emoji: getMoodEmoji(mood), gradient: 'from-purple-400 to-purple-600' }
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-[#1e2330] rounded-xl shadow-xl p-6 border border-slate-700/50"
        >
            <div className="mb-6">
                <h3 className="font-semibold text-lg text-slate-200 tracking-tight">Daily Wellness</h3>
                <p className="text-sm text-slate-400 mt-0.5">Today's health metrics</p>
            </div>

            <div className="space-y-5">
                {wellnessItems.map((item, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: index * 0.1 }}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-slate-300 font-medium">{item.label}</span>
                            <span className="text-2xl">{item.emoji}</span>
                        </div>

                        <div className="relative h-2 bg-slate-800/50 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${(item.value / item.max) * 100}%` }}
                                transition={{ duration: 1, delay: index * 0.1, ease: "easeOut" }}
                                className={`h-full bg-gradient-to-r ${item.gradient} rounded-full shadow-sm`}
                            />
                        </div>

                        <div className="flex justify-end mt-1">
                            <span className="text-xs text-slate-400 font-medium">
                                {Math.round((item.value / item.max) * 100)}%
                            </span>
                        </div>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
}
