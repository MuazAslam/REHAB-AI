import React, { useState, useRef, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Heart,
    Thermometer,
    Activity,
    Play,
    Square,
    Flame,
    User,
    Clock,
    CheckCircle,
    AlertCircle,
    Timer,
    VideoOff
} from 'lucide-react';

const CaloriesPredictor = () => {
    const { user } = useAuth();
    const webcamRef = useRef(null);
    const wsRef = useRef(null);

    // Cleanup WebSocket on unmount
    useEffect(() => {
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
                console.log("WebSocket connection closed on cleanup");
            }
        };
    }, []);

    // State
    const [duration, setDuration] = useState(1); // minutes
    const [userInfo, setUserInfo] = useState({
        gender: 'Not Specified',
        age: 0,
        height: 0,
        weight: 0
    });

    // Initialize user info from auth context
    useEffect(() => {
        if (user) {
            setUserInfo({
                name: user.user_name || 'Not Specified',
                gender: user.user_gender || 'male',
                age: user.user_age || 0,
                height: user.user_height || 0,
                weight: user.user_weight || 0
            });
        }
    }, [user]);

    const [isRecording, setIsRecording] = useState(false);
    const [progress, setProgress] = useState(0);
    const [stats, setStats] = useState({ heart_rate: 0, temperature: 0, face_detected: false });
    const [finalStats, setFinalStats] = useState(null);
    const [prediction, setPrediction] = useState(null);
    const [statusMessage, setStatusMessage] = useState("");
    const [error, setError] = useState(null);
    const [showResult, setShowResult] = useState(false);
    const [wsConnected, setWsConnected] = useState(false);

    // Configuration
    const videoConstraints = {
        width: 1920,
        height: 1080,
        facingMode: "user"
    };

    // Helper to convert base64 to blob synchronously
    const dataURItoBlob = (dataURI) => {
        const byteString = atob(dataURI.split(',')[1]);
        const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        return new Blob([ab], { type: mimeString });
    };

    // Convert frame to blob and send via WS
    const captureAndSend = useCallback(() => {
        if (!isRecording) return;

        // SAFE GUARD: Check for ref and video readiness
        if (
            webcamRef.current &&
            webcamRef.current.video &&
            webcamRef.current.video.readyState === 4 // HAVE_ENOUGH_DATA
        ) {
            const imageSrc = webcamRef.current.getScreenshot();
            if (imageSrc) {
                try {
                    const blob = dataURItoBlob(imageSrc);
                    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                        wsRef.current.send(blob);
                    }
                } catch (e) {
                    console.error("Frame capture error:", e);
                }
            }
        }
    }, [isRecording]);

    // Loop for sending frames
    useEffect(() => {
        let interval;
        if (isRecording) {
            interval = setInterval(captureAndSend, 100); // 10 FPS
        }
        return () => clearInterval(interval);
    }, [isRecording, captureAndSend]);

    const startRecording = () => {
        setError(null);
        setPrediction(null);
        setFinalStats(null);
        setShowResult(false);
        setProgress(0);
        setStats({ heart_rate: 0, temperature: 0, face_detected: false });

        const ws = new WebSocket('ws://127.0.0.1:8000/ws/calories/vital-signs');
        wsRef.current = ws;

        ws.onopen = () => {
            setWsConnected(true);
            setStatusMessage("Initializing System...");
            setIsRecording(true);

            const config = {
                gender: userInfo.gender,
                age: userInfo.age,
                height: userInfo.height,
                weight: userInfo.weight,
                duration: duration
            };
            ws.send(JSON.stringify(config));
        };

        ws.onclose = () => {
            setWsConnected(false);
            setIsRecording(false);
        };

        ws.onerror = () => {
            setWsConnected(false);
            setError("Connection Failed");
            setIsRecording(false);
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.type === 'stats') {
                setStats({
                    heart_rate: data.heart_rate,
                    temperature: data.temperature,
                    face_detected: data.face_detected
                });
                setProgress(Math.min(data.progress * 100, 100));
                setStatusMessage("Scanning...");
            } else if (data.type === 'status') {
                setStatusMessage(data.message);
                if (data.status === 'predicting') {
                    setIsRecording(false);
                    // Double ensure tracks stop
                    if (webcamRef.current && webcamRef.current.video && webcamRef.current.video.srcObject) {
                        try {
                            webcamRef.current.video.srcObject.getTracks().forEach(track => track.stop());
                        } catch (e) { }
                    }
                }
            } else if (data.type === 'result') {
                if (data.status === 'success') {
                    setPrediction(data.calories);
                    setFinalStats(data.stats);
                    setShowResult(true);
                    ws.close();
                }
            } else if (data.type === 'error') {
                setError(data.message);
                setIsRecording(false);
            }
        };

        ws.onclose = () => {
            // Clean up if needed
        };

        ws.onerror = (e) => {
            console.error(e);
            setError("Connection Error - backend might be offline");
            setIsRecording(false);
        }
    };

    const stopRecording = () => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            console.log("Sending STOP command to backend...");
            wsRef.current.send(JSON.stringify({ type: "STOP" }));
            // Immediately turn off camera and show processing state
            setIsRecording(false);
            setStatusMessage("Analyzing data...");
        } else {
            // Fallback if socket is already closed
            setIsRecording(false);
            setStatusMessage("Stopped");
        }
    };

    // Calculate time left for display
    const getTimeLeft = () => {
        const totalSeconds = duration * 60;
        const remainingSeconds = Math.max(0, Math.ceil(totalSeconds * (1 - progress / 100)));
        const mins = Math.floor(remainingSeconds / 60);
        const secs = remainingSeconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="min-h-screen bg-white p6 lg:p-6">
            <div className="max-w-[1600px] mx-auto">
                {/* Header Section */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 flex items-end justify-between"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-teal-500/10 rounded-xl">
                            <Flame className="text-teal-600 fill-teal-600" size={28} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                                Calories <span className="text-slate-400 font-light">Predictor</span>
                            </h1>
                            <p className="text-slate-500 text-sm font-medium">
                                AI Powered Vital Signs & Metabolic Analysis
                            </p>
                        </div>
                    </div>
                    {/* Status Badge */}
                    <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-full border border-slate-200 shadow-sm">
                        <div className={`w-2.5 h-2.5 rounded-full ${wsConnected ? 'bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.6)]' : 'bg-rose-500'}`} />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                            {wsConnected ? 'System Online' : 'Offline'}
                        </span>
                    </div>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                    {/* Left Column: Sidebar (3 cols) */}
                    <div className="lg:col-span-3 space-y-6">

                        {/* User Profile Card */}
                        <div className="bg-[#1e2330] rounded-2xl p-6 shadow-xl shadow-slate-200/50 border border-slate-800">
                            <div className="flex items-center gap-4 mb-6 border-b border-slate-700/50 pb-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white shadow-lg">
                                    <User size={24} />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-slate-200">{userInfo.name}</h3>
                                    <p className="text-xs text-teal-400 font-bold uppercase tracking-wider">Active Profile</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 hover:bg-slate-800 transition-colors">
                                    <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">HEIGHT</div>
                                    <div className="text-slate-200 text-base font-bold">{userInfo.height} <span className="text-xs text-slate-500 font-medium">cm</span></div>
                                </div>
                                <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 hover:bg-slate-800 transition-colors">
                                    <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">WEIGHT</div>
                                    <div className="text-slate-200 text-base font-bold">{userInfo.weight} <span className="text-xs text-slate-500 font-medium">kg</span></div>
                                </div>
                                <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 hover:bg-slate-800 transition-colors">
                                    <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">AGE</div>
                                    <div className="text-slate-200 text-base font-bold">{userInfo.age}</div>
                                </div>
                                <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 hover:bg-slate-800 transition-colors">
                                    <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">GENDER</div>
                                    <div className="text-slate-200 text-base font-bold capitalize">{userInfo.gender}</div>
                                </div>
                            </div>
                        </div>

                        {/* Controls Card */}
                        <div className="bg-[#1e2330] rounded-2xl p-6 shadow-xl shadow-slate-200/50 border border-slate-800 relative overflow-hidden">

                            <label className="block text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">
                                Analysis Duration (min)
                            </label>
                            <div className="relative mb-6 group">
                                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-teal-400 transition-colors" size={18} />
                                <input
                                    type="number"
                                    min="0.5"
                                    max="60"
                                    step="0.5"
                                    value={duration}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        if (!isNaN(val)) setDuration(val);
                                        else setDuration('');
                                    }}
                                    disabled={isRecording}
                                    className="w-full pl-11 pr-4 py-3.5 bg-slate-900 border border-slate-700 rounded-xl text-base font-bold text-slate-200 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all placeholder-slate-600"
                                />
                            </div>

                            {!isRecording ? (
                                <button
                                    onClick={startRecording}
                                    className="w-full bg-gradient-to-r from-teal-500 to-teal-400 hover:from-teal-400 hover:to-teal-300 text-slate-900 font-bold py-3.5 rounded-xl shadow-lg shadow-teal-500/20 transition-all text-sm flex items-center justify-center gap-2 group active:scale-[0.98]"
                                >
                                    <Play size={18} className="fill-current group-hover:ml-0.5 transition-all" />
                                    Start Analysis
                                </button>
                            ) : (
                                <button
                                    onClick={stopRecording}
                                    className="w-full bg-rose-500/10 border border-rose-500/50 text-rose-400 hover:bg-rose-500/20 font-bold py-3.5 rounded-xl transition-all text-sm flex items-center justify-center gap-2 active:scale-[0.98]"
                                >
                                    <Square size={18} className="fill-current" />
                                    Stop Process
                                </button>
                            )}

                            {/* Status Strip */}
                            <div className="mt-5 flex items-center justify-center min-h-[24px]">
                                {statusMessage && (
                                    <span className="text-xs font-bold text-teal-400 animate-pulse flex items-center gap-2 bg-teal-500/10 px-3 py-1 rounded-full border border-teal-500/20">
                                        <div className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                                        {statusMessage}
                                    </span>
                                )}
                                {error && (
                                    <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">
                                        <AlertCircle size={12} /> {error}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Instructions Removed as per request */}
                    </div>

                    {/* Right Column: Camera & Results (9 cols) */}
                    <div className="lg:col-span-9 space-y-4">

                        <div className="relative bg-[#151922] rounded-2xl overflow-hidden shadow-2xl border border-slate-700/50 aspect-video group">

                            {/* Camera Content Logic */}
                            {!isRecording ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1e2330]">
                                    {!showResult ? (
                                        (statusMessage === "Analyzing data..." || statusMessage === "Calculating calories...") ? (
                                            <div className="text-center">
                                                <div className="w-20 h-20 bg-teal-500/10 rounded-full flex items-center justify-center mb-6 shadow-lg animate-pulse mx-auto border border-teal-500/20">
                                                    <Activity size={32} className="text-teal-400" />
                                                </div>
                                                <h3 className="text-xl font-bold text-slate-200 mb-2">Processing Data...</h3>
                                                <div className="w-48 h-1.5 bg-slate-800 rounded-full mx-auto overflow-hidden">
                                                    <div className="h-full bg-teal-500 animate-progress w-full origin-left" />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center p-8">
                                                <div className="w-20 h-20 bg-slate-800/50 rounded-2xl flex items-center justify-center mb-6 border border-slate-700/50 mx-auto transition-all group-hover:scale-110 group-hover:border-teal-500/30">
                                                    <Activity size={40} className="text-slate-500 group-hover:text-teal-400 transition-colors" />
                                                </div>
                                                <h3 className="text-xl font-bold text-slate-200 mb-2">Camera Feed</h3>
                                                <p className="text-sm text-slate-500 max-w-sm mx-auto">
                                                    Ready to start. Click "Start Analysis" when you are positioned correctly.
                                                </p>
                                            </div>
                                        )
                                    ) : (
                                        // Result Shown (Camera Off)
                                        <div className="text-center">
                                            <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mb-4 mx-auto border border-slate-700/50">
                                                <VideoOff size={32} className="text-slate-500" />
                                            </div>
                                            <p className="text-sm text-slate-500 font-medium">Camera Deactivated</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <Webcam
                                        ref={webcamRef}
                                        audio={false}
                                        screenshotFormat="image/jpeg"
                                        videoConstraints={videoConstraints}
                                        className="w-full h-full object-cover opacity-90"
                                    />

                                    {/* Sleek Overlays */}
                                    <>
                                        {/* Metrics Strip - Top Left */}
                                        <div className="absolute top-6 left-6 flex flex-col gap-3">
                                            <div className="bg-black/60 backdrop-blur-md rounded-xl px-4 py-3 border border-white/5 flex items-center gap-4 w-40 transform transition-transform hover:scale-105">
                                                <Heart className="text-rose-500 fill-current animate-pulse" size={18} />
                                                <div>
                                                    <div className="text-xl font-bold text-white leading-none">
                                                        {stats.heart_rate || '--'}
                                                    </div>
                                                    <div className="text-[10px] font-bold text-white/40 uppercase mt-0.5">BPM</div>
                                                </div>
                                            </div>
                                            <div className="bg-black/60 backdrop-blur-md rounded-xl px-4 py-3 border border-white/5 flex items-center gap-4 w-40 transform transition-transform hover:scale-105">
                                                <Thermometer className="text-amber-500" size={18} />
                                                <div>
                                                    <div className="text-xl font-bold text-white leading-none">
                                                        {stats.temperature || '--'}
                                                    </div>
                                                    <div className="text-[10px] font-bold text-white/40 uppercase mt-0.5">Temp °C</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Warnings */}
                                        {!stats.face_detected && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-20">
                                                <div className="text-center bg-black/40 p-6 rounded-2xl border border-rose-500/20 backdrop-blur-md">
                                                    <User size={32} className="text-rose-500 mx-auto mb-3" />
                                                    <p className="text-rose-400 text-sm font-bold uppercase tracking-wider">Face Not Detected</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Timer - Bottom Center */}
                                        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 flex flex-col items-center">
                                            <div className="text-5xl font-black text-white/90 font-mono tracking-widest drop-shadow-2xl">
                                                {getTimeLeft()}
                                            </div>
                                            <div className="text-[10px] font-bold text-teal-400 uppercase tracking-widest mt-2 bg-black/40 px-3 py-1 rounded-full">Time Remaining</div>
                                        </div>

                                        {/* Progress Bar - Bottom */}
                                        <div className="absolute bottom-0 left-0 h-1 bg-white/5 w-full">
                                            <motion.div
                                                className="h-full bg-teal-500 shadow-[0_0_15px_rgba(20,184,166,0.8)]"
                                                initial={{ width: 0 }}
                                                animate={{ width: `${progress}%` }}
                                                transition={{ ease: "linear" }}
                                            />
                                        </div>
                                    </>
                                </>
                            )}
                        </div>

                        {/* Final Result Card - Standard Size */}
                        <AnimatePresence>
                            {showResult && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="bg-[#1e2330] rounded-2xl p-6 shadow-2xl border border-slate-700/50 flex flex-col md:flex-row items-center justify-between gap-8"
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="bg-teal-500/10 p-2 rounded-full">
                                                <CheckCircle className="text-teal-400" size={20} />
                                            </div>
                                            <span className="text-slate-400 font-bold uppercase tracking-wider text-xs">Assessment Complete</span>
                                        </div>

                                        <div className="flex gap-10 mt-2">
                                            <div>
                                                <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Avg Heart Rate</div>
                                                <div className="text-2xl font-bold text-slate-200">{finalStats?.heart_rate?.toFixed(0) || '--'} <span className="text-sm text-slate-500 font-medium">BPM</span></div>
                                            </div>
                                            <div>
                                                <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Avg Temp</div>
                                                <div className="text-2xl font-bold text-slate-200">{finalStats?.temperature?.toFixed(1) || '--'} <span className="text-sm text-slate-500 font-medium">°C</span></div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-8">
                                        <div className="text-right">
                                            <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Total Energy Burn</div>
                                            <div className="flex items-baseline justify-end gap-2">
                                                <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-teal-200">
                                                    {prediction?.toFixed(1)}
                                                </div>
                                                <span className="text-slate-500 text-lg font-medium">kcal</span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => setShowResult(false)}
                                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold py-3 px-6 rounded-xl transition-all text-xs uppercase tracking-wider shadow-md hover:shadow-lg h-fit"
                                        >
                                            Dismiss Result
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CaloriesPredictor;
