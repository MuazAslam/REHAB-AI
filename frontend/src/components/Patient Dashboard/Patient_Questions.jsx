import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

export default function PatientQuestions({ user, onSubmit }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({
    sleep: null,
    mood: null,
    fatigue: null,
  });
  const [isExiting, setIsExiting] = useState(false);

  const questions = [
    {
      id: "sleep",
      title: "How were your sleeping hours?",
      emojis: [
        { emoji: "😴", label: "Poor (1-3 Hrs)" },
        { emoji: "🙂", label: "Average (4-6 Hrs)" },
        { emoji: "😊", label: "Excellent (7-9 Hrs)" }
      ]
    },
    {
      id: "mood",
      title: "How is your mood today?",
      emojis: [
        { emoji: "😢", label: "Low" },
        { emoji: "😕", label: "Okay" },
        { emoji: "🙂", label: "Good" },
        { emoji: "😁", label: "Great" }

      ]
    },
    {
      id: "fatigue",
      title: "How fatigued do you feel?",
      emojis: [
        { emoji: "😫", label: "Exhausted" },
        { emoji: "😐", label: "Moderate" },
        { emoji: "💪", label: "Energetic" },
      ]
    }
  ];

  const profilePicUrl = `http://localhost:8000/static/profile_pics/${user.user_image}`;

  // ---------------- Helper functions for mapping emojis to numbers ----------------
  function mapSleepToHours(emoji) {
    switch (emoji) {
      case "😴": return 4; // Poor
      case "🙂": return 6; // Average
      case "😊": return 8; // Excellent
      default: return 0;
    }
  }

  function mapMoodToNumber(emoji) {
    switch (emoji) {
      case "😁": return 100; // Great
      case "🙂": return 75; // Good
      case "😕": return 50; // Okay
      case "😢": return 25; // Low
      default: return 0;
    }
  }

  function mapFatigueToNumber(emoji) {
    switch (emoji) {
      case "💪": return 100; // Energetic
      case "😐": return 60; // Moderate
      case "😫": return 20; // Exhausted
      default: return 0;
    }
  }

  // ---------------- Emoji selection ----------------
  const handleEmojiSelect = (questionId, emoji) => {
    setAnswers({ ...answers, [questionId]: emoji });

    // Auto-advance to next question after selection
    if (currentQuestion < questions.length - 1) {
      setTimeout(() => {
        setCurrentQuestion(currentQuestion + 1);
      }, 400);
    }
  };

  // ---------------- Continue button: send API call ----------------
  const handleContinue = async () => {
    setIsExiting(true);

    // Prepare payload
    const payload = {
      user_id: user.user_id,
      mood: mapMoodToNumber(answers.mood),
      sleep_hours: mapSleepToHours(answers.sleep),
      fatigue_level: mapFatigueToNumber(answers.fatigue)
    };

    try {
      const response = await fetch("http://localhost:8000/api/activity/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      console.log(response.status)
      setTimeout(() => {
        onSubmit(answers);
      }, 800);
    } catch (error) {
      console.error("Error sending daily activity:", error);
    }
  };

  const allAnswered = answers.sleep && answers.mood && answers.fatigue;
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  // ---------------- Render ----------------
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{
          opacity: isExiting ? 0 : 1,
          scale: isExiting ? 0.9 : 1,
          y: isExiting ? -50 : 0
        }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
        className="w-full max-w-2xl"
      >
        {/* Header with profile */}
        <motion.div
          className="flex flex-col items-center mb-12"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="relative mb-6">
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                width: '80px',
                height: '80px',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'radial-gradient(circle, rgba(34, 211, 238, 0.2) 0%, transparent 70%)',
                filter: 'blur(15px)',
              }}
              animate={{
                scale: [1, 1.15, 1],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            <motion.div
              className="relative rounded-full border-2 overflow-hidden"
              style={{
                width: '70px',
                height: '70px',
                borderColor: 'rgba(34, 211, 238, 0.5)',
                boxShadow: '0 0 20px rgba(34, 211, 238, 0.3)',
              }}
              animate={{
                borderColor: [
                  'rgba(34, 211, 238, 0.5)',
                  'rgba(96, 165, 250, 0.7)',
                  'rgba(34, 211, 238, 0.5)',
                ],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <img
                src={profilePicUrl}
                alt="User"
                className="w-full h-full object-cover"
              />
            </motion.div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Quick Check-In</h1>
          <p className="text-cyan-300 text-sm">{user?.user_name || "Guest"}</p>
        </motion.div>

        {/* Progress bar */}
        <motion.div
          className="w-full h-1 bg-slate-800 rounded-full mb-8 overflow-hidden"
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <motion.div
            className="h-full bg-gradient-to-r from-cyan-400 to-blue-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            style={{
              boxShadow: '0 0 10px rgba(34, 211, 238, 0.5)'
            }}
          />
        </motion.div>

        {/* Question card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion}
            initial={{ opacity: 0, x: 50, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -50, scale: 0.95 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="bg-slate-900/50 backdrop-blur-sm rounded-3xl p-8 border border-cyan-500/20"
            style={{
              boxShadow: '0 0 30px rgba(34, 211, 238, 0.1), inset 0 0 30px rgba(34, 211, 238, 0.05)'
            }}
          >
            {/* Question number */}
            <div className="flex items-center justify-between mb-6">
              <span className="text-cyan-400 text-sm font-medium">
                Question {currentQuestion + 1} of {questions.length}
              </span>
              {answers[questions[currentQuestion].id] && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center"
                >
                  <span className="text-cyan-400 text-xs">✓</span>
                </motion.div>
              )}
            </div>

            {/* Question title */}
            <h2 className="text-2xl font-semibold text-white mb-8 text-center">
              {questions[currentQuestion].title}
            </h2>

            {/* Emoji options */}
            <div className="flex justify-center gap-4 flex-wrap">
              {questions[currentQuestion].emojis.map((option, index) => (
                <motion.button
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.5,
                    delay: 0.15 * index,
                    ease: "easeOut"
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleEmojiSelect(questions[currentQuestion].id, option.emoji)}
                  className={`relative flex flex-col items-center p-6 rounded-2xl transition-all duration-300 ${answers[questions[currentQuestion].id] === option.emoji
                    ? "bg-cyan-500/20 border-2 border-cyan-400"
                    : "bg-slate-800/50 border-2 border-slate-700 hover:border-cyan-500/50"
                    }`}
                  style={{
                    boxShadow: answers[questions[currentQuestion].id] === option.emoji
                      ? '0 0 20px rgba(34, 211, 238, 0.3)'
                      : 'none'
                  }}
                >
                  <span className="text-5xl mb-2">{option.emoji}</span>
                  <span className="text-xs text-slate-400 text-center whitespace-pre-line leading-relaxed">{option.label}</span>

                  {answers[questions[currentQuestion].id] === option.emoji && (
                    <motion.div
                      layoutId="selection"
                      className="absolute inset-0 rounded-2xl"
                      style={{
                        background: 'radial-gradient(circle at center, rgba(34, 211, 238, 0.1) 0%, transparent 70%)',
                      }}
                    />
                  )}
                </motion.button>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation dots */}
        <div className="flex justify-center gap-2 mt-8 mb-6">
          {questions.map((_, index) => (
            <motion.div
              key={index}
              className={`h-2 rounded-full transition-all duration-300 ${index === currentQuestion
                ? "w-8 bg-cyan-400"
                : answers[questions[index].id]
                  ? "w-2 bg-cyan-500/50"
                  : "w-2 bg-slate-700"
                }`}
              style={{
                boxShadow: index === currentQuestion
                  ? '0 0 10px rgba(34, 211, 238, 0.5)'
                  : 'none'
              }}
            />
          ))}
        </div>

        {/* Continue button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: allAnswered ? 1 : 0.5, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex justify-center"
        >
          <motion.button
            onClick={handleContinue}
            disabled={!allAnswered}
            whileHover={allAnswered ? { scale: 1.05 } : {}}
            whileTap={allAnswered ? { scale: 0.95 } : {}}
            className={`px-12 py-4 rounded-2xl text-white font-semibold text-lg transition-all duration-300 ${allAnswered
              ? "bg-gradient-to-r from-cyan-500 to-blue-600 cursor-pointer"
              : "bg-slate-700 cursor-not-allowed"
              }`}
            style={{
              boxShadow: allAnswered
                ? '0 0 30px rgba(34, 211, 238, 0.4)'
                : 'none'
            }}
          >
            Continue
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  );
}
