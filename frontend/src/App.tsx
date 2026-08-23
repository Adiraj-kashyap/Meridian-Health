import { Routes, Route } from "react-router-dom";
import { Navbar } from "./components/layout/Navbar";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Settings from "./pages/Settings";
import AppointmentList from "./pages/AppointmentList";
import AppointmentDetail from "./pages/AppointmentDetail";
import DoctorSearch from "./pages/patient/DoctorSearch";
import DoctorDetail from "./pages/patient/DoctorDetail";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminDoctorDetail from "./pages/admin/AdminDoctorDetail";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <div className="min-h-screen bg-parchment">
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/app/settings" element={<Settings />} />
            <Route path="/app/appointments" element={<AppointmentList />} />
            <Route path="/app/appointments/:id" element={<AppointmentDetail />} />
            <Route path="/app/schedule" element={<AppointmentList />} />
          </Route>

          <Route element={<ProtectedRoute roles={["PATIENT"]} />}>
            <Route path="/app/doctors" element={<DoctorSearch />} />
            <Route path="/app/doctors/:id" element={<DoctorDetail />} />
          </Route>

          <Route element={<ProtectedRoute roles={["ADMIN"]} />}>
            <Route path="/app/admin" element={<AdminDashboard />} />
            <Route path="/app/admin/doctors/:id" element={<AdminDoctorDetail />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}
