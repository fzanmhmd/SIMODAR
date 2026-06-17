import { useState, useEffect, useRef } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { api, getToken, setToken } from "./api.js";
import { useToast } from "./hooks/useToast.js";
import { AuthGate, AdminLayout, RouteLoader } from "./components/AdminLayout.jsx";
import { Toast, ConfirmModal } from "./components/Toast.jsx";
import Landing from "./pages/Landing.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import PengajuanPage from "./pages/PengajuanPage.jsx";
import CheckSubmissionPage from "./pages/CheckSubmissionPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import ApprovalPage from "./pages/ApprovalPage.jsx";
import AssignmentPage from "./pages/AssignmentPage.jsx";
import SchedulePage from "./pages/SchedulePage.jsx";
import ResultsPage from "./pages/ResultsPage.jsx";
import HistoriesPage from "./pages/HistoriesPage.jsx";
import StaffPage from "./pages/StaffPage.jsx";
import StaffHistoryPage from "./pages/StaffHistoryPage.jsx";
import LocationPage from "./pages/LocationPage.jsx";
import LocationActivityPage from "./pages/LocationActivityPage.jsx";
import MasterLogisticsPage from "./pages/MasterLogisticsPage.jsx";
import ReportPage from "./pages/ReportPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";

function App() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(!getToken());
  const [confirmState, setConfirmState] = useState(null);
  const [routeLoading, setRouteLoading] = useState(true);
  const toast = useToast();
  const navigate = useNavigate();
  const appLocation = useLocation();
  const firstRouteLoad = useRef(true);

  useEffect(() => {
    if (!getToken()) {
      setAuthReady(true);
      return;
    }
    api("/auth/me")
      .then((result) => setUser(result.user))
      .catch(() => setToken(""))
      .finally(() => setAuthReady(true));
  }, []);

  const confirm = (message, action) => {
    setConfirmState({
      message,
      onAccept: async () => {
        try {
          await action();
        } catch (error) {
          toast.show(error.message);
        } finally {
          setConfirmState(null);
        }
      },
    });
  };

  function handleLogin(nextUser) {
    setUser(nextUser);
  }

  function logout() {
    setToken("");
    setUser(null);
    navigate("/");
  }

  useEffect(() => {
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  }, [appLocation.pathname]);

  useEffect(() => {
    setRouteLoading(true);
    document.body.classList.add("route-loading-active");
    const duration = firstRouteLoad.current ? 1050 : 620;
    firstRouteLoad.current = false;
    const timer = window.setTimeout(() => {
      setRouteLoading(false);
      document.body.classList.remove("route-loading-active");
    }, duration);
    return () => {
      window.clearTimeout(timer);
      document.body.classList.remove("route-loading-active");
    };
  }, [appLocation.pathname, appLocation.search]);

  const adminElement = (page) => <AuthGate user={user} authReady={authReady}><AdminLayout user={user} onLogout={logout}>{page}</AdminLayout></AuthGate>;

  return (
    <>
      <div key={appLocation.pathname} className="page-transition">
        <Routes location={appLocation}>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<LoginPage onLogin={handleLogin} toast={toast.show} />} />
          <Route path="/pengajuan" element={<PengajuanPage toast={toast.show} />} />
          <Route path="/cek-pengajuan" element={<CheckSubmissionPage />} />
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/dashboard" element={adminElement(<DashboardPage />)} />
          <Route path="/admin/approval-pengajuan" element={adminElement(<ApprovalPage toast={toast.show} confirm={confirm} />)} />
          <Route path="/admin/penugasan-petugas" element={adminElement(<AssignmentPage toast={toast.show} confirm={confirm} />)} />
          <Route path="/admin/jadwal-kegiatan" element={adminElement(<SchedulePage toast={toast.show} confirm={confirm} />)} />
          <Route path="/admin/hasil-kegiatan" element={adminElement(<ResultsPage toast={toast.show} confirm={confirm} />)} />
          <Route path="/admin/histori-kegiatan" element={adminElement(<HistoriesPage toast={toast.show} confirm={confirm} />)} />
          <Route path="/admin/data-petugas" element={adminElement(<StaffPage toast={toast.show} confirm={confirm} />)} />
          <Route path="/admin/histori-petugas" element={adminElement(<StaffHistoryPage toast={toast.show} confirm={confirm} />)} />
          <Route path="/admin/data-lokasi" element={adminElement(<LocationPage toast={toast.show} confirm={confirm} />)} />
          <Route path="/admin/kegiatan-lokasi" element={adminElement(<LocationActivityPage />)} />
          <Route path="/admin/master-logistik" element={adminElement(<MasterLogisticsPage toast={toast.show} confirm={confirm} />)} />
          <Route path="/admin/report" element={adminElement(<ReportPage toast={toast.show} />)} />
          <Route path="/admin/profil" element={adminElement(<ProfilePage user={user} onProfileUpdated={setUser} toast={toast.show} confirm={confirm} />)} />
        </Routes>
      </div>
      <RouteLoader show={routeLoading} />
      <Toast message={toast.toast} onClose={toast.clear} />
      <ConfirmModal confirm={confirmState} onClose={() => setConfirmState(null)} />
    </>
  );
}

export default App;
