import React from 'react';
import {BrowserRouter as Router, Routes, Route} from 'react-router-dom';
import Gateway from './pages/Gateway.jsx';
import StaffDashboard from './pages/StaffDashboard'
import AppointmentPage from './pages/AppointmentPage'
import StaffTokenLogin from "./pages/StaffTokenLogin.jsx";
import UserTokenRejoin from './pages/UserTokenRejoin.jsx';

export default function App() {
  return (
      <Router>
        <Routes>
          {/* the root url goes straight to login page */}
          <Route path="/" element={<Gateway />} />

          {/* public client path */}
          <Route path="/appointment" element={<AppointmentPage />} />

          {/* secured staff dashboard path */}
          <Route path="/staff-dashboard" element={<StaffDashboard />} />

          {/* for email logins with links */}
          <Route path="/chat/staff/:token" element={<StaffTokenLogin />} />

          <Route path="/chat/user/:token" element={<UserTokenRejoin />} />

          <Route path="/chat/staff/:token" element={<StaffTokenLogin />} />
        </Routes>
      </Router>
  );
}