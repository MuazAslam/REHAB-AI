import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { FaSort, FaSortUp, FaSortDown, FaSearch } from 'react-icons/fa';

export default function RiskStratificationTable({ doctorId }) {
    const [patients, setPatients] = useState([]);
    const [filteredPatients, setFilteredPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sortField, setSortField] = useState('risk_score');
    const [sortOrder, setSortOrder] = useState('desc');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchPatients = async () => {
            if (!doctorId) return;

            try {
                const res = await axios.get(
                    `http://127.0.0.1:8000/api/doctor-patient-risks/${doctorId}`
                );

                if (res.data.status === 'success') {
                    setPatients(res.data.patients || []);
                    setFilteredPatients(res.data.patients || []);
                }
            } catch (error) {
                console.error('Failed to fetch patient risks:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchPatients();
    }, [doctorId]);

    useEffect(() => {
        let filtered = [...patients];

        // Apply search filter
        if (searchTerm) {
            filtered = filtered.filter(p =>
                p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.email.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Apply sorting
        filtered.sort((a, b) => {
            const aVal = a[sortField] || 0;
            const bVal = b[sortField] || 0;
            return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
        });

        setFilteredPatients(filtered);
    }, [patients, searchTerm, sortField, sortOrder]);

    const handleSort = (field) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('desc');
        }
    };

    const getTrendIcon = (trend) => {
        switch (trend) {
            case 'improving':
                return <span className="text-green-400">↗</span>;
            case 'declining':
                return <span className="text-red-400">↘</span>;
            case 'stable':
                return <span className="text-yellow-400">→</span>;
            default:
                return <span className="text-slate-500">-</span>;
        }
    };

    const getRiskColor = (riskScore) => {
        if (riskScore >= 60) return 'text-red-400 bg-red-500/10';
        if (riskScore >= 30) return 'text-yellow-400 bg-yellow-500/10';
        return 'text-green-400 bg-green-500/10';
    };

    const SortIcon = ({ field }) => {
        if (sortField !== field) return <FaSort className="w-3 h-3 text-slate-600" />;
        return sortOrder === 'asc' ?
            <FaSortUp className="w-3 h-3 text-teal-400" /> :
            <FaSortDown className="w-3 h-3 text-teal-400" />;
    };

    if (loading) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-[#1e2330] rounded-xl p-6 border border-slate-700/50 h-96 flex items-center justify-center"
            >
                <div className="w-8 h-8 border-2 border-teal-500/20 border-t-teal-500 rounded-full animate-spin" />
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#1e2330] rounded-2xl border border-slate-700/50 overflow-hidden shadow-xl"
        >
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-700/50">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold text-lg text-slate-200">Patient Risk Stratification</h3>
                        <p className="text-sm text-slate-400 mt-0.5">{filteredPatients.length} patients</p>
                    </div>
                    {/* Search */}
                    <div className="relative">
                        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3 h-3 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search patients..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                        />
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-slate-800/50 border-b border-slate-700/50">
                        <tr>
                            {[
                                { field: 'name', label: 'Patient Name' },
                                { field: 'risk_score', label: 'Risk Score' },
                                { field: 'recovery_score', label: 'Recovery' },
                                { field: 'trend', label: 'Trend' },
                                { field: 'active_pains', label: 'Active Pains' },
                                { field: 'compliance_rate', label: 'Compliance' },
                                { field: 'last_activity', label: 'Last Activity' }
                            ].map(({ field, label }) => (
                                <th
                                    key={field}
                                    onClick={() => handleSort(field)}
                                    className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-400 cursor-pointer hover:bg-slate-700/30 transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <span>{label}</span>
                                        <SortIcon field={field} />
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                        {filteredPatients.map((patient, index) => (
                            <motion.tr
                                key={patient.patient_id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.02 }}
                                className="hover:bg-slate-800/30 transition-colors cursor-pointer"
                            >
                                <td className="px-4 py-3">
                                    <div>
                                        <p className="text-sm font-medium text-slate-200">{patient.name}</p>
                                        <p className="text-xs text-slate-500">{patient.email}</p>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(patient.risk_score)}`}>
                                        {Math.round(patient.risk_score)}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <span className="text-sm text-slate-300">{Math.round(patient.recovery_score)}%</span>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        {getTrendIcon(patient.trend)}
                                        <span className="text-xs text-slate-400 capitalize">{patient.trend.replace('_', ' ')}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    {patient.active_pains > 0 ? (
                                        <span className="px-2 py-1 bg-red-500/10 text-red-400 rounded-full text-xs font-medium">
                                            {patient.active_pains}
                                        </span>
                                    ) : (
                                        <span className="text-xs text-slate-500">None</span>
                                    )}
                                </td>
                                <td className="px-4 py-3">
                                    <span className="text-sm text-slate-300">{Math.round(patient.compliance_rate)}%</span>
                                </td>
                                <td className="px-4 py-3">
                                    <span className="text-xs text-slate-400">
                                        {patient.last_activity || 'No data'}
                                    </span>
                                </td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>

                {filteredPatients.length === 0 && (
                    <div className="p-8 text-center text-slate-400">
                        No patients found matching your search
                    </div>
                )}
            </div>
        </motion.div>
    );
}
