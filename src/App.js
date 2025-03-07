import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { auth, db } from './firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc } from 'firebase/firestore';
import AdminDashboard from './components/AdminDashboard';
import EmployeeDashboard from './components/EmployeeDashboard';
import CustomerDashboard from './components/CustomerDashboard';
import Login from './components/Login';

const ProtectedRoute = ({ children, allowedRole }) => {
  const [user, loading] = useAuthState(auth);
  const [role, setRole] = React.useState(null);
  const location = useLocation(); // Get navigation state

  React.useEffect(() => {
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      getDoc(userRef).then((docSnap) => {
        if (docSnap.exists()) {
          const firestoreRole = docSnap.data().role;
          setRole(firestoreRole);
          console.log('ProtectedRoute role from Firestore:', firestoreRole);
        }
      }).catch((error) => {
        console.error('Error fetching role:', error);
      });
    }
  }, [user]);

  // Use role from navigation state if available (from Login.js)
  const navigatedRole = location.state?.role || role;

  if (loading) {
    console.log('ProtectedRoute loading...');
    return <div>Loading...</div>;
  }

  if (!user) {
    console.log('No user, redirecting to /');
    return <Navigate to="/" replace />;
  }

  if (allowedRole && navigatedRole !== allowedRole) {
    console.log(`Role mismatch: expected ${allowedRole}, got ${navigatedRole}, redirecting to /`);
    return <Navigate to="/" replace />;
  }

  console.log('Rendering protected route for role:', navigatedRole);
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employee"
          element={
            <ProtectedRoute allowedRole="employee">
              <EmployeeDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/game/:branchId/:gameId" element={<CustomerDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;