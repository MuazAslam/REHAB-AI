import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import { motion } from "framer-motion";
import Clock from "./Cards/Clock";
import ActivityHeatmap from "./Cards/UserActivityHeatmap";
import RecoveryTrendCard from "./Cards/RecoveryTrendCard";

// Import Components
import StatCard from "./Cards/StatCard";
import PatientPhysioCard from "./Cards/PatientPhysioCard";
import CompactCalendar from "./Cards/CompactCalendar";
import WellnessCheckCard from "./Cards/DailyWellnessCard";
import { TrendingIcon } from "./Cards/Icons";
import { FaClock, FaChartLine } from "react-icons/fa";
import DailyTracker from "./Cards/DailyTracker";
import ExerciseProgressRing from "./Cards/ExerciseProgressRing";
import WellnessTrendChart from "./Cards/WellnessTrendChart";

export default function Patient_Overview() {
  const { user } = useAuth();

  // Helper function to format minutes to hours and minutes
  const formatDuration = (totalMinutes) => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  };


  const [todayStatus, setTodayStatus] = useState({
    mood: 3,
    sleep: 7,
    fatigue: 3
  });

  const [exerciseStats, setExerciseStats] = useState({
    assigned: 0,
    completed: 0,
    missed: 0,
    totalDuration: 0,
    recoveryScore: 0
  });

  const [physiotherapist, setPhysiotherapist] = useState(null);

  useEffect(() => {
    const fetchActivity = async () => {
      if (user && user.user_id) {
        try {
          const res = await axios.get(`http://127.0.0.1:8000/api/activity/today/${user.user_id}`);
          if (res.data.status === "success" && res.data.data) {
            setTodayStatus({
              mood: res.data.data.mood || 3,
              sleep: res.data.data.sleep_hours || 7,
              fatigue: res.data.data.fatigue_level || 3
            });
          }
        } catch (err) {
          console.error("Failed to fetch activity", err);
        }
      }
    };
    fetchActivity();
  }, [user]);

  // Fetch assigned exercises and recovery score
  useEffect(() => {
    const fetchExercises = async () => {
      if (user?.user_id) {
        try {
          // Fetch exercises
          const response = await axios.get(
            `http://127.0.0.1:8000/api/patient-exercises/${user.user_id}`
          );
          const exercises = response.data.exercises || [];

          const assigned = exercises.length;
          const completed = exercises.filter(ex => ex.status === 'completed').length;
          const missed = exercises.filter(ex => ex.status === 'missed').length;
          const totalDuration = exercises
            .filter(ex => ex.status === 'completed')
            .reduce((sum, ex) => sum + (ex.duration_minutes || 0), 0);
          const completionRate = assigned > 0 ? Math.round((completed / assigned) * 100) : 0;

          setExerciseStats({
            assigned,
            completed,
            missed,
            totalDuration,
            completionRate,
          });
        } catch (err) {
          console.error("Failed to fetch exercises", err);
        }
      }
    };
    fetchExercises();
  }, [user]);

  // Fetch assigned physiotherapist info
  useEffect(() => {
    const fetchPhysiotherapist = async () => {
      if (user?.user_therapist) {
        try {
          const response = await axios.get(
            `http://127.0.0.1:8000/api/users/${user.user_therapist}`
          );
          if (response.data.status === 'success' && response.data.user) {
            setPhysiotherapist(response.data.user);
          }
        } catch (err) {
          console.error('Failed to fetch physiotherapist', err);
        }
      }
    };
    fetchPhysiotherapist();
  }, [user]);

  return (
    <div className="min-h-screen bg-white p-6">
      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FaChartLine size={28} className="text-emerald-600" />
            Overview
          </h1>
          <p className="text-slate-400 text-sm font-medium mt-1 ml-9">
            Your daily wellness and recovery insights
          </p>
        </div>
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <DailyTracker userId={user?.user_id} />
            <Clock />
          </div>
        </div>
      </div>

      {/* Main Grid Layout: 3 stats + 1 activity heatmap + calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 lg:grid-rows-2 gap-4 mb-6">
        {/* Row 1: Physio Card (Replaces Recovery Score) */}
        <div className="h-full">
          <PatientPhysioCard physio={physiotherapist} />
        </div>

        {/* Circular Completion Gauge - spans 2 rows */}
        <div className="lg:row-span-2 h-full">
          <ExerciseProgressRing
            completed={exerciseStats.completed}
            missed={exerciseStats.missed}
            assigned={exerciseStats.assigned}
          />
        </div>

        {/* Activity Heatmap - spans 2 rows */}
        <div className="lg:row-span-2 h-full">
          <ActivityHeatmap userId={user?.user_id} />
        </div>

        {/* Calendar spanning 2 rows */}
        <div className="lg:row-span-2 h-full">
          <CompactCalendar />
        </div>

        {/* Row 2: Working Hours */}
        <StatCard
          icon={FaClock}
          label="Working Hours"
          value={formatDuration(exerciseStats.totalDuration)}
          change={null}
          changeType="neutral"
        />

      </div>

      {/* Recovery Progress & Wellness Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <RecoveryTrendCard userId={user?.user_id} />
        <WellnessTrendChart userId={user?.user_id} />
      </div>

      {/* Wellness Check Row */}
      <div className="mb-6">
        <WellnessCheckCard
          mood={todayStatus.mood}
          fatigue={todayStatus.fatigue}
          sleep={todayStatus.sleep}
        />
      </div>
    </div>
  );
}

