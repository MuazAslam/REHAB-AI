import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginForm from "./components/Authentication/LoginForm";
import SignUpForm from "./components/Authentication/SignUpForm";
import Patient_Dashboard_Layout from "./components/Patient Dashboard/Patient_Dashboard_Layout";
import PatientOverview from "./components/Patient Dashboard/Patient_overview";
import Patient_Excercises from "./components/Patient Dashboard/Patient_Excercises"
import ExerciseVideoFeed from "./components/Patient Dashboard/ExerciseVideoFeed";
import Doctor_Dashboard_Layout from "./components/Doctor Dashboard/Doctor_Dashboard_Layout."
import DoctorOverview from "./components/Doctor Dashboard/Doctor_overview"
import WelcomeScreen from "./components/Patient Dashboard/Welcome_Wrapper"
import PatientsOverview from "./components/Doctor Dashboard/Patients_Overview"
import CaloriesPredictor from "./components/Patient Dashboard/CaloriesPredictor";
import Patient_Performance from "./components/Patient Dashboard/Patient_Performance";
import Patient_Reports from "./components/Patient Dashboard/Patient_Reports";
import Doctor_Performance from "./components/Doctor Dashboard/Doctor_Performance";
import Doctor_Reports from "./components/Doctor Dashboard/Doctor_Reports";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<LoginForm />} />
        <Route path="/signup" element={<SignUpForm />} />


        {/* Protected Patient Routes */}
        <Route element={<ProtectedRoute allowedRoles={["Patient"]} />}>
          <Route path="/Welcome" element={<WelcomeScreen />} />
          <Route path="/overview" element={<Patient_Dashboard_Layout />}>
            <Route index element={<PatientOverview />} />
          </Route>
          <Route path="/exercises" element={<Patient_Dashboard_Layout />}>
            <Route index element={<Patient_Excercises />} />
          </Route>
          <Route path="/calories-predictor" element={<Patient_Dashboard_Layout />}>
            <Route index element={<CaloriesPredictor />} />
          </Route>
          <Route path="/performance" element={<Patient_Dashboard_Layout />}>
            <Route index element={<Patient_Performance />} />
          </Route>
          <Route path="/reports" element={<Patient_Dashboard_Layout />}>
            <Route index element={<Patient_Reports />} />
          </Route>

          {/* Video Feed Route - Standalone page without dashboard layout */}
          <Route path="/exercise-video" element={<ExerciseVideoFeed />} />
        </Route>

        {/* Protected Doctor Routes */}
        <Route element={<ProtectedRoute allowedRoles={["Doctor"]} />}>
          <Route path="/doctor_overview" element={<Doctor_Dashboard_Layout />}>
            <Route index element={<DoctorOverview />} />
          </Route>
          <Route path="/patients" element={<Doctor_Dashboard_Layout />}>
            <Route index element={<PatientsOverview />} />
          </Route>
          <Route path="/doctor_performance" element={<Doctor_Dashboard_Layout />}>
            <Route index element={<Doctor_Performance />} />
          </Route>
          <Route path="/doctor_reports" element={<Doctor_Dashboard_Layout />}>
            <Route index element={<Doctor_Reports />} />
          </Route>
        </Route>
      </Routes>
    </Router>
  );
}

export default App;