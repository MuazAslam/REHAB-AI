import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
    Users,
    UserPlus,
    UserCheck,
    TrendingUp,
    Search,
    Filter,
    X,
    ChevronDown,
    Dumbbell,
    User,
    Mail,
    Calendar,
    Hash,
    Cake,
    Scale,
    Ruler,
    Activity,
    Loader2
} from "lucide-react";
import ExerciseAssignmentModal from "./ExerciseAssignmentModal";

// --- Sub-components ---

const MetricCard = ({ icon: Icon, label, value, color, delay = 0, unit }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: delay * 0.1 }}
        whileHover={{ y: -4, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)" }}
        className="bg-[#1e2330] p-6 rounded-2xl shadow-xl border border-slate-800 transition-all group relative overflow-hidden"
    >
        <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full ${color} opacity-5 blur-2xl group-hover:opacity-10 transition-opacity`} />
        <div className="flex items-start justify-between">
            <div>
                <p className="text-slate-300 text-[11px] font-bold uppercase tracking-widest mb-1.5">{label}</p>
                <div className="flex items-baseline gap-1.5">
                    <motion.span
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        className="text-2xl font-bold text-slate-100"
                    >
                        {value}
                    </motion.span>
                    {unit && <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">{unit}</span>}
                </div>
            </div>
            <div className={`p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-300 group-hover:text-white transition-colors shadow-lg`}>
                <Icon size={18} />
            </div>
        </div>
    </motion.div>
);

const PatientRow = ({ patient, index, onAssign }) => {
    const profilePicUrl = patient.profile_picture ? `http://localhost:8000/static/profile_pics/${patient.profile_picture}` : null;

    return (
        <motion.tr
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ delay: index * 0.03 }}
            className="hover:bg-slate-800/40 active:bg-slate-800/60 transition-all duration-200 group cursor-default"
        >
            <td className="px-5 py-5">
                <span className="text-[11px] font-bold text-slate-600 group-hover:text-indigo-400 transition-colors uppercase tracking-[0.2em]">
                    {String(index + 1).padStart(2, '0')}
                </span>
            </td>
            <td className="px-5 py-5">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="w-10 h-10 rounded-2xl overflow-hidden bg-slate-800 border border-slate-700 group-hover:border-indigo-500/30 transition-all shadow-lg rotate-3 group-hover:rotate-0">
                            {profilePicUrl ? (
                                <img
                                    src={profilePicUrl}
                                    alt={patient.name}
                                    className="w-full h-full object-cover scale-110 group-hover:scale-100 transition-transform duration-500"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'flex';
                                    }}
                                />
                            ) : null}
                            <div
                                className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-black"
                                style={{ display: profilePicUrl ? 'none' : 'flex' }}
                            >
                                {patient.name?.charAt(0).toUpperCase()}
                            </div>
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#1e2330] shadow-glow-sm" />
                    </div>
                    <div className="flex flex-col">
                        <p className="text-sm font-bold text-slate-100 group-hover:text-indigo-300 transition-colors">{patient.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                            <Mail size={10} className="text-slate-500" />
                            <p className="text-[10px] text-slate-400 font-medium truncate max-w-[150px]">{patient.email}</p>
                        </div>
                    </div>
                </div>
            </td>

            <td className="px-5 py-5">
                <div className="px-4 py-2 bg-slate-800/60 border border-slate-700/80 text-xs font-bold text-white rounded-2xl flex items-center gap-2.5 shadow-sm w-fit mx-auto group-hover:border-slate-500/50 transition-colors">
                    <User size={13} className="text-indigo-400" />
                    <span>{patient.gender || 'N/A'}</span>
                </div>
            </td>
            <td className="px-5 py-5">
                <div className="px-4 py-2 bg-slate-800/60 border border-slate-700/80 text-xs font-bold text-white rounded-2xl flex items-center gap-2.5 shadow-sm w-fit mx-auto group-hover:border-slate-500/50 transition-colors">
                    <Cake size={13} className="text-indigo-400" />
                    <span>{patient.age || 'N/A'} <span className="text-slate-400 font-medium">yrs</span></span>
                </div>
            </td>
            <td className="px-5 py-5">
                <div className="px-4 py-2 bg-slate-800/60 border border-slate-700/80 text-xs font-bold text-white rounded-2xl flex items-center gap-2.5 shadow-sm w-fit mx-auto group-hover:border-slate-500/50 transition-colors">
                    <Scale size={13} className="text-indigo-400" />
                    <span>{patient.weight || 'N/A'}<span className="text-slate-400 font-medium">kg</span></span>
                </div>
            </td>
            <td className="px-5 py-5">
                <div className="flex items-center gap-2.5 text-slate-100 font-bold text-xs">
                    <Calendar size={13} className="text-slate-500" />
                    {patient.joined_on ? (() => {
                        const date = new Date(patient.joined_on);
                        return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
                    })() : 'N/A'}
                </div>
            </td>
            <td className="px-5 py-5 text-center">
                <motion.button
                    whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(79, 70, 229, 0.4)" }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onAssign(patient)}
                    className="flex items-center gap-2.5 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] transition-all shadow-xl shadow-indigo-500/30 mx-auto"
                >
                    <Dumbbell size={14} strokeWidth={3} />
                    Assign
                </motion.button>
            </td>
        </motion.tr>
    );
};

// --- Main Component ---

export default function Patients_Overview() {
    const { user } = useAuth();
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [showFilters, setShowFilters] = useState(false);

    // Exercise assignment modal state
    const [showExerciseModal, setShowExerciseModal] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState(null);

    // Advanced filter state
    const [filters, setFilters] = useState({
        gender: 'all',
        ageMin: '',
        ageMax: '',
        weightMin: '',
        weightMax: '',
        heightMin: '',
        heightMax: '',
    });

    useEffect(() => {
        const fetchPatients = async () => {
            if (user && user.user_id) {
                try {
                    const res = await axios.get(`http://127.0.0.1:8000/api/patients/${user.user_id}`);
                    if (res.data.status === "success") {
                        setPatients(res.data.patients);
                    }
                } catch (err) {
                    console.error("Failed to fetch patients", err);
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchPatients();
    }, [user]);

    // Filtering logic
    const filteredPatients = patients.filter(patient => {
        if (searchQuery && !patient.name?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        if (filters.gender !== 'all' && patient.gender !== filters.gender) return false;
        const age = patient.age || 0;
        if (filters.ageMin && age < parseInt(filters.ageMin)) return false;
        if (filters.ageMax && age > parseInt(filters.ageMax)) return false;
        const weight = patient.weight || 0;
        if (filters.weightMin && weight < parseInt(filters.weightMin)) return false;
        if (filters.weightMax && weight > parseInt(filters.weightMax)) return false;
        const height = patient.height || 0;
        if (filters.heightMin && height < parseInt(filters.heightMin)) return false;
        if (filters.heightMax && height > parseInt(filters.heightMax)) return false;
        return true;
    });

    const hasActiveFilters = () => {
        return filters.gender !== 'all' || filters.ageMin || filters.ageMax ||
            filters.weightMin || filters.weightMax || filters.heightMin || filters.heightMax;
    };

    const clearFilters = () => {
        setFilters({ gender: 'all', ageMin: '', ageMax: '', weightMin: '', weightMax: '', heightMin: '', heightMax: '' });
        setSearchQuery('');
    };

    const handleAssignExercise = (patient) => {
        setSelectedPatient(patient);
        setShowExerciseModal(true);
    };

    // Calculate stats
    const totalPatients = patients.length;
    const averageAge = patients.length > 0
        ? Math.round(patients.reduce((sum, p) => sum + (p.age || 0), 0) / patients.length)
        : 0;
    const averageWeight = patients.length > 0
        ? Math.round(patients.reduce((sum, p) => sum + (p.weight || 0), 0) / patients.length)
        : 0;

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const newThisWeek = patients.filter(p => p.joined_on && new Date(p.joined_on) >= oneWeekAgo).length;

    return (
        <div className="min-h-screen bg-white p-6">
            <div className="max-w-[1600px] mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                            <Users size={28} className="text-indigo-600" />
                            Patients Management
                        </h1>
                        <p className="text-slate-500 text-sm font-medium mt-1 ml-9">
                            Manage your Patients & Assign Exercises
                        </p>
                    </div>
                </div>

                {/* Stat Cards Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <MetricCard icon={Users} label="Total Patients" value={totalPatients} color="bg-indigo-500" delay={1} />
                    <MetricCard icon={Scale} label="Average Weight" value={averageWeight} unit="kg" color="bg-emerald-500" delay={2} />
                    <MetricCard icon={TrendingUp} label="Average Age" value={averageAge} color="bg-purple-500" delay={3} />
                    <MetricCard icon={UserPlus} label="New This Week" value={newThisWeek} color="bg-amber-500" delay={4} />
                </div>

                {/* Search and Filter Section */}
                <div className="bg-[#1e2330] rounded-2xl border border-slate-700/50 mb-4 shadow-xl overflow-hidden">
                    <div className="p-4 border-b border-slate-700/50 bg-slate-800/20">
                        <div className="flex flex-wrap gap-4 items-center">
                            <div className="relative flex-1 min-w-[280px]">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder="Search patients by name or ID..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-11 pr-11 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-500 font-medium"
                                />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors">
                                        <X size={16} />
                                    </button>
                                )}
                            </div>

                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg ${hasActiveFilters()
                                    ? 'bg-indigo-500 text-white shadow-indigo-500/20'
                                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 shadow-black/20'
                                    }`}
                            >
                                <Filter size={16} />
                                <span>Filters</span>
                                {hasActiveFilters() && (
                                    <span className="ml-1 px-1.5 py-0.5 bg-white text-indigo-500 rounded-full text-[10px] font-black">
                                        {Object.values(filters).filter(v => v && v !== 'all').length}
                                    </span>
                                )}
                                <ChevronDown size={14} className={`transition-transform duration-300 ${showFilters ? "rotate-180" : ""}`} />
                            </button>
                        </div>
                    </div>

                    <AnimatePresence>
                        {showFilters && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                                className="overflow-hidden bg-slate-800/30"
                            >
                                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                            <User size={12} className="text-slate-600" />
                                            Gender
                                        </label>
                                        <select
                                            value={filters.gender}
                                            onChange={(e) => setFilters({ ...filters, gender: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 transition-all font-semibold appearance-none cursor-pointer"
                                        >
                                            <option value="all">All Genders</option>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                            <Cake size={12} className="text-slate-600" />
                                            Age Range
                                        </label>
                                        <div className="flex gap-2">
                                            <input type="number" placeholder="Min" value={filters.ageMin} onChange={(e) => setFilters({ ...filters, ageMin: e.target.value })} className="w-1/2 px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 transition-all font-semibold placeholder:text-slate-700" />
                                            <input type="number" placeholder="Max" value={filters.ageMax} onChange={(e) => setFilters({ ...filters, ageMax: e.target.value })} className="w-1/2 px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 transition-all font-semibold placeholder:text-slate-700" />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                            <Scale size={12} className="text-slate-600" />
                                            Weight (kg)
                                        </label>
                                        <div className="flex gap-2">
                                            <input type="number" placeholder="Min" value={filters.weightMin} onChange={(e) => setFilters({ ...filters, weightMin: e.target.value })} className="w-1/2 px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 transition-all font-semibold placeholder:text-slate-700" />
                                            <input type="number" placeholder="Max" value={filters.weightMax} onChange={(e) => setFilters({ ...filters, weightMax: e.target.value })} className="w-1/2 px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 transition-all font-semibold placeholder:text-slate-700" />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                            <Ruler size={12} className="text-slate-600" />
                                            Height (cm)
                                        </label>
                                        <div className="flex gap-2">
                                            <input type="number" placeholder="Min" value={filters.heightMin} onChange={(e) => setFilters({ ...filters, heightMin: e.target.value })} className="w-1/2 px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 transition-all font-semibold placeholder:text-slate-700" />
                                            <input type="number" placeholder="Max" value={filters.heightMax} onChange={(e) => setFilters({ ...filters, heightMax: e.target.value })} className="w-1/2 px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 transition-all font-semibold placeholder:text-slate-700" />
                                        </div>
                                    </div>
                                </div>

                                {hasActiveFilters() && (
                                    <div className="px-6 py-3 border-t border-slate-700/50 flex justify-end">
                                        <button onClick={clearFilters} className="px-4 py-2 bg-red-500/10 text-red-500 rounded-lg text-[11px] font-black uppercase tracking-wider hover:bg-red-500 hover:text-white transition-all flex items-center gap-2">
                                            <X size={14} /> Clear All Filters
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {(searchQuery || hasActiveFilters()) && (
                        <div className="px-5 py-3 bg-indigo-500/5 border-t border-slate-700/50 text-[11px] text-indigo-400 font-bold flex flex-wrap gap-x-4 gap-y-1">
                            <span className="flex items-center gap-1.5 uppercase tracking-wider">
                                <TrendingUp size={12} /> Showing {filteredPatients.length} of {patients.length} patients
                            </span>
                            {searchQuery && <><span className="text-slate-600">•</span><span>Search: "{searchQuery}"</span></>}
                            {filters.gender !== 'all' && <><span className="text-slate-600">•</span><span>Gender: {filters.gender}</span></>}
                        </div>
                    )}
                </div>

                {/* Patients Table Section */}
                <div className="bg-[#1e2330] rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden mb-6">
                    <div className="px-6 py-5 border-b border-slate-700/50 flex items-center justify-between bg-slate-800/20">
                        <div>
                            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                                <Users size={16} className="text-indigo-400" />
                                Patient Roster
                            </h2>
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">
                                {loading ? "Syncing Workspace..." : `${filteredPatients.length} Patients Active`}
                            </p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="p-24 text-center">
                            <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full mx-auto mb-4" />
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">Synchronizing Data...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-800/40 border-b border-slate-700/50 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                                    <tr>
                                        <th className="px-5 py-4 text-left"><div className="flex items-center gap-2"><Hash size={12} className="text-slate-400" /><span className="text-slate-300">SR</span></div></th>
                                        <th className="px-5 py-4 text-left"><div className="flex items-center gap-2"><User size={12} className="text-slate-400" /><span className="text-slate-300">Patient Identity</span></div></th>

                                        <th className="px-5 py-4 text-center"><div className="flex items-center gap-2 justify-center"><User size={12} className="text-slate-400" /><span className="text-slate-300">Gender</span></div></th>
                                        <th className="px-5 py-4 text-center"><div className="flex items-center gap-2 justify-center"><Cake size={12} className="text-slate-400" /><span className="text-slate-300">Age</span></div></th>
                                        <th className="px-5 py-4 text-center"><div className="flex items-center gap-2 justify-center"><Scale size={12} className="text-slate-400" /><span className="text-slate-300">Weight</span></div></th>
                                        <th className="px-5 py-4 text-left"><div className="flex items-center gap-2"><Calendar size={12} className="text-slate-400" /><span className="text-slate-300">Joined Date</span></div></th>
                                        <th className="px-5 py-4 text-center"><span className="text-slate-300 tracking-[0.2em] uppercase">Care Actions</span></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700/30">
                                    <AnimatePresence mode="popLayout">
                                        {filteredPatients.map((p, idx) => (
                                            <PatientRow key={p._id} patient={p} index={idx} onAssign={handleAssignExercise} />
                                        ))}
                                    </AnimatePresence>
                                </tbody>
                            </table>
                            {filteredPatients.length === 0 && (
                                <div className="p-24 text-center">
                                    <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-700/50"><Search size={24} className="text-slate-600" /></div>
                                    <h3 className="text-slate-200 font-bold mb-2">No Matching Patients Found</h3>
                                    <p className="text-xs text-slate-500 max-w-[280px] mx-auto leading-relaxed">Adjust your criteria or search term to try again.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {showExerciseModal && selectedPatient && (
                <ExerciseAssignmentModal
                    patient={selectedPatient}
                    doctorId={user.user_id}
                    onClose={() => setShowExerciseModal(false)}
                    onSuccess={() => console.log("Exercises assigned.")}
                />
            )}
        </div>
    );
}
