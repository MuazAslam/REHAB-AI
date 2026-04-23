import Patient_Navbar from "./Patient_Navbar";
import { Outlet } from "react-router-dom";

export default function Patient_Dashbaord_Layout() {
  return (
    <div className="flex min-h-screen">
      {/* Fixed Navbar */}
      <div className="fixed top-0 left-0 h-full">
        <Patient_Navbar />
      </div>

      {/* Right content */}
      <div className="flex-1 ml-[17rem] p-6 overflow-y-auto bg-white min-h-screen">
        {/* ml-64 matches navbar width (w-64) */}
        {/* mt-4 adds a small gap from top */}
        <Outlet />
      </div>
    </div>
  );
}

