import React, { useState } from "react";
import { FaTimes, FaCheck } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

export default function PainFeedbackModal({ exercise, onSubmit, onClose }) {
    const [hadPain, setHadPain] = useState(null);
    const [painIntensity, setPainIntensity] = useState(5);
    const [painLocations, setPainLocations] = useState([]);

    const bodyParts = [
        "Head", "Neck",
        "Left Shoulder", "Right Shoulder",
        "Left Elbow", "Right Elbow",
        "Left Forearm", "Right Forearm",
        "Left Hand", "Right Hand",
        "Chest", "Upper Back", "Lower Back", "Abs",
        "Left Hip", "Right Hip",
        "Left Thigh", "Right Thigh",
        "Left Knee", "Right Knee",
        "Left Calf", "Right Calf",
        "Left Ankle", "Right Ankle",
        "Left Foot", "Right Foot",
    ];

    const toggleBodyPart = (part) => {
        setPainLocations(prev =>
            prev.includes(part)
                ? prev.filter(p => p !== part)
                : [...prev, part]
        );
    };

    const handleSubmit = () => {
        const feedback = {
            had_pain: hadPain,
            pain_intensity: hadPain ? painIntensity : null,
            pain_locations: hadPain ? painLocations : []
        };
        onSubmit(feedback);
    };

    const canSubmit = hadPain === false || (hadPain === true && painLocations.length > 0);

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="bg-gray-900 border border-gray-700/50 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
                >
                    {/* Header */}
                    <div className="px-6 py-5 border-b border-gray-800 flex items-center justify-between bg-gray-900/50">
                        <div>
                            <h2 className="text-xl font-bold text-white tracking-tight">Session Complete</h2>
                            <p className="text-sm text-teal-400 font-medium mt-0.5">{exercise.exercise_name}</p>
                        </div>
                        {/* 
                             Ideally we don't want a close button that dismisses without submitting, 
                             but keeping it for UX escape hatch. 
                        */}
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-800 rounded-full transition-colors text-gray-500 hover:text-white"
                        >
                            <FaTimes className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto custom-scrollbar flex-1">

                        {/* Pain Question */}
                        <div className="mb-8">
                            <h3 className="text-base font-semibold text-gray-200 mb-4 block">How did you feel during this session?</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setHadPain(false)}
                                    className={`relative group overflow-hidden px-4 py-6 rounded-xl border-2 font-medium transition-all duration-300 ${hadPain === false
                                            ? "border-green-500 bg-green-500/10 text-green-400"
                                            : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600 hover:bg-gray-750"
                                        }`}
                                >
                                    <div className="flex flex-col items-center gap-2 relative z-10">
                                        <span className="text-2xl">💪</span>
                                        <span>Feeling Great</span>
                                    </div>
                                    {hadPain === false && (
                                        <motion.div
                                            layoutId="selection-glow"
                                            className="absolute inset-0 bg-green-500/5"
                                        />
                                    )}
                                </button>

                                <button
                                    onClick={() => setHadPain(true)}
                                    className={`relative group overflow-hidden px-4 py-6 rounded-xl border-2 font-medium transition-all duration-300 ${hadPain === true
                                            ? "border-red-500 bg-red-500/10 text-red-400"
                                            : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600 hover:bg-gray-750"
                                        }`}
                                >
                                    <div className="flex flex-col items-center gap-2 relative z-10">
                                        <span className="text-2xl">😣</span>
                                        <span>I Felt Pain</span>
                                    </div>
                                    {hadPain === true && (
                                        <motion.div
                                            layoutId="selection-glow"
                                            className="absolute inset-0 bg-red-500/5"
                                        />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Conditional Pain Details */}
                        <AnimatePresence>
                            {hadPain === true && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="overflow-hidden"
                                >
                                    {/* Intensity Slider */}
                                    <div className="mb-8 p-5 bg-gray-800/50 rounded-xl border border-gray-700/50">
                                        <div className="flex justify-between items-end mb-4">
                                            <h3 className="text-sm font-semibold text-gray-300">Pain Intensity</h3>
                                            <span className={`text-2xl font-bold ${painIntensity <= 3 ? 'text-yellow-400' :
                                                    painIntensity <= 7 ? 'text-orange-400' : 'text-red-500'
                                                }`}>
                                                {painIntensity}<span className="text-xs text-gray-500 font-normal ml-1">/ 10</span>
                                            </span>
                                        </div>

                                        <input
                                            type="range"
                                            min="1"
                                            max="10"
                                            value={painIntensity}
                                            onChange={(e) => setPainIntensity(parseInt(e.target.value))}
                                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-500 hover:accent-red-400 transition-all"
                                        />
                                        <div className="flex justify-between mt-2 text-xs text-gray-500 font-medium tracking-wide uppercase">
                                            <span>Mild Discomfort</span>
                                            <span>Severe Pain</span>
                                        </div>
                                    </div>

                                    {/* Body Map Grid */}
                                    <div className="mb-2">
                                        <h3 className="text-sm font-semibold text-gray-300 mb-3">Affected Areas <span className="text-gray-500 font-normal m-1 small">(Tap to select)</span></h3>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                            {bodyParts.map((part) => {
                                                const isSelected = painLocations.includes(part);
                                                return (
                                                    <button
                                                        key={part}
                                                        onClick={() => toggleBodyPart(part)}
                                                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 border ${isSelected
                                                                ? "bg-red-500 text-white border-red-600 shadow-lg shadow-red-500/20 transform scale-[1.02]"
                                                                : "bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-500 hover:text-gray-200"
                                                            }`}
                                                    >
                                                        {part}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {painLocations.length === 0 && (
                                            <motion.p
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="text-xs text-red-400 mt-3 flex items-center gap-1.5"
                                            >
                                                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                                                Please select at least one area
                                            </motion.p>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-5 border-t border-gray-800 bg-gray-900/80 backdrop-blur-md flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={!canSubmit || hadPain === null}
                            className="px-8 py-2.5 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                        >
                            <span>Complete Session</span>
                            <FaCheck className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
