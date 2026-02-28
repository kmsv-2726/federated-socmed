import { Routes, Route, Navigate } from 'react-router-dom';
import AuthPage from './pages/AuthPage';
import Home from './pages/Home';
import Profile from './components/HomePage-components/Profile';
import Channels from './components/HomePage-components/Channels';
import ServerDetails from './components/HomePage-components/ServerDetails';
import Settings from './components/HomePage-components/Settings';
import LandingPage from './pages/LandingPage';
import ServerHome from './pages/serverhome';
import Admin from './pages/Admin';
import ChannelPage from './pages/ChannelPage';
import './styles/app.css';

const isAuthenticated = () => {
    return localStorage.getItem('token') !== null;
};

const ProtectedRoute = ({ children }) => {
    if (!isAuthenticated()) {
        return <Navigate to="/auth" replace />;
    }
    return children;
};

const PublicRoute = ({ children }) => {
    if (isAuthenticated()) {
        return <Navigate to="/" replace />;
    }
    return children;
};

function App() {
    return (
        <Routes>
            <Route path="/auth" element={
                <PublicRoute>
                    <AuthPage />
                </PublicRoute>
            } />
            <Route path="/" element={
                <ProtectedRoute>
                    <Home />
                </ProtectedRoute>
            } />
            <Route path="/profile" element={
                <ProtectedRoute>
                    <Profile />
                </ProtectedRoute>
            } />
            <Route path="/channels" element={
                <ProtectedRoute>
                    <Channels />
                </ProtectedRoute>
            } />
            <Route path="/channels/:channelName" element={
                <ProtectedRoute>
                    <ChannelPage />
                </ProtectedRoute>
            } />
            <Route path="/server-details" element={
                <ProtectedRoute>
                    <ServerDetails />
                </ProtectedRoute>
            } />
            <Route path="/settings" element={
                <ProtectedRoute>
                    <Settings />
                </ProtectedRoute>
            } />
            <Route path="/landing" element={<LandingPage />} />
            <Route path="/servers" element={<ServerHome />} />
            <Route path="/admin" element={
                <ProtectedRoute>
                    <Admin />
                </ProtectedRoute>
            } />
        </Routes>
    );
}

export default App;