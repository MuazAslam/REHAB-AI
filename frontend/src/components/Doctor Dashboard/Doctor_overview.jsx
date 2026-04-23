
import React from 'react';
import { useAuth } from '../../context/AuthContext';
import Clock from '../Patient Dashboard/Cards/Clock';
import CriticalAlertsCard from './Cards/CriticalAlertsCard';
import DoctorOverviewStats from './Cards/DoctorOverviewStats';
import ExerciseComplianceCard from './Cards/ExerciseComplianceCard';
import PainOverviewCard from './Cards/PainOverviewCard';
import RiskStratificationTable from './Cards/RiskStratificationTable';
import RecoveryScoreTrendChart from './Cards/RecoveryScoreTrendChart';

import { LayoutDashboard } from 'lucide-react';

export default function Doctor_Overview() {
  const { user } = useAuth();
  const doctorId = user?.user_id;

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <LayoutDashboard size={28} className="text-indigo-600" />
              Doctor Overview
            </h1>
            <p className="text-slate-500 text-sm font-medium mt-1 ml-9">
              Real-time AI Analytics & Patient Insights
            </p>
          </div>
          <div className="mb-1">
            <Clock />
          </div>
        </div>

        {/* Overview Stats */}
        <div className="mb-8">
          <DoctorOverviewStats doctorId={doctorId} />
        </div>

        {/* Chart + Alerts Row: 2/3 split for Chart prominence */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Recovery Score Trend Chart - Takes 2/3 width */}
          <div className="lg:col-span-2 min-w-0">
            <RecoveryScoreTrendChart doctorId={doctorId} />
          </div>

          {/* Critical Alerts - Takes 1/3 width */}
          <div className="min-w-0">
            <CriticalAlertsCard doctorId={doctorId} />
          </div>
        </div>
        {/* Cards Row: Exercise Compliance + Pain Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <ExerciseComplianceCard doctorId={doctorId} />
          <PainOverviewCard doctorId={doctorId} />
        </div>

        {/* Risk Stratification Table */}
        <div className="mb-8">
          <RiskStratificationTable doctorId={doctorId} />
        </div>

      </div>
    </div>
  );
}
