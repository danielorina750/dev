import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, getDocs, updateDoc, doc, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import QRCode from 'qrcode';

const AdminDashboard = () => {
  const [gameName, setGameName] = useState('');
  const [branchId, setBranchId] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [revenue, setRevenue] = useState({});
  const [activeGames, setActiveGames] = useState([]);
  const [allGames, setAllGames] = useState([]);
  const [employeeEmail, setEmployeeEmail] = useState('');
  const [employeePassword, setEmployeePassword] = useState('');
  const [employeeBranch, setEmployeeBranch] = useState('');

  const fetchAllGames = async () => {
    const gamesSnapshot = await getDocs(collection(db, 'games'));
    const gamesData = gamesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    const gamesWithQRs = await Promise.all(
      gamesData.map(async (game) => {
        const url = `https://dev-opal-six.vercel.app/game/${game.branchId}/${game.id}`; // Your Vercel URL
        console.log('Generated QR URL for all games:', url); // Debug
        const qrCode = await QRCode.toDataURL(url, { width: 200, margin: 2 });
        return { ...game, qrCode, url }; // Include URL for debugging
      })
    );
    setAllGames(gamesWithQRs);
  };

  const addGame = async () => {
    try {
      const docRef = await addDoc(collection(db, 'games'), {
        name: gameName,
        branchId,
        available: true,
      });
      const url = `https://dev-opal-six.vercel.app/game/${branchId}/${docRef.id}`; // Your Vercel URL
      console.log('Generated single game QR URL:', url); // Debug
      const qr = await QRCode.toDataURL(url, { width: 200, margin: 2 });
      await updateDoc(doc(db, 'games', docRef.id), { qrCodeUrl: qr });
      setQrCodeUrl(qr);
      setGameName('');
      setBranchId('');
      fetchAllGames();
    } catch (error) {
      console.error('Error adding game:', error.message);
    }
  };

  const addEmployee = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, employeeEmail, employeePassword);
      const user = userCredential.user;
      await setDoc(doc(db, 'users', user.uid), { // Use setDoc with UID
        email: employeeEmail,
        role: 'employee',
        branchId: employeeBranch,
      });
      console.log('Employee added:', user.uid);
      setEmployeeEmail('');
      setEmployeePassword('');
      setEmployeeBranch('');
    } catch (error) {
      console.error('Error adding employee:', error.message);
    }
  };

  const fetchRevenue = async () => {
    const rentals = await getDocs(collection(db, 'rentals'));
    const revenueByEmployee = {};
    rentals.forEach(doc => {
      const data = doc.data();
      if (data.status === 'completed') {
        revenueByEmployee[data.employeeId] = (revenueByEmployee[data.employeeId] || 0) + (data.cost || 0);
      }
    });
    setRevenue(revenueByEmployee);
  };

  const fetchActiveGames = async () => {
    const games = await getDocs(collection(db, 'games'));
    const rentals = await getDocs(collection(db, 'rentals'));
    const gameUsage = {};
    rentals.forEach(doc => {
      const gameId = doc.data().gameId;
      gameUsage[gameId] = (gameUsage[gameId] || 0) + 1;
    });
    const sortedGames = games.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => (gameUsage[b.id] || 0) - (gameUsage[a.id] || 0));
    setActiveGames(sortedGames.slice(0, 5));
  };

  useEffect(() => {
    fetchRevenue();
    fetchActiveGames();
    fetchAllGames();
  }, []);

  const printAllQRCodes = () => {
    window.print();
  };

  return (
    <div>
      <h1>Admin Dashboard</h1>

      <h2>Add Game</h2>
      <input value={gameName} onChange={e => setGameName(e.target.value)} placeholder="Game Name" />
      <input value={branchId} onChange={e => setBranchId(e.target.value)} placeholder="Branch ID" />
      <button onClick={addGame}>Add Game & Generate QR</button>
      {qrCodeUrl && <div><img src={qrCodeUrl} alt="Single Game QR Code" /><p>Single Game QR</p></div>}

      <h2>Add Employee</h2>
      <input value={employeeEmail} onChange={e => setEmployeeEmail(e.target.value)} placeholder="Employee Gmail" />
      <input value={employeePassword} onChange={e => setEmployeePassword(e.target.value)} placeholder="Employee Password" type="password" />
      <input value={employeeBranch} onChange={e => setEmployeeBranch(e.target.value)} placeholder="Branch ID (e.g., kasarani)" />
      <button onClick={addEmployee}>Add Employee</button>

      <h2>All Game QR Codes</h2>
      <button onClick={printAllQRCodes}>Print All QR Codes</button>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginTop: '20px' }}>
        {allGames.map(game => (
          <div key={game.id} style={{ textAlign: 'center', pageBreakInside: 'avoid' }}>
            <img src={game.qrCode} alt={`QR Code for ${game.name}`} />
            <p>{game.name} ({game.branchId})</p>
            <p>{game.url}</p> {/* Display URL for verification */}
          </div>
        ))}
      </div>

      <h2>Revenue by Employee</h2>
      <ul>{Object.entries(revenue).map(([empId, rev]) => <li key={empId}>{empId}: {rev} bob</li>)}</ul>
      <h2>Most Active Games</h2>
      <ul>{activeGames.map(game => <li key={game.id}>{game.name}</li>)}</ul>
    </div>
  );
};

export default AdminDashboard;