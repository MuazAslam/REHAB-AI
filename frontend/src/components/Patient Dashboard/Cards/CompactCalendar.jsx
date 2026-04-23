import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function CompactCalendar() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const daysOfWeek = ["M", "T", "W", "T", "F", "S", "S"];
    const today = new Date();

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const dates = [];
    for (let i = 0; i < adjustedFirstDay; i++) dates.push(null);
    for (let i = 1; i <= daysInMonth; i++) dates.push(i);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-[#1e2330] rounded-xl shadow-xl p-6 border border-slate-700/50 h-full flex flex-col"
        >
            <div className="flex items-center justify-between mb-6">
                <motion.h3
                    key={`${month}-${year}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-lg font-semibold text-slate-200 tracking-tight"
                >
                    {currentDate.toLocaleString("default", { month: "long" })} {year}
                </motion.h3>
                <div className="flex gap-1">
                    <motion.button
                        onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
                        whileHover={{ scale: 1.1, backgroundColor: "rgba(71,85,105,0.3)" }}
                        whileTap={{ scale: 0.95 }}
                        className="p-1.5 rounded-lg transition-colors"
                    >
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </motion.button>
                    <motion.button
                        onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
                        whileHover={{ scale: 1.1, backgroundColor: "rgba(71,85,105,0.3)" }}
                        whileTap={{ scale: 0.95 }}
                        className="p-1.5 rounded-lg transition-colors"
                    >
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </motion.button>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-3">
                {daysOfWeek.map((day, idx) => (
                    <div key={idx} className="text-center text-xs font-semibold text-slate-500">
                        {day}
                    </div>
                ))}
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={`${month}-${year}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="grid grid-cols-7 gap-1 flex-1"
                >
                    {dates.map((date, idx) => {
                        const isToday = date === today.getDate() &&
                            month === today.getMonth() &&
                            year === today.getFullYear();

                        return (
                            <div key={idx} className="aspect-square flex items-center justify-center">
                                {date && (
                                    <motion.button
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{
                                            duration: 0.2,
                                            delay: idx * 0.01,
                                            ease: "easeOut"
                                        }}
                                        whileHover={{
                                            scale: 1.1,
                                            backgroundColor: isToday ? undefined : "rgba(71,85,105,0.3)",
                                            transition: { duration: 0.15 }
                                        }}
                                        whileTap={{ scale: 0.95 }}
                                        className={`w-full h-full text-xs font-medium rounded-lg transition-all shadow-sm ${isToday
                                                ? "bg-gradient-to-br from-teal-500 to-teal-600 text-white shadow-md"
                                                : "text-slate-400 hover:text-slate-200"
                                            }`}
                                    >
                                        {date}
                                    </motion.button>
                                )}
                            </div>
                        );
                    })}
                </motion.div>
            </AnimatePresence>
        </motion.div>
    );
}
