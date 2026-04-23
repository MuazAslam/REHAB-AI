import React, { useState, useEffect } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
    X,
    Dumbbell,
    Clock,
    Check,
    Search,
    AlertCircle,
    Calendar,
    ChevronRight,
    Loader2
} from "lucide-react";

export default function ExerciseAssignmentModal({ patient, doctorId, onClose, onSuccess }) {
    const [exercises, setExercises] = useState([]);
    const [selectedExercises, setSelectedExercises] = useState({});
    const [assignedExercises, setAssignedExercises] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            try {
                const exercisesRes = await axios.get("http://127.0.0.1:8000/api/exercises");
                if (exercisesRes.data.status === "success") {
                    setExercises(exercisesRes.data.exercises);
                }

                const assignedRes = await axios.get(`http://127.0.0.1:8000/api/patient-exercises/${patient._id}`);
                if (assignedRes.data.status === "success") {
                    setAssignedExercises(assignedRes.data.exercises || []);
                }
            } catch (err) {
                console.error("Failed to fetch data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [patient._id]);

    const toggleExercise = (exerciseId) => {
        setSelectedExercises(prev => {
            if (prev[exerciseId]) {
                const newSelected = { ...prev };
                delete newSelected[exerciseId];
                return newSelected;
            } else {
                return { ...prev, [exerciseId]: 10 };
            }
        });
    };

    const updateDuration = (exerciseId, duration) => {
        setSelectedExercises(prev => ({
            ...prev,
            [exerciseId]: parseInt(duration) || 0
        }));
    };

    const handleSubmit = async () => {
        if (Object.keys(selectedExercises).length === 0) return;

        setSubmitting(true);
        try {
            const exercisesData = Object.entries(selectedExercises).map(([exercise_id, duration_minutes]) => ({
                exercise_id,
                duration_minutes
            }));

            const res = await axios.post("http://127.0.0.1:8000/api/assign-exercise", {
                patient_id: patient._id,
                doctor_id: doctorId,
                exercises: exercisesData
            });

            if (res.data.status === "success") {
                onSuccess();
                onClose();
            }
        } catch (err) {
            console.error("Failed to assign exercises", err);
        } finally {
            setSubmitting(false);
        }
    };

    const filteredExercises = exercises.filter(ex =>
        ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ex.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                />

                {/* Modal Container */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative bg-[#1e2330] border border-slate-700/50 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="px-8 py-6 border-b border-slate-700/50 bg-slate-800/20 flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                                    <Dumbbell size={20} className="text-indigo-400" />
                                </div>
                                <h2 className="text-xl font-bold text-slate-100 uppercase tracking-tight">Assign Exercises</h2>
                            </div>
                            <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest pl-11">
                                Patient: <span className="text-indigo-400">{patient.name}</span>
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-700/50 rounded-xl transition-colors text-slate-400 hover:text-white border border-transparent hover:border-slate-600"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Search Bar */}
                    <div className="px-8 py-4 bg-slate-800/10 border-b border-slate-700/30">
                        <div className="relative">
                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search available exercises..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-2xl py-3 pl-12 pr-4 text-sm text-slate-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 transition-all placeholder:text-slate-600 font-medium"
                            />
                        </div>
                    </div>

                    {/* Exercise List */}
                    <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-4">
                                <Loader2 size={32} className="text-indigo-500 animate-spin" />
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Initialising Library...</p>
                            </div>
                        ) : filteredExercises.length === 0 ? (
                            <div className="text-center py-12 opacity-50">
                                <Search size={40} className="mx-auto text-slate-600 mb-4" />
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No exercises found</p>
                            </div>
                        ) : (
                            filteredExercises.map((exercise, index) => {
                                const isSelected = selectedExercises.hasOwnProperty(exercise._id);
                                const allAssignments = assignedExercises.filter(ae => ae.exercise_id === exercise._id);
                                const latestAssignment = allAssignments.length > 0
                                    ? allAssignments.reduce((latest, current) => {
                                        const latestDate = new Date(latest.assigned_timestamp || latest.assigned_date);
                                        const currentDate = new Date(current.assigned_timestamp || current.assigned_date);
                                        return currentDate > latestDate ? current : latest;
                                    })
                                    : null;

                                let isBlockedByDeadline = false;
                                let hoursRemaining = 0;
                                if (latestAssignment && latestAssignment.deadline) {
                                    const deadlineTime = new Date(latestAssignment.deadline);
                                    const now = new Date();
                                    const timeDiff = deadlineTime - now;
                                    hoursRemaining = Math.max(0, Math.floor(timeDiff / (1000 * 60 * 60)));
                                    isBlockedByDeadline = timeDiff > 0;
                                }

                                return (
                                    <motion.div
                                        key={exercise._id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        onClick={() => !isBlockedByDeadline && toggleExercise(exercise._id)}
                                        className={`group relative border rounded-2xl p-5 transition-all cursor-pointer ${isBlockedByDeadline
                                            ? "border-amber-500/20 bg-amber-500/[0.02] opacity-60 cursor-not-allowed"
                                            : isSelected
                                                ? "border-indigo-500/50 bg-indigo-500/[0.05] shadow-lg shadow-indigo-500/5"
                                                : "border-slate-700/50 bg-slate-800/20 hover:border-slate-500 hover:bg-slate-800/40"
                                            }`}
                                    >
                                        <div className="flex items-start gap-4">
                                            {/* Selection Indicator */}
                                            <div className={`mt-1 w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${isSelected
                                                ? "bg-indigo-500 border-indigo-400 shadow-glow-sm"
                                                : "bg-slate-900 border-slate-700"
                                                }`}>
                                                {isSelected && <Check size={12} className="text-white" strokeWidth={4} />}
                                            </div>

                                            <div className="flex-1">
                                                <div className="flex items-center justify-between gap-3 mb-2">
                                                    <h3 className={`font-bold transition-colors ${isSelected ? "text-indigo-300" : "text-slate-100"}`}>
                                                        {exercise.name}
                                                    </h3>
                                                    {isBlockedByDeadline && (
                                                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[10px] font-black text-amber-500 uppercase tracking-widest">
                                                            <Clock size={10} />
                                                            {hoursRemaining}h Left
                                                        </div>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-500 font-medium leading-relaxed mb-4">
                                                    {exercise.description}
                                                </p>

                                                {/* Duration Settings */}
                                                <AnimatePresence>
                                                    {isSelected && !isBlockedByDeadline && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: "auto", opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            className="overflow-hidden"
                                                            onClick={e => e.stopPropagation()}
                                                        >
                                                            <div className="flex items-center gap-4 pt-4 border-t border-slate-700/30">
                                                                <div className="flex items-center gap-2">
                                                                    <Clock size={14} className="text-slate-500" />
                                                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Duration</span>
                                                                </div>
                                                                <div className="flex items-center gap-3">
                                                                    <input
                                                                        type="number"
                                                                        min="1"
                                                                        value={selectedExercises[exercise._id]}
                                                                        onChange={(e) => updateDuration(exercise._id, e.target.value)}
                                                                        className="w-20 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-100 focus:outline-none focus:border-indigo-500 transition-all"
                                                                    />
                                                                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Minutes</span>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>

                                        {/* Status Info for assignments */}
                                        {latestAssignment && !isBlockedByDeadline && (
                                            <div className="absolute top-5 right-5 flex items-center gap-2">
                                                <div className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border ${latestAssignment.status === 'completed'
                                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                                    : latestAssignment.status === 'missed'
                                                        ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                                                        : 'bg-slate-700/30 border-slate-700/50 text-slate-500'
                                                    }`}>
                                                    {latestAssignment.status || 'Past'}
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                );
                            })
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-8 py-6 border-t border-slate-700/50 bg-slate-800/20 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700/50 flex items-center justify-center text-indigo-400 font-black text-sm">
                                {Object.keys(selectedExercises).length}
                            </div>
                            <div className="flex flex-col">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Ready to</p>
                                <p className="text-xs font-bold text-slate-300">Assign Selection</p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="px-6 py-3 border border-slate-700 rounded-2xl text-xs font-black text-slate-400 uppercase tracking-widest hover:bg-slate-700 hover:text-white hover:border-slate-600 transition-all"
                            >
                                Cancel
                            </button>
                            <motion.button
                                whileHover={{ scale: 1.02, boxShadow: "0 10px 20px -5px rgba(79, 70, 229, 0.3)" }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleSubmit}
                                disabled={submitting || Object.keys(selectedExercises).length === 0}
                                className="relative px-8 py-3 bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 disabled:border-slate-700 border border-indigo-400/30 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all overflow-hidden group shadow-lg shadow-indigo-500/20"
                            >
                                {submitting ? (
                                    <div className="flex items-center gap-2">
                                        <Loader2 size={16} className="animate-spin" />
                                        <span>Saving...</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <Check size={16} strokeWidth={3} />
                                        <span>Confirm Assignment</span>
                                    </div>
                                )}
                            </motion.button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
