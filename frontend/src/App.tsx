import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthLayout } from './layouts/AuthLayout';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Dashboard } from './pages/Dashboard';
import { ActiveCall } from './pages/ActiveCall';
import { Account } from './pages/Account';
import { Analytics } from './pages/Analytics';

function App() {
  return (
    <Router>
      <Routes>
        {/* Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
        </Route>

        {/* Protected Routes (Mocked) */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/active" element={<ActiveCall />} />
        <Route path="/account" element={<Account />} />
        <Route path="/analytics" element={<Analytics />} />

        {/* Default Redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
