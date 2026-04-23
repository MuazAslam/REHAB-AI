import { motion } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "../../context/AuthContext";

export default function PatientWelcome({ onComplete }) {
  const { user } = useAuth();
  const [audioLevel, setAudioLevel] = useState(0);
  const animationFrameRef = useRef(null);

  const profilePicUrl = `http://localhost:8000/static/profile_pics/${user.user_image}`

  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 2500);

    // Simulate voice activity with random audio levels
    let phase = 0;

    const animate = () => {
      phase += 0.1;
      const level = Math.sin(phase) * 0.5 + 0.5;
      setAudioLevel(level);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      clearTimeout(timer);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [onComplete]);

  // Generate wave bars around the circle
  const generateWaveBars = (count, radius, heightMultiplier) => {
    const bars = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const baseHeight = 2;
      const dynamicHeight = baseHeight + (Math.sin(angle * 3 + audioLevel * 10) * heightMultiplier * audioLevel);
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      bars.push(
        <motion.div
          key={`bar-${radius}-${i}`}
          className="absolute bg-cyan-400"
          style={{
            left: '50%',
            top: '50%',
            width: '2px',
            height: `${dynamicHeight}px`,
            transformOrigin: 'center',
            transform: `translate(-50%, -50%) rotate(${angle}rad) translateY(${-radius}px)`,
            opacity: 0.6 + audioLevel * 0.4,
            boxShadow: '0 0 4px rgba(34, 211, 238, 0.8)'
          }}
          animate={{
            height: `${dynamicHeight}px`,
            opacity: 0.6 + audioLevel * 0.4,
          }}
          transition={{
            duration: 0.1,
            ease: "easeOut"
          }}
        />
      );
    }
    return bars;
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="flex flex-col items-center"
      >
        {/* Avatar with voice animation */}
        <div className="relative">
          {/* Outer glow effect */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              width: '160px',
              height: '160px',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'radial-gradient(circle, rgba(34, 211, 238, 0.3) 0%, transparent 70%)',
              filter: 'blur(20px)',
            }}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />

          {/* Voice wave visualization container */}
          <div className="relative w-80 h-80 flex items-center justify-center">
            {/* Inner waves - closer to center */}
            <div className="absolute inset-0">
              {generateWaveBars(60, 80, 8)}
            </div>

            {/* Middle waves */}
            <div className="absolute inset-0">
              {generateWaveBars(80, 100, 12)}
            </div>

            {/* Outer waves */}
            <div className="absolute inset-0">
              {generateWaveBars(100, 120, 16)}
            </div>

            {/* Central ring with gradient border */}
            <motion.div
              className="absolute rounded-full border-2 bg-slate-900"
              style={{
                width: '140px',
                height: '140px',
                borderColor: 'rgba(34, 211, 238, 0.6)',
                boxShadow: '0 0 30px rgba(34, 211, 238, 0.4), inset 0 0 30px rgba(34, 211, 238, 0.2)',
              }}
              animate={{
                borderColor: [
                  'rgba(34, 211, 238, 0.6)',
                  'rgba(96, 165, 250, 0.8)',
                  'rgba(34, 211, 238, 0.6)',
                ],
                boxShadow: [
                  '0 0 30px rgba(34, 211, 238, 0.4), inset 0 0 30px rgba(34, 211, 238, 0.2)',
                  '0 0 40px rgba(96, 165, 250, 0.6), inset 0 0 40px rgba(96, 165, 250, 0.3)',
                  '0 0 30px rgba(34, 211, 238, 0.4), inset 0 0 30px rgba(34, 211, 238, 0.2)',
                ],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              {/* Profile image */}
              <img
                src={profilePicUrl}
                alt="User"
                className="w-full h-full rounded-full object-cover"
              />
            </motion.div>

            {/* Accent arc */}
            <motion.div
              className="absolute rounded-full border-t-4 border-cyan-400"
              style={{
                width: '150px',
                height: '150px',
                borderColor: 'transparent',
                borderTopColor: 'rgba(34, 211, 238, 0.8)',
                borderRightColor: 'rgba(34, 211, 238, 0.3)',
              }}
              animate={{
                rotate: [0, 360],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "linear"
              }}
            />
          </div>
        </div>

        {/* Welcome text */}
        <h2 className="text-xl mt-4 text-cyan-300">Hello</h2>
        <h1 className="text-3xl font-bold text-white">
          {user?.user_name || "Guest"}
        </h1>
      </motion.div>
    </div>
  );
}