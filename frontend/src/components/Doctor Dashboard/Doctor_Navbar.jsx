import { FaUser, FaClipboardList, FaDumbbell, FaChartLine, FaFileAlt, FaBars, FaTimes, FaSignOutAlt, FaChartPie, FaUsers } from "react-icons/fa";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function Navbar() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  const { user, logout } = useAuth();
  const profilePicUrl = `http://localhost:8000/static/profile_pics/${user?.user_image}`;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const menuItems = [
    { icon: <FaClipboardList />, label: "Overview", href: "/doctor_overview" },
    { icon: <FaUsers />, label: "Patients", href: "/patients" },
    { icon: <FaChartLine />, label: "Performance", href: "/doctor_performance" },
    { icon: <FaChartPie />, label: "Reports", href: "/doctor_reports" },
  ];

  return (
    <>
      {/* Mobile header */}
      <header className="md:hidden flex items-center justify-between p-4 bg-gray-700 shadow-sm">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="AI Physio" className="w-10 h-10" />
          <span className="font-bold text-lg text-white">REHAB AI</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle sidebar"
          className="text-white hover:bg-gray-600 focus:outline-none rounded p-2 transition-colors"
        >
          {sidebarOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
        </button>
      </header>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-screen w-64 bg-gradient-to-br from-[#404040] to-[#232323] shadow-lg
          transform transition-transform duration-300 ease-in-out
          md:translate-x-0 md:m-4 md:h-[calc(100vh-2rem)] md:rounded-xl
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:static md:block`}
      >
        <div className="flex flex-col justify-between h-full">
          {/* Logo Section */}
          <div>
            <div className="flex items-center justify-center p-6 border-b border-gray-600">
              <div className="flex flex-col items-center">
                <img src="/logo.png" alt="AI Physio" className="w-12 h-12 mb-2" />
                <span className="font-bold text-xl text-white">Rehab AI</span>
              </div>
            </div>

            {/* Menu */}
            <nav className="p-4 space-y-1">
              {menuItems.map((item) => (
                <Link
                  key={item.label}
                  to={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentPath === item.href
                    ? "bg-white text-gray-800 font-medium"
                    : "text-white hover:bg-gray-600"
                    }`}
                  onClick={() => setSidebarOpen(false)} // close mobile sidebar
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}

              {/* Profile Section */}
              <div className="pt-4 pb-2">
                <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  User Settings
                </p>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-white hover:bg-red-600 w-full"
              >
                <FaSignOutAlt className="text-lg" />
                <span>Logout</span>
              </button>
            </nav>
          </div>

          {/* Bottom User Section */}
          <div className="p-4 border-t border-gray-600 flex items-center gap-3">
            {user?.user_image ? (
              <img
                src={profilePicUrl}
                alt={user?.user_name}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center">
                <FaUser className="w-5 h-5 text-gray-300" />
              </div>
            )}
            <div className="flex-1 overflow-hidden">
              <p className="font-medium text-white text-sm truncate">
                {user?.user_name || "Guest"}
              </p>
              <p className="text-gray-300 text-xs truncate">
                {user?.user_email || "No email"}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
}
