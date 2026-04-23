import { useState } from "react";
import PatientWelcome from "./Patient_Welcome";
import PatientQuestions from "./Patient_Questions";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function WelcomeScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [step, setStep] = useState("welcome"); // "welcome" or "questions"

  // Called after welcome animation finishes
  const handleWelcomeComplete = () => setStep("questions");

  // Called after questions submitted
  const handleQuestionsSubmit = (answers) => {
    // optionally submit to backend
    navigate("/overview");
  };

  return (
    <div className="w-full h-full">
      {step === "welcome" ? (
        <PatientWelcome onComplete={handleWelcomeComplete} />
      ) : (
        <PatientQuestions user={user} onSubmit={handleQuestionsSubmit} />
      )}
    </div>
  );
}
