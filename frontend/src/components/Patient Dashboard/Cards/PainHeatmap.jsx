import React, { useEffect, useState } from "react";
import { BodyComponent as HumanBody } from "@darshanpatel2608/human-body-react";

const BODY_PARTS = [
    "head", "neck",
    "leftShoulder", "rightShoulder",
    "leftArm", "rightArm",
    "chest", "stomach",
    "upperback", "lowerback",
    "leftLeg", "rightLeg",
    "leftKnee", "rightKnee",
    "leftFoot", "rightFoot",
    "leftHand", "rightHand",
];

// Pain positions accurately calibrated - ANATOMICAL FRONT VIEW
// Body's LEFT = Screen RIGHT, Body's RIGHT = Screen LEFT
const PAIN_POSITIONS = {
    // Head & Neck - Center
    head: { x: 50, y: 40, label: "Head", jointX: 150, jointY: 40 },
    neck: { x: 50, y: 110, label: "Neck", jointX: 150, jointY: 110 },

    // LEFT side of body (appears on RIGHT of screen) - x > 140
    leftShoulder: { x: 275, y: 140, label: "L Shoulder", jointX: 210, jointY: 145 },
    leftArm: { x: 290, y: 300, label: "L Arm", jointX: 250, jointY: 280 },
    leftElbow: { x: 365, y: 250, label: "L Elbow", jointX: 240, jointY: 250 },
    leftHand: { x: 315, y: 390, label: "L Hand", jointX: 280, jointY: 360 },

    // RIGHT side of body (appears on LEFT of screen) - x < 140
    rightShoulder: { x: 15, y: 160, label: "R Shoulder", jointX: 105, jointY: 145 },
    rightArm: { x: 30, y: 300, label: "R Arm", jointX: 70, jointY: 280 },
    rightElbow: { x: -60, y: 250, label: "R Elbow", jointX: 80, jointY: 250 },
    rightHand: { x: 5, y: 390, label: "R Hand", jointX: 40, jointY: 360 },

    // Center - torso
    chest: { x: 380, y: 170, label: "Chest", jointX: 180, jointY: 170 },
    stomach: { x: 10, y: 340, label: "Abs", jointX: 160, jointY: 270 },

    upperBack: { x: 280, y: 210, label: "Upper Back", jointX: 160, jointY: 180 },
    lowerBack: { x: 10, y: 210, label: "Lower Back", jointX: 160, jointY: 240 },

    // LEFT leg (appears on RIGHT of screen)
    leftLeg: { x: 265, y: 460, label: "L Thigh", jointX: 195, jointY: 380 },
    leftKnee: { x: 265, y: 540, label: "L Knee", jointX: 180, jointY: 500 },
    leftFoot: { x: 265, y: 630, label: "L Foot", jointX: 180, jointY: 650 },

    // RIGHT leg (appears on LEFT of screen)
    rightLeg: { x: 15, y: 460, label: "R Thigh", jointX: 120, jointY: 380 },
    rightKnee: { x: 15, y: 540, label: "R Knee", jointX: 140, jointY: 500 },
    rightFoot: { x: 15, y: 630, label: "R Foot", jointX: 140, jointY: 650 },
};

export default function PainHeatmap({ userId }) {
    const [bodyData, setBodyData] = useState([]);
    const [painPoints, setPainPoints] = useState([]);
    const [loading, setLoading] = useState(true);

    const scale = 1.0;
    const containerWidth = 280;
    const containerHeight = 450;

    useEffect(() => {
        const fetchPainHistory = async () => {
            try {
                // Fetch pain history with recovery status
                const res = await fetch(`http://127.0.0.1:8000/api/patient-pain-history/${userId}`);
                const data = await res.json();

                if (data.status !== "success") return;

                const painHistory = data.pain_history || [];

                const intensityMap = {};
                const statusMap = {};

                // Map pain history to body parts
                painHistory.forEach(item => {
                    const loc = item.body_part;
                    const status = item.status; // active, recovering, recovered
                    const intensity = item.max_intensity || 5;

                    // Map location to slug and store both intensity and status
                    switch (loc) {
                        case "Head":
                            intensityMap["head"] = Math.max(intensityMap["head"] || 0, intensity);
                            statusMap["head"] = status;
                            break;
                        case "Neck":
                            intensityMap["neck"] = Math.max(intensityMap["neck"] || 0, intensity);
                            statusMap["neck"] = status;
                            break;

                        case "Left Shoulder":
                            intensityMap["leftShoulder"] = Math.max(intensityMap["leftShoulder"] || 0, intensity);
                            statusMap["leftShoulder"] = status;
                            break;
                        case "Right Shoulder":
                            intensityMap["rightShoulder"] = Math.max(intensityMap["rightShoulder"] || 0, intensity);
                            statusMap["rightShoulder"] = status;
                            break;

                        case "Left Elbow":
                            intensityMap["leftElbow"] = Math.max(intensityMap["leftElbow"] || 0, intensity);
                            statusMap["leftElbow"] = status;
                            break;
                        case "Right Elbow":
                            intensityMap["rightElbow"] = Math.max(intensityMap["rightElbow"] || 0, intensity);
                            statusMap["rightElbow"] = status;
                            break;

                        case "Left Forearm":
                            intensityMap["leftArm"] = Math.max(intensityMap["leftArm"] || 0, intensity);
                            statusMap["leftArm"] = status;
                            break;
                        case "Right Forearm":
                            intensityMap["rightArm"] = Math.max(intensityMap["rightArm"] || 0, intensity);
                            statusMap["rightArm"] = status;
                            break;

                        case "Left Hand":
                            intensityMap["leftHand"] = Math.max(intensityMap["leftHand"] || 0, intensity);
                            statusMap["leftHand"] = status;
                            break;

                        case "Right Hand":
                            intensityMap["rightHand"] = Math.max(intensityMap["rightHand"] || 0, intensity);
                            statusMap["rightHand"] = status;
                            break;

                        case "Chest":
                            intensityMap["chest"] = Math.max(intensityMap["chest"] || 0, intensity);
                            statusMap["chest"] = status;
                            break;
                        case "Upper Back":
                            intensityMap["upperBack"] = Math.max(intensityMap["upperBack"] || 0, intensity);
                            statusMap["upperBack"] = status;
                            break;
                        case "Lower Back":
                            intensityMap["lowerBack"] = Math.max(intensityMap["lowerBack"] || 0, intensity);
                            statusMap["lowerBack"] = status;
                            break;
                        case "Abs":
                            intensityMap["stomach"] = Math.max(intensityMap["stomach"] || 0, intensity);
                            statusMap["stomach"] = status;
                            break;

                        case "Left Hip":
                            intensityMap["leftLeg"] = Math.max(intensityMap["leftLeg"] || 0, intensity);
                            statusMap["leftLeg"] = status;
                            break;
                        case "Right Hip":
                            intensityMap["rightLeg"] = Math.max(intensityMap["rightLeg"] || 0, intensity);
                            statusMap["rightLeg"] = status;
                            break;

                        case "Left Thigh":
                            intensityMap["leftLeg"] = Math.max(intensityMap["leftLeg"] || 0, intensity);
                            statusMap["leftLeg"] = status;
                            break;
                        case "Right Thigh":
                            intensityMap["rightLeg"] = Math.max(intensityMap["rightLeg"] || 0, intensity);
                            statusMap["rightLeg"] = status;
                            break;

                        case "Left Knee":
                            intensityMap["leftKnee"] = Math.max(intensityMap["leftKnee"] || 0, intensity);
                            statusMap["leftKnee"] = status;
                            break;
                        case "Right Knee":
                            intensityMap["rightKnee"] = Math.max(intensityMap["rightKnee"] || 0, intensity);
                            statusMap["rightKnee"] = status;
                            break;

                        case "Left Calf":
                            intensityMap["leftLeg"] = Math.max(intensityMap["leftLeg"] || 0, intensity);
                            statusMap["leftLeg"] = status;
                            break;
                        case "Right Calf":
                            intensityMap["rightLeg"] = Math.max(intensityMap["rightLeg"] || 0, intensity);
                            statusMap["rightLeg"] = status;
                            break;

                        case "Left Ankle":
                        case "Left Foot":
                            intensityMap["leftFoot"] = Math.max(intensityMap["leftFoot"] || 0, intensity);
                            statusMap["leftFoot"] = status;
                            break;
                        case "Right Ankle":
                        case "Right Foot":
                            intensityMap["rightFoot"] = Math.max(intensityMap["rightFoot"] || 0, intensity);
                            statusMap["rightFoot"] = status;
                            break;
                        default:
                            console.warn(`Unmapped body part: ${loc}`);
                            break;
                    }
                });


                setBodyData(BODY_PARTS.map(p => ({ slug: p, intensity: intensityMap[p] || 0 })));

                // Create pain point markers with recovery status
                const points = Object.entries(PAIN_POSITIONS)
                    .filter(([part]) => intensityMap[part] > 0)
                    .map(([part, pos]) => ({
                        ...pos,
                        status: getPartStatus(part, statusMap),
                        intensity: intensityMap[part]
                    }));

                setPainPoints(points);

            } catch (e) {
                console.error("Heatmap error:", e);
            } finally {
                setLoading(false);
            }
        };

        if (userId) {
            fetchPainHistory();
        }
    }, [userId]);


    // Helper to determine status from slug - now using direct lookup
    const getPartStatus = (partSlug, statusMap) => {
        // Direct lookup since statusMap now uses slugs as keys
        return statusMap[partSlug] || 'active';
    };

    // Get marker color based on recovery status
    const getMarkerColor = (status) => {
        switch (status) {
            case 'active': return '#ef4444'; // red-500
            case 'recovering': return '#eab308'; // yellow-500
            case 'recovered': return '#22c55e'; // green-500
            default: return '#ef4444';
        }
    };

    const getMarkerGlow = (status) => {
        switch (status) {
            case 'active': return '0 0 12px rgba(239, 68, 68, 0.8), 0 0 20px rgba(239, 68, 68, 0.4)';
            case 'recovering': return '0 0 12px rgba(234, 179, 8, 0.8), 0 0 20px rgba(234, 179, 8, 0.4)';
            case 'recovered': return '0 0 12px rgba(34, 197, 94, 0.8), 0 0 20px rgba(34, 197, 94, 0.4)';
            default: return '0 0 12px rgba(239, 68, 68, 0.8)';
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'active': return '🔴 Active Pain';
            case 'recovering': return '🟡 Recovering';
            case 'recovered': return '🟢 Recovered';
            default: return 'Pain';
        }
    };


    return (
        <div className="relative bg-[#1e2330] rounded-xl shadow-xl p-6 border border-slate-700/50 w-full">
            <h3 className="font-semibold text-xl mb-4 text-slate-200 text-center">Pain Recovery Tracker</h3>

            {/* Anatomical Indicators Header */}

            <div className="flex justify-between w-[270px] mx-auto mb-2">
                <div className="w-8 h-8 flex items-center justify-center bg-slate-800/80 border border-slate-800/50 text-slate-400 text-m font-bold rounded-lg backdrop-blur-sm shadow-sm">
                    R
                </div>
                <div className="w-8 h-8 flex items-center justify-center bg-slate-800/80 border border-slate-800/50 text-slate-400 text-m font-bold rounded-lg backdrop-blur-sm shadow-sm">
                    L
                </div>
            </div>


            {loading ? (
                <div className="h-[700px] flex items-center justify-center">
                    <div className="w-12 h-12 border-4 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
                </div>
            ) : (
                <div className="relative w-[320px] h-[700px] mx-auto">
                    <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}
                    >
                        <HumanBody parts={bodyData} width={containerWidth} height={containerHeight} />
                    </div>

                    {/* Anatomical Indicators (R on left, L on right) */}


                    {/* Pain indicators with enhanced styling */}
                    {painPoints.map((point, idx) => {
                        const scaledX = point.x * scale;
                        const scaledY = point.y * scale;
                        const jointX = point.jointX * scale;
                        const jointY = point.jointY * scale;

                        const dx = jointX - scaledX;
                        const dy = jointY - scaledY;
                        const length = Math.sqrt(dx * dx + dy * dy);
                        const angle = Math.atan2(dy, dx) * (180 / Math.PI);

                        const isRightSide = point.x > 200;
                        const labelOffsetX = isRightSide ? 8 : -75;
                        const markerColor = getMarkerColor(point.status);

                        return (
                            <React.Fragment key={idx}>
                                {/* Glow effect for line */}
                                <div
                                    className="absolute h-[3px] z-10 opacity-40 blur-sm"
                                    style={{
                                        width: `${length}px`,
                                        top: `${scaledY - 1}px`,
                                        left: `${scaledX}px`,
                                        transformOrigin: "top left",
                                        transform: `rotate(${angle}deg)`,
                                        background: `linear-gradient(90deg, ${markerColor}80, ${markerColor}30)`
                                    }}
                                />
                                {/* Main connecting line */}
                                <div
                                    className="absolute h-[2px] z-10"
                                    style={{
                                        width: `${length}px`,
                                        top: `${scaledY}px`,
                                        left: `${scaledX}px`,
                                        transformOrigin: "top left",
                                        transform: `rotate(${angle}deg)`,
                                        background: `linear-gradient(90deg, ${markerColor}, ${markerColor}99)`
                                    }}
                                />
                                {/* Joint marker circle with status color */}
                                <div
                                    className="absolute rounded-full z-20"
                                    style={{
                                        width: '12px',
                                        height: '12px',
                                        top: `${jointY - 6}px`,
                                        left: `${jointX - 6}px`,
                                        background: `radial-gradient(circle, ${markerColor}, ${markerColor}dd)`,
                                        boxShadow: getMarkerGlow(point.status)
                                    }}
                                />
                                {/* Label */}
                                <div
                                    className="absolute text-xs font-bold px-3 py-1.5 rounded-lg shadow-2xl z-20 whitespace-nowrap transition-all duration-200 hover:scale-105"
                                    style={{
                                        top: `${scaledY - 16}px`,
                                        left: `${scaledX + labelOffsetX}px`,
                                        color: markerColor,
                                        background: 'linear-gradient(135deg, rgba(0,0,0,0.9), rgba(0,0,0,0.85))',
                                        border: `1.5px solid ${markerColor}80`,
                                        backdropFilter: 'blur(8px)',
                                        textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                                        boxShadow: `0 4px 12px rgba(0,0,0,0.5), 0 0 20px ${markerColor}40`
                                    }}
                                >
                                    <div>{point.label}</div>
                                </div>
                            </React.Fragment>
                        );
                    })}
                </div>
            )}

            {/* Recovery Legend */}
            <div className="mt-6 flex justify-center gap-6">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-xs text-slate-400">Active (0-2 days)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span className="text-xs text-slate-400">Recovering (3-7 days)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-xs text-slate-400">Recovered (7+ days)</span>
                </div>
            </div>
        </div>
    );
}
