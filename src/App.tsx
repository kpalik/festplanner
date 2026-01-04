import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Festivals from './pages/Festivals';
import FestivalDetails from './pages/FestivalDetails';
import Bands from './pages/Bands';
import Trips from './pages/Trips';

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/festivals" element={<Festivals />} />
                <Route path="/festivals/:id" element={<FestivalDetails />} />
                <Route path="/bands" element={<Bands />} />
                <Route path="/trips" element={<Trips />} />
              </Route>
            </Route>
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
