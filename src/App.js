import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'; // Use Routes
import AdminDashboard from './components/AdminDashboard';
import EmployeeDashboard from './components/EmployeeDashboard';
import CustomerDashboard from './components/CustomerDashboard';

function App() {
  return (
    <Router>
      <Routes> {/* Replace Switch with Routes */}
        <Route path="/admin" element={<AdminDashboard />} /> {/* Use element prop */}
        <Route path="/employee" element={<EmployeeDashboard />} />
        <Route path="/game/:branchId/:gameId" element={<CustomerDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;