import React from 'react';
import { motion } from 'framer-motion';
import { User, ShieldCheck } from 'lucide-react';

const PatientPhysioCard = ({ physio }) => {
    // Graceful fallback if data isn't loaded yet
    const name = physio?.name || "Assigned Doctor";
    const email = physio?.email || "No Email";
    const profilePic = physio?.profile_picture;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#1e2330] rounded-2xl p-4 shadow-xl border border-slate-700/50 h-full flex items-center gap-4 relative overflow-hidden"
        >
            {/* Subtle Background Gradient */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/5 rounded-full blur-xl -mr-10 -mt-10 pointer-events-none" />

            {/* Profile Picture */}
            <div className="relative shrink-0">
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-slate-700/50 shadow-md">
                    {profilePic ? (
                        <img
                            src={`http://localhost:8000/static/profile_pics/${profilePic}`}
                            alt={name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-400">
                            <User size={24} />
                        </div>
                    )}
                </div>
                <div className="absolute -bottom-1 -right-1 bg-teal-500 text-white p-1 rounded-full shadow border border-[#1e2330]">
                    <ShieldCheck size={12} />
                </div>
            </div>

            {/* Details */}
            <div className="flex flex-col min-w-0">
                <span className="text-[10px] uppercase font-bold text-teal-500 tracking-wider mb-0.5">
                    My Physiotherapist
                </span>
                <h3 className="text-white font-bold text-base truncate">
                    Dr. {name}
                </h3>
                <p className="text-slate-400 text-xs font-medium truncate">
                    {email}
                </p>
            </div>
        </motion.div>
    );
};

export default PatientPhysioCard;
