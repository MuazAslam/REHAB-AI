import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export default function StatCard({ icon: Icon, label, value, change, changeType }) {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        const numericValue = typeof value === 'string'
            ? parseFloat(value.replace(/[^0-9.-]+/g, '')) || 0
            : value;

        if (typeof numericValue === 'number' && !isNaN(numericValue)) {
            let start = 0;
            const end = numericValue;
            const duration = 1000;
            const increment = end / (duration / 16);

            const timer = setInterval(() => {
                start += increment;
                if (start >= end) {
                    setDisplayValue(end);
                    clearInterval(timer);
                } else {
                    setDisplayValue(start);
                }
            }, 16);

            return () => clearInterval(timer);
        }
    }, [value]);

    const getFormattedValue = () => {
        if (typeof value === 'string') {

            if (value.includes('h') && value.includes('m')) {
                return value;
            }

            const match = value.match(/([0-9.-]+)(.*)/);
            if (match) {
                return `${Math.round(displayValue)}${match[2]}`;
            }
            return value;
        }
        return Math.round(displayValue);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            whileHover={{ y: -4, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)" }}
            className="bg-[#1e2330] rounded-xl shadow-xl border border-slate-700/50 p-3 transition-all duration-200"
        >
            <div className="flex items-start justify-between mb-2">
                <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    className="p-1.5 bg-slate-700/50 rounded-md"
                >
                    <Icon className="w-4 h-4 text-teal-400" />
                </motion.div>
            </div>
            <div className="space-y-0.5">
                <p className="text-[11px] text-slate-400 font-medium">{label}</p>
                <motion.p
                    key={value}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                    className="text-xl font-bold text-slate-200"
                >
                    {getFormattedValue()}
                </motion.p>
                {change && (
                    <motion.p
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`text-[10px] font-medium ${changeType === 'positive' ? 'text-green-500' : 'text-red-500'
                            }`}
                    >
                        {changeType === 'positive' ? '+' : ''}{change}
                    </motion.p>
                )}
            </div>
        </motion.div>
    );
}
