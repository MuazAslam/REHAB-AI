import { Navigate, Outlet } from "react-router-dom";

const ProtectedRoute = ({ allowedRoles }) => {
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const user = JSON.parse(localStorage.getItem("user") || "{}");


  if (!isLoggedIn) {
    // Not logged in → go to login
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.user_role)) {
    // Logged in but role not allowed → redirect to their dashboard
    if (user.role === "Patient") return <Navigate to="/overview" replace />;
    if (user.role === "Doctor") return <Navigate to="/doctor_overview" replace />;
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
