import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { db, auth } from '../firebase';
import { collection, onSnapshot, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';

const EmployeeDashboard = () => {
  const [scanner, setScanner] = useState(null);
  const [activeRentals, setActiveRentals] = useState([]);
  const [rentalHistory, setRentalHistory] = useState([]);
  const [branchId, setBranchId] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Get employee's branch from Firestore
    const fetchBranch = async () => {
      const userDoc = await getDocs(collection(db, 'users'));
      const user = userDoc.docs.find(doc => doc.data().uid === auth.currentUser.uid);
      if (user && user.data().role === 'employee') {
        setBranchId(user.data().branchId);
      } else {
        navigate('/'); // Redirect if not an employee
      }
    };
    fetchBranch();

    // Real-time listener for rentals
    const unsubscribe = branchId
      ? onSnapshot(collection(db, 'rentals'), (snapshot) => {
          const rentals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setActiveRentals(rentals.filter(r => r.branchId === branchId && r.status === 'active'));
          setRentalHistory(rentals.filter(r => r.branchId === branchId && r.status === 'completed'));
        })
      : () => {};

    // Scanner setup
    const qrScanner = new Html5QrcodeScanner(
      'reader',
      { fps: 15, qrbox: { width: 300, height: 300 }, aspectRatio: 1.0, disableFlip: false },
      false
    );
    qrScanner.render(
      async (decodedText) => {
        console.log('Scanned:', decodedText);
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
              employeeId: auth.currentUser.uid,
              customerId: 'cust1', // Dynamic later
              startTime: new Date(),
              status: 'active',
              totalTime: 0,
            });
            navigate(`/game/${branchId}/${gameId}`);
          }
        }
      },
      (error) => console.log('Scan error:', error.message)
    );
    setScanner(qrScanner);

    return () => {
      qrScanner.clear();
      unsubscribe();
    };
  }, [branchId, navigate]);

  return (
    <div>
      <h1>Employee Dashboard - {branchId}</h1>
      <div id="reader"></div>
      <h2>Active Rentals</h2>
      <ul>{activeRentals.map(r => <li key={r.id}>{r.gameId}</li>)}</ul>
      <h2>Rental History</h2>
      <ul>{rentalHistory.map(r => <li key={r.id}>{r.gameId} - {r.cost || 0} bob</li>)}</ul>
    </div>
  );
};

export default EmployeeDashboard;