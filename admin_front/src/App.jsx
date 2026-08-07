import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { store } from './redux/store';
import { fetchMe, setInitialized } from './redux/authSlice';
import { LanguageProvider } from './contexts/LanguageContext';

import Layout from './layouts/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import FlexyPage from './pages/FlexyPage';
import IdoomPage from './pages/IdoomPage';
import CardsPage from './pages/CardsPage';
import CardOrdersPage from './pages/CardOrdersPage';
import ClientsPage from './pages/ClientsPage';
import CommissionsPage from './pages/CommissionsPage';
import TransfersPage from './pages/TransfersPage';
import StockPage from './pages/StockPage';
import AnalyticsPage from './pages/AnalyticsPage';
import AdsPage from './pages/AdsPage';
import SettingsPage from './pages/SettingsPage';
import TransactionsPage from './pages/TransactionsPage';
import SecurityKeyPage from './pages/SecurityKeyPage';
import ModemGridPage from './pages/ModemGridPage';

function ProtectedRoute({ children }) {
  const { user, initialized } = useSelector(s => s.auth);
  if (!initialized) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  const dispatch = useDispatch();
  const { user, initialized } = useSelector(s => s.auth);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) dispatch(fetchMe());
    else dispatch(setInitialized());
  }, [dispatch]);

  if (!initialized) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="flexy" element={<FlexyPage />} />
          <Route path="idoom" element={<IdoomPage />} />
          <Route path="cards" element={<CardsPage />} />
          <Route path="card-orders" element={<CardOrdersPage />} />
          <Route path="clients" element={<ClientsPage />} />
          <Route path="commissions" element={<CommissionsPage />} />
          <Route path="transfers" element={<TransfersPage />} />
          <Route path="stock" element={<StockPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="ads" element={<AdsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="transactions" element={<TransactionsPage />} />
          <Route path="security-key" element={<SecurityKeyPage />} />
          <Route path="modemgrid" element={<ModemGridPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  return (
    <LanguageProvider>
      <Provider store={store}>
        <AppRoutes />
      </Provider>
    </LanguageProvider>
  );
}
