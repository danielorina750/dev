import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode'; // Updated import
import { db } from '../firebase';
import { collection, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';

const EmployeeDashboard = () => {
  const [scanner, setScanner] = useState(null);
  const [activeRentals, setActiveRentals] = useState([]);
  const [rentalHistory, setRentalHistory] = useState([]);
  const branchId = 'branch1'; // Replace with dynamic branch ID from auth

  useEffect(() => {
    const qrScanner = new Html5QrcodeScanner(
      'reader', // HTML element ID where scanner renders
      { fps: 10, qrbox: { width: 250, height: 250 } } // Config options
    );
    qrScanner.render(
      async (decodedText) => {
        const [_, branch, gameId] = decodedText.match(/game\/([^/]+)\/([^/]+)/) || [];
        if (branch === branchId) {
          const rentalsSnapshot = await getDocs(collection(db, 'rentals'));
          const rentals = rentalsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          const active = rentals.find(r => r.gameId === gameId && r.status === 'active');
          if (active) {
            await updateDoc(doc(db, 'rentals', active.id), {
              status: 'completed',
              cost: active.totalTime * 3,
            });
          } else {
            await addDoc(collection(db, 'rentals'), {
              gameId,
              branchId,
              employeeId: 'emp1', // Replace with auth user ID
              customerId: 'cust1', // Replace with input or dynamic ID
              startTime: new Date(),
              status: 'active',
              totalTime: 0,
            });
          }
          fetchRentals(); // Refresh rentals after scan
        }
      },
      (error) => console.log('Scan error:', error)
    );
    setScanner(qrScanner);

    const fetchRentals = async () => {
      const rentalsSnapshot = await getDocs(collection(db, 'rentals'));
      const rentals = rentalsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setActiveRentals(rentals.filter(r => r.branchId === branchId && r.status === 'active'));
      setRentalHistory(rentals.filter(r => r.branchId === branchId && r.status === 'completed'));
    };
    fetchRentals();

    return () => qrScanner.clear(); // Cleanup on unmount
  }, []);

  return (
    <div>
      <h1>Employee Dashboard</h1>
      <div id="reader"></div>
      <h2>Active Rentals</h2>
      <ul>{activeRentals.map(r => <li key={r.id}>{r.gameId}</li>)}</ul>
      <h2>Rental History</h2>
      <ul>{rentalHistory.map(r => <li key={r.id}>{r.gameId} - {r.cost || 0} bob</li>)}</ul>
    </div>
  );
};

export default EmployeeDashboard;