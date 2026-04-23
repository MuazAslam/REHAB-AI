import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import StatCard from "./Cards/StatCard";
import PainFeedbackModal from "./PainFeedbackModal";
import { FaDumbbell, FaCheckCircle, FaClock, FaTimesCircle, FaPlay, FaCalendarAlt, FaHashtag, FaInfoCircle, FaCalendar, FaList } from "react-icons/fa";

export default function Patient_Excercises() {
  const { user } = useAuth();

  // Helper function to format minutes to hours and minutes
  const formatDuration = (totalMinutes) => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  const [exercises, setExercises] = useState([]);
  const [groupedExercises, setGroupedExercises] = useState({});
  const [filteredGroupedExercises, setFilteredGroupedExercises] = useState({});
  const [statusFilter, setStatusFilter] = useState('all');
  const [groupByDate, setGroupByDate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    missed: 0,
    totalDuration: 0
  });
  const [showPainModal, setShowPainModal] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState(null);

  useEffect(() => {
    const fetchExercises = async () => {
      if (user && user.user_id) {
        try {
          if (groupByDate) {
            // Use advanced endpoint with date grouping
            const res = await axios.get(`http://127.0.0.1:8000/api/patient-exercises-advanced/${user.user_id}`);

            if (res.data.status === "success") {
              const grouped = res.data.grouped_exercises || {};
              setGroupedExercises(grouped);

              // Flatten for stats calculation
              const exerciseList = Object.values(grouped).flat();
              setExercises(exerciseList);

              const pending = exerciseList.filter(ex => ex.status === "pending").length;
              const completed = exerciseList.filter(ex => ex.status === "completed").length;
              const missed = exerciseList.filter(ex => ex.status === "missed").length;
              const totalDuration = exerciseList.reduce((sum, ex) => sum + (ex.duration_minutes || 0), 0);

              setStats({
                total: exerciseList.length,
                pending,
                completed,
                missed,
                totalDuration
              });
            }
          } else {
            // Use regular endpoint with flat sorted list (pending → completed → missed)
            const res = await axios.get(`http://127.0.0.1:8000/api/patient-exercises/${user.user_id}`);

            if (res.data.status === "success") {
              const exerciseList = res.data.exercises || [];
              setExercises(exerciseList);

              // Create a single group for flat view
              setGroupedExercises({ "All Exercises": exerciseList });

              const pending = exerciseList.filter(ex => ex.status === "pending").length;
              const completed = exerciseList.filter(ex => ex.status === "completed").length;
              const missed = exerciseList.filter(ex => ex.status === "missed").length;
              const totalDuration = exerciseList.reduce((sum, ex) => sum + (ex.duration_minutes || 0), 0);

              setStats({
                total: exerciseList.length,
                pending,
                completed,
                missed,
                totalDuration
              });
            }
          }
        } catch (err) {
          console.error("Failed to fetch exercises", err);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchExercises();
  }, [user, groupByDate]); // Refetch when groupByDate changes

  // Filter exercises when groupedExercises or statusFilter changes
  useEffect(() => {
    if (statusFilter === 'all') {
      setFilteredGroupedExercises(groupedExercises);
    } else {
      const filtered = {};
      Object.entries(groupedExercises).forEach(([dateLabel, dateExercises]) => {
        const filteredExercises = dateExercises.filter(ex => ex.status === statusFilter);
        if (filteredExercises.length > 0) {
          filtered[dateLabel] = filteredExercises;
        }
      });
      setFilteredGroupedExercises(filtered);
    }
  }, [groupedExercises, statusFilter]);

  const handlePerformExercise = async (exercise) => {
    // Check if exercise is plank
    if (exercise.exercise_name.toLowerCase().includes('plank')) {
      try {
        // Generate token for video feed
        const response = await axios.post('http://127.0.0.1:8000/api/video/generate-token', {
          patient_id: user.user_id,
          exercise_name: exercise.exercise_name,
          exercise_id: exercise.exercise_id
        });

        if (response.data.status === 'success') {
          const token = response.data.token;
          // Open new window with video feed page (frontend route, not direct stream)
          const videoPageUrl = `/exercise-video?token=${token}&exercise_id=${exercise.exercise_id}&duration=${exercise.duration_minutes}`;
          const videoWindow = window.open(videoPageUrl, '_blank', 'width=1400,height=900');

          if (!videoWindow) {
            alert('Please allow popups for this site to view the exercise video');
          }
        }
      } catch (error) {
        console.error('Failed to generate video token:', error);
        alert('Failed to start video feed. Please try again.');
      }
    } else {
      // For non-plank exercises, show pain modal as before
      setSelectedExercise(exercise);
      setShowPainModal(true);
    }
  };

  const handlePainFeedbackSubmit = async (painFeedback) => {
    try {
      const res = await axios.post("http://127.0.0.1:8000/api/complete-exercise", {
        patient_id: user.user_id,
        exercise_id: selectedExercise.exercise_id,
        pain_feedback: painFeedback
      });

      if (res.data.status === "success") {
        setShowPainModal(false);
        setSelectedExercise(null);

        // Refresh exercise list using appropriate endpoint
        if (groupByDate) {
          const refreshRes = await axios.get(`http://127.0.0.1:8000/api/patient-exercises-advanced/${user.user_id}`);
          if (refreshRes.data.status === "success") {
            const grouped = refreshRes.data.grouped_exercises || {};
            setGroupedExercises(grouped);

            const exerciseList = Object.values(grouped).flat();
            setExercises(exerciseList);

            const pending = exerciseList.filter(ex => ex.status === "pending").length;
            const completed = exerciseList.filter(ex => ex.status === "completed").length;
            const missed = exerciseList.filter(ex => ex.status === "missed").length;
            const totalDuration = exerciseList.reduce((sum, ex) => sum + (ex.duration_minutes || 0), 0);

            setStats({
              total: exerciseList.length,
              pending,
              completed,
              missed,
              totalDuration
            });
          }
        } else {
          const refreshRes = await axios.get(`http://127.0.0.1:8000/api/patient-exercises/${user.user_id}`);
          if (refreshRes.data.status === "success") {
            const exerciseList = refreshRes.data.exercises || [];
            setExercises(exerciseList);
            setGroupedExercises({ "All Exercises": exerciseList });

            const pending = exerciseList.filter(ex => ex.status === "pending").length;
            const completed = exerciseList.filter(ex => ex.status === "completed").length;
            const missed = exerciseList.filter(ex => ex.status === "missed").length;
            const totalDuration = exerciseList.reduce((sum, ex) => sum + (ex.duration_minutes || 0), 0);

            setStats({
              total: exerciseList.length,
              pending,
              completed,
              missed,
              totalDuration
            });
          }
        }
      }
    } catch (err) {
      console.error("Failed to complete exercise", err);
      alert("Failed to complete exercise. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-white p-6">
      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FaDumbbell size={28} className="text-teal-600" />
            My Exercises
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-1 ml-9">
            Track and complete your assigned exercises
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
        <StatCard
          icon={FaDumbbell}
          label="Total Assigned Exercises"
          value={stats.total}
          change={null}
          changeType="positive"
        />
        <StatCard
          icon={FaClock}
          label="Pending"
          value={stats.pending}
          change={null}
          changeType="positive"
        />
        <StatCard
          icon={FaCheckCircle}
          label="Completed"
          value={stats.completed}
          change={null}
          changeType="positive"
        />
        <StatCard
          icon={FaClock}
          label="Assigned Duration"
          value={formatDuration(stats.totalDuration)}
          change={null}
          changeType="positive"
        />
        <StatCard
          icon={FaTimesCircle}
          label="Missed"
          value={stats.missed}
          change={null}
          changeType="negative"
        />
      </div>

      {/* Exercise Table */}
      <div className="bg-[#1e2330] rounded-xl border border-slate-700/50 overflow-hidden shadow-xl">
        <div className="px-4 py-3 border-b border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-200">Exercise List</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {loading ? "Loading..." : `${exercises.length} exercise${exercises.length !== 1 ? 's' : ''} assigned`}
              </p>
            </div>

            {/* Filter and Group Controls */}
            <div className="flex gap-3 items-center">
              {/* Group by Date Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={groupByDate}
                  onChange={(e) => setGroupByDate(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-teal-500 focus:ring-2 focus:ring-teal-500/50 focus:ring-offset-0 cursor-pointer transition-all"
                />
                <span className="text-xs font-medium text-slate-400 group-hover:text-slate-200 transition-colors flex items-center gap-1.5">
                  <FaCalendar className="w-3 h-3" />
                  Group by Date
                </span>
              </label>

              {/* Separator */}
              <div className="h-6 w-px bg-slate-200"></div>

              {/* Filter Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${statusFilter === 'all'
                    ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/30'
                    : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                    }`}
                >
                  All
                </button>
                <button
                  onClick={() => setStatusFilter('pending')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${statusFilter === 'pending'
                    ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/30'
                    : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                    }`}
                >
                  Pending
                </button>
                <button
                  onClick={() => setStatusFilter('completed')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${statusFilter === 'completed'
                    ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/30'
                    : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                    }`}
                >
                  Completed
                </button>
                <button
                  onClick={() => setStatusFilter('missed')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${statusFilter === 'missed'
                    ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                    : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                    }`}
                >
                  Missed
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-400">Loading exercises...</div>
          ) : Object.keys(filteredGroupedExercises).length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              {statusFilter === 'all'
                ? 'No exercises assigned yet'
                : `No ${statusFilter} exercises found`}
            </div>
          ) : (
            groupByDate ? (
              // Grouped by Date View
              <div>
                {Object.entries(filteredGroupedExercises).map(([dateLabel, dateExercises]) => (
                  <div key={dateLabel} className="border-b border-slate-700/30 last:border-b-0">
                    {/* Date Header */}
                    <div className="px-4 py-2 bg-slate-800/30">
                      <h3 className="text-sm font-semibold text-teal-400">{dateLabel}</h3>
                      <p className="text-xs text-slate-500">{dateExercises.length} exercise{dateExercises.length !== 1 ? 's' : ''}</p>
                    </div>

                    {/* Exercises Table for this date */}
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-slate-800/50 border-b border-slate-700/50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300">
                              <div className="flex items-center gap-1.5">
                                <FaHashtag className="w-3 h-3" />
                                <span>Sr No.</span>
                              </div>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300">
                              <div className="flex items-center gap-1.5">
                                <FaDumbbell className="w-3 h-3" />
                                <span>Exercise Name</span>
                              </div>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300">
                              <div className="flex items-center gap-1.5">
                                <FaClock className="w-3 h-3" />
                                <span>Duration</span>
                              </div>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300">
                              <div className="flex items-center gap-1.5">
                                <FaCalendarAlt className="w-3 h-3" />
                                <span>Assigned Date</span>
                              </div>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300">
                              <div className="flex items-center gap-1.5">
                                <FaClock className="w-3 h-3" />
                                <span>Time Left</span>
                              </div>
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-slate-300">
                              <div className="flex items-center justify-center gap-1.5">
                                <FaInfoCircle className="w-3 h-3" />
                                <span>Status</span>
                              </div>
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-slate-300">
                              <div className="flex items-center justify-center gap-1.5">
                                <FaPlay className="w-3 h-3" />
                                <span>Action</span>
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                          {dateExercises.map((exercise, index) => {
                            const status = exercise.status || "pending";
                            const deadline = exercise.deadline ? new Date(exercise.deadline) : null;
                            const timeLeft = deadline ? Math.max(0, Math.floor((deadline - new Date()) / (1000 * 60 * 60))) : 0;

                            const statusConfig = {
                              pending: { bg: "bg-yellow-500/10", text: "text-yellow-400", label: "Pending" },
                              completed: { bg: "bg-teal-500/10", text: "text-teal-400", label: "Completed" },
                              missed: { bg: "bg-red-500/10", text: "text-red-400", label: "Missed" }
                            };

                            const config = statusConfig[status];

                            return (
                              <tr
                                key={index}
                                className="hover:bg-slate-800/50 transition-colors duration-150"
                              >
                                <td className="px-4 py-3">
                                  <span className="text-xs font-medium text-slate-400">{index + 1}</span>
                                </td>
                                <td className="px-4 py-3">
                                  <p className="text-xs font-medium text-slate-200">{exercise.exercise_name}</p>
                                  {exercise.description && (
                                    <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{exercise.description}</p>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-xs text-slate-300">{exercise.duration_minutes} min</span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-xs text-slate-300">
                                    {exercise.assigned_date ? (() => {
                                      const date = new Date(exercise.assigned_date);
                                      const day = date.getDate();
                                      const month = date.toLocaleString('en-US', { month: 'short' });
                                      const year = date.getFullYear();
                                      return `${day}/${month}/${year}`;
                                    })() : 'N/A'}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  {status === "pending" && deadline ? (
                                    <span className={`text-xs font-medium ${timeLeft < 6 ? 'text-red-400' : 'text-slate-300'}`}>
                                      {timeLeft}h remaining
                                    </span>
                                  ) : (
                                    <span className="text-xs text-slate-500">-</span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`px-2 py-1 rounded-full text-[10px] font-medium ${config.bg} ${config.text}`}>
                                    {config.label}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  {status === "pending" ? (
                                    <button
                                      onClick={() => handlePerformExercise(exercise)}
                                      className="px-3 py-1.5 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-lg text-xs font-medium hover:from-teal-600 hover:to-teal-700 transition-all flex items-center gap-1.5 mx-auto shadow-lg shadow-teal-500/30"
                                    >
                                      <FaPlay className="w-3 h-3" />
                                      Perform
                                    </button>
                                  ) : (
                                    <span className="text-xs text-slate-500 text-center block">-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Flat List View (sorted by priority: pending → completed → missed)
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-800/50 border-b border-slate-700/50">
                    <tr>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-300">
                        <div className="flex items-center justify-center gap-1.5">
                          <FaHashtag className="w-3 h-3" />
                          <span>Sr No.</span>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <FaDumbbell className="w-3 h-3" />
                          <span>Exercise Name</span>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <FaClock className="w-3 h-3" />
                          <span>Duration</span>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <FaCalendarAlt className="w-3 h-3" />
                          <span>Assigned Date</span>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <FaClock className="w-3 h-3" />
                          <span>Time Left</span>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-300">
                        <div className="flex items-center justify-center gap-1.5">
                          <FaInfoCircle className="w-3 h-3" />
                          <span>Status</span>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-300">
                        <div className="flex items-center justify-center gap-1.5">
                          <FaPlay className="w-3 h-3" />
                          <span>Action</span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {Object.values(filteredGroupedExercises).flat().map((exercise, index) => {
                      const status = exercise.status || "pending";
                      const deadline = exercise.deadline ? new Date(exercise.deadline) : null;
                      const timeLeft = deadline ? Math.max(0, Math.floor((deadline - new Date()) / (1000 * 60 * 60))) : 0;

                      const statusConfig = {
                        pending: { bg: "bg-yellow-500/10", text: "text-yellow-400", label: "Pending" },
                        completed: { bg: "bg-teal-500/10", text: "text-teal-400", label: "Completed" },
                        missed: { bg: "bg-red-500/10", text: "text-red-400", label: "Missed" }
                      };

                      const config = statusConfig[status];

                      return (
                        <tr
                          key={index}
                          className="hover:bg-slate-800/50 transition-colors duration-150"
                        >
                          <td className="px-4 py-3">
                            <span className="text-xs font-medium text-slate-400">{index + 1}</span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-xs font-medium text-slate-200">{exercise.exercise_name}</p>
                            {exercise.description && (
                              <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{exercise.description}</p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-slate-300">{exercise.duration_minutes} min</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-slate-300">
                              {exercise.assigned_date ? (() => {
                                const date = new Date(exercise.assigned_date);
                                const day = date.getDate();
                                const month = date.toLocaleString('en-US', { month: 'short' });
                                const year = date.getFullYear();
                                return `${day}/${month}/${year}`;
                              })() : 'N/A'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {status === "pending" && deadline ? (
                              <span className={`text-xs font-medium ${timeLeft < 6 ? 'text-red-400' : 'text-slate-300'}`}>
                                {timeLeft}h remaining
                              </span>
                            ) : (
                              <span className="text-xs text-slate-500">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-medium ${config.bg} ${config.text}`}>
                              {config.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {status === "pending" ? (
                              <button
                                onClick={() => handlePerformExercise(exercise)}
                                className="px-3 py-1.5 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-lg text-xs font-medium hover:from-teal-600 hover:to-teal-700 transition-all flex items-center gap-1.5 mx-auto shadow-lg shadow-teal-500/30"
                              >
                                <FaPlay className="w-3 h-3" />
                                Perform
                              </button>
                            ) : (
                              <span className="text-xs text-slate-500 text-center block">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>

        {/* Pain Feedback Modal */}
        {showPainModal && selectedExercise && (
          <PainFeedbackModal
            exercise={selectedExercise}
            onSubmit={handlePainFeedbackSubmit}
            onClose={() => {
              setShowPainModal(false);
              setSelectedExercise(null);
            }}
          />
        )}
      </div>
    </div>

  );
}
