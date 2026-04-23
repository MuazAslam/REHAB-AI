import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Webcam from 'react-webcam';
import { motion, AnimatePresence } from "framer-motion";
import PainFeedbackModal from './PainFeedbackModal';

// Helper to dynamically load scripts
const loadScript = (src) => {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.crossOrigin = "anonymous";
        script.onload = () => resolve();
        script.onerror = (e) => reject(e);
        document.body.appendChild(script);
    });
};

export default function ExerciseVideoFeed() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [token, setToken] = useState(null);
    const [showCompleteModal, setShowCompleteModal] = useState(false);
    const [showPainModal, setShowPainModal] = useState(false);
    const [isExiting, setIsExiting] = useState(false); // State for page exit animation
    const [error, setError] = useState(null);
    const [isVideoLoaded, setIsVideoLoaded] = useState(false);
    const [isScriptsLoaded, setIsScriptsLoaded] = useState(false);

    // MediaPipe & WebSocket Refs
    const webcamRef = useRef(null);
    const canvasRef = useRef(null);
    const wsRef = useRef(null);
    const cameraRef = useRef(null);
    const poseRef = useRef(null);

    const [metrics, setMetrics] = useState({
        fps: 0,
        position: "Waiting...",
        position_confidence: 0,
        in_position: false,
        buffer_percent: 0,
        prediction_count: 0,
        current_prediction: null,
        current_confidence: 0,
        feedback: "Align your body to start...",
        summary: null,
        // Smart Start State
        session_active: false,
        alignment_status: 'waiting', // waiting, aligning
        countdown: 3,
        visibility_error: false,
        showInstructions: true // New State for Modal
    });

    // Timer State
    const [timeLeft, setTimeLeft] = useState(null); // In seconds
    const timerRef = useRef(null);


    // Ref to access latest metrics inside MediaPipe callbacks (avoids stale closures)
    const metricsRef = useRef(metrics);
    useEffect(() => {
        metricsRef.current = metrics;
    }, [metrics]);

    // Initialize Token & Timer
    useEffect(() => {
        const tokenParam = searchParams.get('token');
        const durationParam = searchParams.get('duration');

        if (!tokenParam) {
            setError('No access token provided');
            navigate('/exercises');
            return;
        }
        setToken(tokenParam);

        // Initialize Timer from URL duration (minutes -> seconds)
        if (durationParam) {
            setTimeLeft(parseFloat(durationParam) * 60);
        } else {
            setTimeLeft(60); // Default 1 min if missing
        }
    }, [searchParams, navigate]);

    // Initialize WebSocket
    useEffect(() => {
        if (!token) return;

        // Connect directly to ML server on port 8001
        const wsUrl = `ws://127.0.0.1:8001/ws/pose-analysis/${token}`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log("WebSocket Connected");
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            setMetrics(prev => ({
                ...prev,
                ...data,
                fps: 30,
                // Persist last prediction if new one is null
                current_prediction: data.current_prediction !== null ? data.current_prediction : prev.current_prediction,
                current_confidence: data.current_prediction !== null ? data.current_confidence : prev.current_confidence
            }));
        };

        ws.onerror = (error) => {
            console.error("WebSocket Error:", error);
            // If socket fails (likely 403/invalid token), redirect immediately so user can get a new one
            navigate('/exercises');
        };

        ws.onclose = (event) => {
            console.log("WebSocket Disconnected", event.code);
            if (event.code === 1006 || event.code === 4001) { // Abnormal closure or Unauthorized
                navigate('/exercises');
            }
        };

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [token]);

    // Load MediaPipe Scripts
    useEffect(() => {
        const loadScripts = async () => {
            try {
                // Ensure scripts are loaded in order
                if (!window.Pose) await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js");
                if (!window.drawConnectors) await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js");
                if (!window.Camera) await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js");

                setIsScriptsLoaded(true);
                console.log("MediaPipe scripts loaded via CDN");
            } catch (err) {
                console.error("Failed to load MediaPipe scripts:", err);
                setError("Failed to load AI Vision components (CDN)");
            }
        };

        loadScripts();
    }, []);

    // Cleanup function
    useEffect(() => {
        return () => {
            if (poseRef.current) {
                poseRef.current.close();
            }
            if (cameraRef.current) {
                cameraRef.current.stop();
            }
        };
    }, []);

    // SMOOTH TIMER LOGIC
    useEffect(() => {
        if (metrics.session_active && timeLeft !== null && timeLeft > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current);
                        handleAutoComplete();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000); // 1-second interval for standard countdown logic
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [metrics.session_active]);

    // Initialize MediaPipe Logic (Run once scripts match and webcam is ready)
    useEffect(() => {
        if (!isScriptsLoaded || !webcamRef.current || !webcamRef.current.video) return;
        if (poseRef.current) return; // Already initialized

        try {
            const Pose = window.Pose;
            const Camera = window.Camera;

            if (!Pose || !Camera) {
                console.error("Pose or Camera not found in window");
                return;
            }

            const pose = new Pose({
                locateFile: (file) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
                }
            });

            pose.setOptions({
                modelComplexity: 1,
                smoothLandmarks: true,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });

            pose.onResults((results) => {
                setIsVideoLoaded(true);

                if (canvasRef.current && canvasRef.current.getContext) {
                    const ctx = canvasRef.current.getContext('2d');
                    const { width, height } = canvasRef.current;

                    ctx.save();
                    ctx.clearRect(0, 0, width, height);

                    if (results.poseLandmarks) {
                        const landmarks = results.poseLandmarks;

                        // --- SMART START ALIGNMENT LOGIC ---

                        setMetrics(prev => {
                            // 0. Instructions Open: Do nothing until user starts
                            if (prev.showInstructions) {
                                return prev;
                            }

                            // 1. Session Active: Just let it run
                            if (prev.session_active) {
                                return prev;
                            }

                            // 2. Pre-Session: Auto-Start (Simplified Mode)
                            // Immediately transition to countdown when we detect any pose data (load complete)
                            if (prev.alignment_status === 'waiting') {
                                return {
                                    ...prev,
                                    alignment_status: 'preparing',
                                    countdown: 5, // 5 seconds to get into position
                                    feedback: "Get into Position! Starting in 5..."
                                };
                            }

                            // 3. Pre-Session: Preparation Countdown
                            if (prev.alignment_status === 'preparing') {
                                const newCountdown = prev.countdown - (1 / 30);
                                if (newCountdown <= 0) {
                                    return {
                                        ...prev,
                                        session_active: true,
                                        alignment_status: 'active',
                                        countdown: 0,
                                        feedback: "Session Started! Maintain form."
                                    };
                                }
                                return { ...prev, countdown: newCountdown };
                            }

                            return prev;
                        });

                        // Check Ref for activity status to avoid stale closure
                        if (metricsRef.current.session_active && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                            wsRef.current.send(JSON.stringify(results.poseLandmarks));
                        }

                        // 1. Draw Connections/Bones
                        if (window.POSE_CONNECTIONS) {
                            ctx.save();
                            ctx.lineWidth = 15;
                            ctx.lineCap = 'round';
                            ctx.lineJoin = 'round';
                            ctx.strokeStyle = '#2dd4bf'; // Teal-400 equivalent
                            ctx.shadowColor = 'rgba(45, 212, 191, 0.5)'; // Glow effect
                            ctx.shadowBlur = 15;

                            for (const connection of window.POSE_CONNECTIONS) {
                                const startIdx = connection[0];
                                const endIdx = connection[1];
                                const startPt = landmarks[startIdx];
                                const endPt = landmarks[endIdx];

                                // Skip visibility check for simplicity or add if needed (lm.visibility > 0.5)
                                if (startPt && endPt) {
                                    ctx.beginPath();
                                    ctx.moveTo(startPt.x * width, startPt.y * height);
                                    ctx.lineTo(endPt.x * width, endPt.y * height);
                                    ctx.stroke();
                                }
                            }
                            ctx.restore();
                        }

                        // 2. Draw Landmarks/Joints (Overlay style)
                        for (let i = 0; i < landmarks.length; i++) {
                            const lm = landmarks[i];
                            // Skip facial landmarks 1-10 for cleaner look? Keeping for now but making them smaller.
                            // Body landmarks are > 10
                            const isBody = i > 10;
                            const radius = isBody ? 12 : 6;

                            if (lm.visibility !== undefined && lm.visibility < 0.5) continue;

                            ctx.beginPath();
                            ctx.arc(lm.x * width, lm.y * height, radius, 0, 2 * Math.PI);

                            // White fill
                            ctx.fillStyle = '#FFFFFF';
                            ctx.fill();

                            // Teal border
                            ctx.lineWidth = isBody ? 5 : 3;
                            ctx.strokeStyle = '#2dd4bf';
                            ctx.stroke();
                        }
                    }
                    ctx.restore();
                }
            });

            poseRef.current = pose;

            // Start Camera
            const camera = new Camera(webcamRef.current.video, {
                onFrame: async () => {
                    if (poseRef.current) {
                        await poseRef.current.send({ image: webcamRef.current.video });
                    }
                },
                width: 1920,
                height: 1080
            });
            camera.start();
            cameraRef.current = camera;

        } catch (e) {
            console.error("Error initializing MediaPipe:", e);
        }

    }, [isScriptsLoaded, webcamRef]);

    // Utility Handlers
    // Utility Handlers
    const handleCompleteExercise = () => {
        // "End Session Early" - Exit without saving.
        // Confirm before exit? For now, just exit as requested.
        const confirmExit = window.confirm("End session early? No data will be saved.");
        if (confirmExit) {
            window.close(); // Attempt to close window
            // Fallback if blocked
            setTimeout(() => navigate('/exercises'), 100);
        }
    };

    const handleAutoComplete = () => {
        // Automatically triggered when timer hits 0
        setMetrics(prev => ({ ...prev, session_active: false }));
        setShowPainModal(true);
    };

    const handlePainSubmit = (painFeedback) => {
        console.log("Submitting Pain Feedback:", painFeedback);

        // 1. Send completion signal WITH pain data
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                command: "complete_session",
                pain_data: painFeedback
            }));
        }

        // 2. Trigger Exit Animation
        setShowPainModal(false);
        // setIsExiting(true); // Don't exit yet! Wait for server confirmation.

        // setMetrics(prev => ({ ...prev, position: "Saving Session Data..." })); 
    };

    if (error) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="bg-red-500/10 border border-red-500 rounded-lg p-8 max-w-md text-center">
                    <h2 className="text-2xl font-bold text-red-400 mb-4">Access Denied</h2>
                    <p className="text-red-300 mb-4">{error}</p>
                    <p className="text-gray-400 text-sm">Redirecting to exercises...</p>
                </div>
            </div>
        );
    }

    if (!token) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-white">Loading...</div>
            </div>
        );
    }

    return (
        <AnimatePresence>
            {!isExiting && (
                <motion.div
                    className="h-screen bg-gray-900 flex overflow-hidden"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
                    transition={{ duration: 0.5 }}
                >
                    {/* Left Panel - Controls & Guidelines (35%) */}
                    <div className="w-[35%] flex flex-col border-r border-gray-800 bg-gray-900/95 backdrop-blur z-10">
                        {/* Header Section */}
                        <div className="p-6 border-b border-gray-800">
                            <h1 className="text-2xl font-bold text-white mb-2">Plank Analysis</h1>
                            <div className="flex items-center justify-between">
                                {/* Status Badge */}
                                {metrics && (
                                    <span className="text-xs font-mono text-gray-500 bg-gray-800 px-2 py-1 rounded">
                                        Status: {wsRef.current?.readyState === 1 ? 'CONNECTED' : 'CONNECTING'}
                                    </span>
                                )}

                                {/* LIVE TIMER DISPLAY */}
                                {timeLeft !== null && (
                                    <div className="flex items-center gap-2 bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-700">
                                        <span className={`text-sm font-mono font-bold ${timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-teal-400'}`}>
                                            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                                        </span>
                                        <span className="text-xs text-gray-500 uppercase">Remaining</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">

                            {/* LIVE METRICS CARD */}
                            <div className="space-y-4">
                                {/* Position Status */}
                                <div className={`rounded-xl p-5 border ${metrics.in_position ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'} transition-colors duration-300`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className={`font-bold text-lg ${metrics.in_position ? 'text-green-400' : 'text-red-400'}`}>
                                            {metrics.position}
                                        </h3>

                                    </div>
                                    <p className="text-sm text-gray-300 mb-3">
                                        {metrics.feedback || "Align your body to start..."}
                                    </p>
                                    {/* Buffer Progress */}
                                    <div className="w-full bg-gray-700/50 rounded-full h-1.5 mb-1">
                                        <div
                                            className={`h-1.5 rounded-full transition-all duration-300 ${metrics.buffer_percent >= 100 ? 'bg-blue-500' : 'bg-gray-500'}`}
                                            style={{ width: `${Math.min(metrics.buffer_percent, 100)}%` }}
                                        ></div>
                                    </div>
                                    <div className="flex justify-between text-xs text-gray-500">
                                        <span>Analysis Buffer</span>
                                        <span>{metrics.buffer_percent}%</span>
                                    </div>
                                </div>

                                {/* Prediction Stats */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
                                        <span className="text-gray-400 text-xs uppercase tracking-wider block mb-1">Predictions</span>
                                        <span className="text-2xl font-bold text-white">{metrics.prediction_count}</span>
                                    </div>
                                    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
                                        <span className="text-gray-400 text-xs uppercase tracking-wider block mb-1">Last Result</span>
                                        {metrics.current_prediction !== null ? (

                                            <span className={`text-lg font-bold ${metrics.current_prediction === 1 ? 'text-green-400' : 'text-red-400'}`}>
                                                {metrics.current_prediction === 1 ? 'AVERAGE' : 'NOT AVG'} ({metrics.current_confidence}%)
                                            </span>
                                        ) : (
                                            <span className="text-lg text-gray-500">Waiting...</span>
                                        )}
                                    </div>
                                </div>

                                {/* Summary Stats */}
                                {metrics.summary && (
                                    <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/30 font-mono">
                                        <h4 className="text-gray-400 text-xs uppercase tracking-wider mb-3 font-sans">Session Summary</h4>

                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm text-gray-400">Average Form</span>
                                            <span className="text-sm font-bold text-green-400">
                                                {metrics.summary.average_count} ({metrics.summary.average_percentage.toFixed(1)}%)
                                            </span>
                                        </div>

                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm text-gray-400">Not Average</span>
                                            <span className="text-sm font-bold text-red-400">
                                                {metrics.summary.not_average_count}
                                            </span>
                                        </div>

                                        <div className="flex justify-between items-center pt-2 border-t border-gray-700/50">
                                            <span className="text-sm text-gray-400">Avg Confidence</span>
                                            <span className="text-blue-400 font-bold">{(metrics.summary.avg_confidence * 100).toFixed(0)}%</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Instructions Title */}
                            <div className="pt-4 border-t border-gray-800">
                                <h4 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-4">Detection Checklist</h4>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 text-sm text-gray-400">
                                        <span className={`w-2 h-2 rounded-full ${metrics?.in_position ? 'bg-green-500' : 'bg-gray-600'}`}></span>
                                        1. Wrists on ground
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-gray-400">
                                        <span className={`w-2 h-2 rounded-full ${metrics?.in_position ? 'bg-green-500' : 'bg-gray-600'}`}></span>
                                        2. Elbows under body
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-gray-400">
                                        <span className={`w-2 h-2 rounded-full ${metrics?.in_position ? 'bg-green-500' : 'bg-gray-600'}`}></span>
                                        3. Head aligned forward
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer Controls */}
                        <div className="p-6 border-t border-gray-800 bg-gray-900">
                            {/* Only show 'Finish Early' if session active, otherwise hidden/disabled */}
                            <button
                                onClick={handleCompleteExercise}
                                className="w-full py-4 bg-gray-800 hover:bg-red-500/10 text-gray-400 hover:text-red-400 rounded-xl font-semibold border border-gray-700 hover:border-red-500/50 transition-all flex items-center justify-center gap-2 group"
                            >
                                <span>End Session Early</span>
                                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Right Panel - Video Feed (65%) */}
                    <div className="flex-1 bg-black relative flex items-center justify-center p-4">
                        {/* Background Pattern */}
                        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, gray 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>

                        <div className="relative w-full h-full flex items-center justify-center">
                            <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl border border-gray-800 bg-gray-900">
                                {/* Webcam Component */}
                                <Webcam
                                    ref={webcamRef}
                                    audio={false}
                                    className="absolute top-0 left-0 w-full h-full object-contain"
                                    style={{ visibility: isVideoLoaded ? 'visible' : 'hidden' }}
                                />

                                {/* Canvas for Skeleton Overlay */}
                                <canvas
                                    ref={canvasRef}
                                    className="absolute top-0 left-0 w-full h-full object-contain"
                                    width={2560}
                                    height={1440}
                                />

                                {/* LIVE TIMER OVERLAY */}
                                {timeLeft !== null && metrics.session_active && (
                                    <div className="absolute top-6 right-6 z-30 flex flex-col items-end pointer-events-none">
                                        <div className="bg-black/60 backdrop-blur-md text-white px-6 py-3 rounded-2xl border border-white/10 shadow-2xl">
                                            <span className={`text-4xl font-mono font-bold tracking-widest ${timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-teal-400'}`}>
                                                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                                            </span>
                                        </div>
                                        <span className="text-white/80 text-xs uppercase font-bold tracking-widest mt-2 mr-1 text-shadow-sm">Session Time</span>
                                    </div>
                                )}

                                {/* Loading State Overlay */}
                                {!isVideoLoaded && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 z-20">
                                        <div className="relative">
                                            <div className="w-16 h-16 border-4 border-gray-800 border-t-teal-500 rounded-full animate-spin"></div>
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="w-8 h-8 bg-gray-800 rounded-full"></div>
                                            </div>
                                        </div>
                                        <h3 className="text-white font-medium mt-6 text-lg">Initializing AI Vision...</h3>
                                        <p className="text-gray-500 text-sm mt-2">Please allow camera access</p>
                                    </div>
                                )}

                                {/* INSTRUCTION MODAL */}
                                {metrics.showInstructions && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900/95 z-50 backdrop-blur-md p-4 animate-in fade-in duration-300">
                                        <div className="bg-gray-800 border-2 border-teal-500/30 rounded-3xl w-full h-[95%] max-w-[95%] shadow-2xl relative overflow-hidden flex flex-col md:flex-row">
                                            {/* Background Decor */}
                                            <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl"></div>
                                            <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl"></div>

                                            {/* Left: Visual Guide */}
                                            <div className="w-full md:w-3/5 p-8 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-teal-500/20 relative group">
                                                <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden border-2 border-teal-500/30 shadow-lg group-hover:shadow-teal-500/20 transition-all duration-500">
                                                    <img
                                                        src="/assets/plank_guide_v2.png"
                                                        alt="Physiotherapist Reference Guide"
                                                        className="w-full h-full object-contain bg-white"
                                                    />

                                                    <div className="absolute bottom-4 left-4 z-20">
                                                        <span className="px-3 py-1 bg-teal-500 text-white text-xs font-bold uppercase tracking-wider rounded-md shadow-lg">Clinical Standard</span>
                                                    </div>
                                                </div>
                                                <p className="text-gray-400 text-xs mt-4 text-center max-w-sm italic">"Neutral spine, engaged core, shoulders away from ears."</p>
                                            </div>

                                            {/* Right: Physiotherapist Instructions */}
                                            <div className="w-full md:w-2/5 p-8 flex flex-col justify-center relative z-10">
                                                <div className="text-left mb-6">
                                                    <h2 className="text-2xl font-bold text-white mb-1">Clinic Protocol</h2>
                                                    <p className="text-teal-400 text-sm font-medium">PHYSIOTHERAPIST GUIDANCE</p>
                                                </div>

                                                <div className="space-y-4 mb-8">
                                                    <div className="flex gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors group">
                                                        <div className="w-10 h-10 flex-shrink-0 bg-gray-800 text-teal-400 rounded-full flex items-center justify-center font-bold border border-teal-500/30 shadow-sm group-hover:bg-teal-500/10 transition-colors">1</div>
                                                        <div>
                                                            <h4 className="text-white font-semibold">Camera Setup (Front View)</h4>
                                                            <p className="text-sm text-gray-400">Place camera directly in front. Ensure full body length is visible.</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors group">
                                                        <div className="w-10 h-10 flex-shrink-0 bg-gray-800 text-teal-400 rounded-full flex items-center justify-center font-bold border border-teal-500/30 shadow-sm group-hover:bg-teal-500/10 transition-colors">2</div>
                                                        <div>
                                                            <h4 className="text-white font-semibold">Engage Core & Glutes</h4>
                                                            <p className="text-sm text-gray-400">Draw navel to spine. Squeeze glutes. Avoid sagging hips.</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors group">
                                                        <div className="w-10 h-10 flex-shrink-0 bg-gray-800 text-teal-400 rounded-full flex items-center justify-center font-bold border border-teal-500/30 shadow-sm group-hover:bg-teal-500/10 transition-colors">3</div>
                                                        <div>
                                                            <h4 className="text-white font-semibold">Shoulder Stability</h4>
                                                            <p className="text-sm text-gray-400">Keep elbows under shoulders. Press away from floor. Neck neutral.</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => setMetrics(prev => ({ ...prev, showInstructions: false }))}
                                                    className="w-full py-4 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 text-white text-lg font-bold rounded-xl shadow-lg shadow-teal-500/20 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                                                >
                                                    <span>Begin Assessment</span>
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* SMART START OVERLAYS */}
                                {isVideoLoaded && !metrics.session_active && !metrics.showInstructions && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-30 backdrop-blur-sm transition-all duration-300">
                                        <div className="text-center animate-pulse">
                                            <div className="text-8xl font-black text-teal-400 mb-4">{Math.ceil(metrics.countdown)}</div>
                                            <h3 className="text-3xl font-bold text-white mb-2">Get into Position!</h3>
                                            <p className="text-teal-200">Exercise starting soon...</p>
                                        </div>
                                    </div>
                                )}

                                {/* SESSION ACTIVE - VISIBILITY ERROR OVERLAY */}
                                {metrics.session_active && metrics.visibility_error && (
                                    <div className="absolute top-16 left-1/2 transform -translate-x-1/2 bg-red-500/90 text-white px-6 py-3 rounded-full font-bold shadow-xl z-30 animate-bounce flex items-center gap-2">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                        <span>User Not Fully Visible!</span>
                                    </div>
                                )}

                                {/* Overlay: Live Badge */}
                                {isVideoLoaded && (
                                    <div className="absolute top-4 left-4 flex gap-2 z-30">
                                        <span className={`px-3 py-1 ${metrics.session_active ? 'bg-red-500/90' : 'bg-gray-600'} text-white text-xs font-bold rounded flex items-center gap-1.5 shadow-lg backdrop-blur-sm transition-colors`}>
                                            <span className={`w-2 h-2 bg-white rounded-full ${metrics.session_active ? 'animate-pulse' : ''}`}></span>
                                            {metrics.session_active ? 'LIVE' : 'STANDBY'}
                                        </span>
                                        <span className="px-3 py-1 bg-black/60 text-gray-300 text-xs font-medium rounded backdrop-blur-sm border border-white/10">
                                            Client-Side AI
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Pain Feedback Modal */}
                    {showPainModal && (
                        <PainFeedbackModal
                            exercise={{ exercise_name: "Plank Analysis" }}
                            onSubmit={handlePainSubmit}
                            onClose={() => setShowPainModal(false)}
                        />
                    )}

                    {/* Complete Exercise Modal */}
                    {showCompleteModal && (
                        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                            <div className="bg-gray-800 rounded-2xl border border-gray-700 p-8 max-w-md w-full shadow-2xl transform scale-100 transition-all">
                                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>

                                <h2 className="text-2xl font-bold text-white mb-2 text-center">Session Complete!</h2>
                                <p className="text-gray-400 mb-8 text-center text-sm">Great job keeping up your streak. Your form data has been recorded.</p>

                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setShowCompleteModal(false)}
                                        className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors"
                                    >
                                        Resume
                                    </button>
                                    <button
                                        onClick={() => window.close()}
                                        className="px-4 py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-medium transition-colors shadow-lg shadow-teal-500/20"
                                    >
                                        Close & Return
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
