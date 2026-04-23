import { MdAlternateEmail } from "react-icons/md";
import { FaRegEye, FaRegEyeSlash, FaFingerprint } from "react-icons/fa";
import { useState } from "react";
import { BsApple } from "react-icons/bs";
import { FaXTwitter } from "react-icons/fa6";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./Auth.css"


const LoginForm = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [loading, setLoading] = useState(false);

  const togglePasswordView = () => setShowPassword(!showPassword);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("username", email);
      formData.append("password", password);

      const response = await axios.post(
        "http://127.0.0.1:8000/api/login",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      if (response.data.status === "success") {
        const user = response.data.user;

        // Use AuthContext login
        login(user);

        setMessage(`Welcome, ${user.user_name}!`);
        setMessageType("success");

        // Navigate based on role (no state needed)
        if (user.user_role === "Patient") {
          navigate("/Welcome");
        } else if (user.user_role === "Doctor") {
          navigate("/doctor_overview");
        }
      } else {
        setMessage("Invalid credentials");
        setMessageType("error");
      }
    } catch (err) {
      setMessage(
        err.response?.data?.message || "Login failed. Please try again."
      );
      setMessageType("error");
      console.error(err);
    }

    setLoading(false);
  };

  return (
    <div className="auth-bg min-h-screen flex items-center justify-center px-4 py-8">
      <form
        onSubmit={handleLogin}
        className="z-10 rounded-2xl shadow-xl w-full max-w-md bg-transparent"
      >
        <div
          className="w-full p-5 bg-gray-900 flex-col flex items-center gap-3 rounded-xl"
          style={{
            boxShadow: '0 0 25px rgba(255, 255, 255, 0.84), 0 0 50px rgba(68, 73, 68, 0.3)'
          }}
        >
          <img src="/logo.png" alt="logo" className="w-20 h-20 md:w-28 md:h-28" />

          <h1 className="text-lg md:text-xl font-semibold text-white">Welcome Back</h1>
          <p className="text-xs md:text-sm text-gray-500 text-center">
            Don’t have an account?{" "}
            <button
              type="button"
              onClick={() => navigate("/signup")}
              className="text-white underline hover:text-blue-400 ml-1"
            >
              Sign up
            </button>

          </p>
          {message && (
            <p className={`text-md text-center ${messageType === "success" ? "text-green-400" : "text-red-400"}`}>
              {message}
            </p>
          )}

          <div className="w-full flex flex-col gap-3 mt-2">
            {/* Email Field */}
            <div className="w-full flex items-center gap-2 bg-gray-800 p-2 rounded-xl">
              <MdAlternateEmail className="text-white" />
              <input
                type="email"
                placeholder="Email address"
                className="bg-transparent border-0 w-full outline-none text-sm md:text-base text-white"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Password Field */}
            <div className="w-full flex items-center gap-2 bg-gray-800 p-2 rounded-xl relative">
              <FaFingerprint className="text-white" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                className="bg-transparent border-0 w-full outline-none text-sm md:text-base text-white"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {showPassword ? (
                <FaRegEyeSlash
                  className="absolute right-5 cursor-pointer text-white"
                  onClick={togglePasswordView}
                />
              ) : (
                <FaRegEye
                  className="absolute right-5 cursor-pointer text-white"
                  onClick={togglePasswordView}
                />
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full p-2 rounded-xl mt-3 text-sm md:text-base text-white 
                        bg-blue-700 hover:bg-blue-800 
                        ${loading ? 'cursor-not-allowed' : 'cursor-pointer'}
                        `}
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
                <span>Logging in...</span>
              </div>
            ) : (
              "Login"
            )}
          </button>

          {/* Divider */}
          <div className="relative w-full flex items-center justify-center py-3">
            <div className="w-2/5 h-[2px] bg-gray-800"></div>
            <h3 className="font-lora text-xs md:text-sm px-4 text-gray-500">
              Or
            </h3>
            <div className="w-2/5 h-[2px] bg-gray-800"></div>
          </div>

          {/* Social Icons */}
          <div className="w-full flex items-center justify-evenly md:justify-between gap-2">
            <div className="p-2 md:px-6 lg:px-10 bg-slate-700 cursor-pointer rounded-xl hover:bg-slate-800">
              <BsApple className="text-lg md:text-xl text-white" />
            </div>
            <div className="p-1 md:px-6 lg:px-10 bg-slate-700 cursor-pointer rounded-xl hover:bg-slate-800">
              <img
                src="/google-icon.png"
                alt="google-icon"
                className="w-6 md:w-8"
              />
            </div>
            <div className="p-2 md:px-6 lg:px-10 bg-slate-700 cursor-pointer rounded-xl hover:bg-slate-800">
              <FaXTwitter className="text-lg md:text-xl text-white" />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default LoginForm;
