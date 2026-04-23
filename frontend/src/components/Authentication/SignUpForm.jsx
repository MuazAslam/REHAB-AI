import { MdAlternateEmail } from "react-icons/md";
import { FaFingerprint, FaUser, FaRegEye, FaRegEyeSlash, FaWeight, FaRulerVertical, FaCalendarAlt, FaMars, FaVenus } from "react-icons/fa";
import { useState } from "react";
import { BsApple } from "react-icons/bs";
import { FaXTwitter } from "react-icons/fa6";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./Auth.css"


const SignUpForm = () => {
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        profile_picture: null,
        weight: "",
        height: "",
        age: "",
        gender: "",
    });
    const [previewImage, setPreviewImage] = useState(null);
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState("");
    const [loading, setLoading] = useState(false);

    const togglePasswordView = () => setShowPassword(!showPassword);

    const handleInputChange = (e) => {
        const { name, value, files } = e.target;
        if (name === "profile_picture") {
            const file = files && files[0];
            if (file) {
                setFormData({ ...formData, profile_picture: file });
                setPreviewImage(URL.createObjectURL(file));
            }
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage("");
        const data = new FormData();
        data.append("name", formData.name);
        data.append("email", formData.email);
        data.append("password", formData.password);
        data.append("weight", formData.weight);
        data.append("height", formData.height);
        data.append("age", formData.age);
        data.append("gender", formData.gender);


        if (!formData.age) {
            setMessage("Please select your age");
            setMessageType("error");
            setLoading(false);
            return;
        }

        if (!formData.gender) {
            setMessage("Please select your gender");
            setMessageType("error");
            setLoading(false);
            return;
        }

        if (formData.weight <= 0 || formData.weight > 150) {
            setMessage("Weight must be between 1 and 150 kg");
            setMessageType("error");
            setLoading(false);
            return;
        }

        if (formData.height <= 0 || formData.height > 250) {
            setMessage("Height must be between 1 and 250 cm");
            setMessageType("error");
            setLoading(false);
            return;
        }

        if (formData.profile_picture) {
            data.append("profile_picture", formData.profile_picture);
        }

        try {
            const response = await axios.post("http://127.0.0.1:8000/api/signup", data, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            if (response.data.status === "success") {
                setMessage("Account created successfully! Redirecting to login...");
                setMessageType("success");
                setTimeout(() => navigate("/login"), 1500);

            } else if (response.data.status === "Duplicate") {
                setMessage("Email already registered!");
                setMessageType("error");
            }
        } catch (err) {
            setMessage("Signup failed. Please try again.");
            setMessageType("error");
            console.error(err);
        }

        setLoading(false);
    };

    return (
        <div className="auth-bg min-h-screen flex items-center justify-center px-4 py-8">
            <form
                onSubmit={handleSignup}
                className="z-10 rounded-2xl shadow-xl w-full max-w-2xl bg-transparent"
            >
                <div
                    className="flex flex-col md:flex-row w-full max-w-4xl mx-auto px-8 py-4 bg-gray-900 rounded-xl items-center justify-between"
                    style={{
                        boxShadow: '0 0 25px rgba(255, 255, 255, 0.84), 0 0 50px rgba(68, 73, 68, 0.3)',
                        transition: 'all 0.3s ease-in-out'
                    }}
                >
                    {/* Left: Profile Picture */}
                    <div className="flex flex-col items-center justify-center w-full sm:w-1/4">
                        <label htmlFor="profile_picture" className="cursor-pointer">
                            <div className="w-36 h-36 rounded-full overflow-hidden border-4 border-gray-300 hover:opacity-50 transition-all duration-300">
                                {previewImage ? (
                                    <img src={previewImage} alt="Profile Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-gray-700 flex items-center justify-center text-white text-sm text-center">
                                        Upload<br />Profile
                                    </div>
                                )}
                            </div>
                        </label>
                        <input
                            type="file"
                            id="profile_picture"
                            name="profile_picture"
                            accept="image/*"
                            onChange={handleInputChange}
                            className="hidden"
                        />
                    </div>

                    {/* Right: Form Fields */}
                    <div className="flex flex-col w-full sm:w-2/3 items-center gap-4">
                        <img src="/logo.png" alt="logo" className="w-20 md:w-22" />
                        <h1 className="text-lg md:text-xl font-semibold text-white">Create a New Account</h1>
                        <p className="text-xs md:text-sm text-gray-500 text-center">
                            Already have an account?{" "}
                            <button type="button"
                                onClick={() => navigate("/login")}
                                className="text-white underline hover:text-blue-400 ml-1"
                            >Login</button>
                        </p>

                        {message && (
                            <p className={`text-md text-center ${messageType === "success" ? "text-green-400" : "text-red-400"}`}>
                                {message}
                            </p>
                        )}

                        <div className="w-full flex flex-col gap-3">
                            {/* Name */}
                            <div className="w-full flex items-center gap-2 bg-gray-800 p-2 rounded-xl">
                                <FaUser className="text-white" />
                                <input
                                    type="text"
                                    name="name"
                                    placeholder="Full Name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    required
                                    className="bg-transparent border-0 w-full outline-none text-white"
                                />
                            </div>

                            {/* Email */}
                            <div className="w-full flex items-center gap-2 bg-gray-800 p-2 rounded-xl">
                                <MdAlternateEmail className="text-white" />
                                <input
                                    type="email"
                                    name="email"
                                    placeholder="Email address"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    required
                                    className="bg-transparent border-0 w-full outline-none text-white"
                                />
                            </div>

                            {/* Password */}
                            <div className="w-full flex items-center gap-2 bg-gray-800 p-2 rounded-xl relative">
                                <FaFingerprint className="text-white" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    placeholder="Password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    required
                                    className="bg-transparent border-0 w-full outline-none text-white"
                                />
                                {showPassword ? (
                                    <FaRegEyeSlash className="absolute right-5 cursor-pointer text-white" onClick={togglePasswordView} />
                                ) : (
                                    <FaRegEye className="absolute right-5 cursor-pointer text-white" onClick={togglePasswordView} />
                                )}
                            </div>

                            {/* Age and Gender Row */}
                            {/* Age and Gender Row */}
                            <div className="w-full flex flex-col md:flex-row gap-3">
                                {/* Age Dropdown */}
                                <div className="flex items-center gap-2 bg-gray-800 p-2 rounded-xl w-full md:w-1/2">
                                    <FaCalendarAlt className="text-white" />
                                    <select
                                        name="age"
                                        value={formData.age}
                                        onChange={handleInputChange}
                                        required
                                        className="bg-transparent border-0 w-full outline-none text-white appearance-none cursor-pointer"
                                        style={{ colorScheme: "dark" }}
                                    >
                                        <option value="" disabled className="text-gray-400">Age</option>
                                        {Array.from({ length: 100 }, (_, i) => i + 1).map((age) => (
                                            <option key={age} value={age} className="bg-gray-800 text-white">
                                                {age}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Gender Selection */}
                                <div className="flex items-center gap-3 w-full md:w-1/2">
                                    <div
                                        onClick={() => setFormData({ ...formData, gender: "Male" })}
                                        className={`flex-1 p-2 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 border-2 ${formData.gender === "Male"
                                            ? "bg-blue-600 border-blue-600 text-white"
                                            : "bg-gray-800 border-gray-800 text-gray-400 hover:bg-gray-700"
                                            }`}
                                    >
                                        <FaMars /> Male
                                    </div>
                                    <div
                                        onClick={() => setFormData({ ...formData, gender: "Female" })}
                                        className={`flex-1 p-2 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 border-2 ${formData.gender === "Female"
                                            ? "bg-pink-600 border-pink-600 text-white"
                                            : "bg-gray-800 border-gray-800 text-gray-400 hover:bg-gray-700"
                                            }`}
                                    >
                                        <FaVenus /> Female
                                    </div>
                                </div>
                            </div>
                            {/* Weight + Height Row */}
                            <div className="w-full flex flex-col md:flex-row gap-3">
                                {/* Weight */}
                                <div className="flex items-center gap-2 bg-gray-800 p-2 rounded-xl w-full md:w-1/2">
                                    <FaWeight className="text-white" />
                                    <input
                                        type="number"
                                        name="weight"
                                        placeholder="Weight (kg)"
                                        value={formData.weight}
                                        onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                                        required
                                        min="1"
                                        max="500"
                                        className="bg-transparent border-0 w-full outline-none text-white"
                                    />
                                </div>

                                {/* Height */}
                                <div className="flex items-center gap-2 bg-gray-800 p-2 rounded-xl w-full md:w-1/2">
                                    <FaRulerVertical className="text-white" />
                                    <input
                                        type="number"
                                        name="height"
                                        placeholder="Height (cm)"
                                        value={formData.height}
                                        onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                                        required
                                        min="1"
                                        max="300"
                                        className="bg-transparent border-0 w-full outline-none text-white"
                                    />
                                </div>
                            </div>

                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full p-2 mt-3 rounded-xl text-white bg-blue-700 hover:bg-blue-800 ${loading ? "cursor-not-allowed" : "cursor-pointer"
                                }`}
                        >
                            {loading ? "Creating..." : "Sign Up"}
                        </button>

                        {/* Divider */}
                        <div className="relative w-full flex items-center justify-center py-3">
                            <div className="w-2/5 h-[2px] bg-gray-800"></div>
                            <h3 className="text-xs md:text-sm px-4 text-gray-500">Or</h3>
                            <div className="w-2/5 h-[2px] bg-gray-800"></div>
                        </div>

                        {/* Social */}
                        <div className="w-full flex items-center justify-evenly md:justify-between gap-2">
                            <div className="p-2 md:px-6 lg:px-10 bg-slate-700 cursor-pointer rounded-xl hover:bg-slate-800">
                                <BsApple className="text-lg md:text-xl text-white" />
                            </div>
                            <div className="p-1 md:px-6 lg:px-10 bg-slate-700 cursor-pointer rounded-xl hover:bg-slate-800">
                                <img src="/google-icon.png" alt="google-icon" className="w-6 md:w-8" />
                            </div>
                            <div className="p-2 md:px-6 lg:px-10 bg-slate-700 cursor-pointer rounded-xl hover:bg-slate-800">
                                <FaXTwitter className="text-lg md:text-xl text-white" />
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default SignUpForm;
