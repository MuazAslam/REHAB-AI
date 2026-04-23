import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronDown, User, Check, X } from "lucide-react";

const PatientSelector = ({ patients, selectedPatientId, onSelect, loading }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const dropdownRef = useRef(null);

    const selectedPatient = patients.find(p => p._id === selectedPatientId);

    const filteredPatients = patients.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative min-w-[280px]" ref={dropdownRef}>
            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-[#1e2330] border border-slate-700/50 text-slate-100 pl-4 pr-10 py-2.5 rounded-xl flex items-center justify-between hover:border-indigo-500/50 transition-all font-semibold text-sm shadow-lg group"
            >
                <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 group-hover:border-indigo-500/30 transition-colors">
                        <User size={14} className="text-slate-400 group-hover:text-indigo-400" />
                    </div>
                    <span className="truncate max-w-[160px]">
                        {loading ? "Loading..." : selectedPatient ? selectedPatient.name : "Select Patient"}
                    </span>
                </div>
                <ChevronDown
                    size={16}
                    className={`text-slate-500 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute left-0 right-0 mt-2 bg-[#1e2330] border border-slate-700 rounded-2xl shadow-2xl z-[100] overflow-hidden backdrop-blur-xl"
                    >
                        {/* Search Input */}
                        <div className="p-3 border-b border-slate-700/50 bg-slate-800/30">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                                <input
                                    type="text"
                                    placeholder="Search patients..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50 transition-all placeholder:text-slate-600 font-medium"
                                    autoFocus
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm("")}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                                    >
                                        <X size={12} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Patient List */}
                        <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-1">
                            {filteredPatients.length > 0 ? (
                                filteredPatients.map((patient) => (
                                    <button
                                        key={patient._id}
                                        onClick={() => {
                                            onSelect(patient._id);
                                            setIsOpen(false);
                                            setSearchTerm("");
                                        }}
                                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all group ${selectedPatientId === patient._id
                                            ? "bg-indigo-500/10 text-indigo-400"
                                            : "hover:bg-slate-800 text-slate-400 hover:text-slate-100"
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${selectedPatientId === patient._id
                                                ? "bg-indigo-500/20 border-indigo-500/30"
                                                : "bg-slate-800 border-slate-700 group-hover:border-slate-600"
                                                }`}>
                                                <User size={14} className={selectedPatientId === patient._id ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300"} />
                                            </div>
                                            <div className="flex flex-col items-start overflow-hidden">
                                                <span className="text-sm font-semibold truncate w-full">{patient.name}</span>
                                                <span className="text-[10px] text-slate-500 font-medium tracking-tight">ID: {patient._id.slice(-6).toUpperCase()}</span>
                                            </div>
                                        </div>
                                        {selectedPatientId === patient._id && (
                                            <Check size={16} className="text-indigo-500 mr-1" />
                                        )}
                                    </button>
                                ))
                            ) : (
                                <div className="p-8 text-center">
                                    <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Search size={18} className="text-slate-600" />
                                    </div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">No Patients Found</p>
                                    <p className="text-[10px] text-slate-600 mt-1">Try a different search term</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-2 bg-slate-800/30 border-t border-slate-700/50 flex items-center justify-between px-4 py-2">
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                {filteredPatients.length} Patients
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #334155;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #475569;
                }
            `}</style>
        </div>
    );
};

export default PatientSelector;
