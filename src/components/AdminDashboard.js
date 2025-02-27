import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, getDocs, updateDoc, doc } from 'firebase/firestore';
import QRCode from 'qrcode'; // For generating QR codes

const AdminDashboard = () => {
  const [gameName, setGameName] = useState('');
  const [branchId, setBranchId] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [revenue, setRevenue] = useState({});
  const [activeGames, setActiveGames] = useState([]);

  const addGame = async () => {
    const docRef = await addDoc(collection(db, 'games'), {
      name: gameName,
      branchId,
      available: true,
    });
    const url = `http://localhost:3000/game/${branchId}/${docRef.id}`;
    const qr = await QRCode.toDataURL(url); // Generate QR code with qrcode library
    await updateDoc(doc(db, 'games', docRef.id), { qrCodeUrl: qr });
    setQrCodeUrl(qr);
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
  }, []);

  return (
    <div>
      <h1>Admin Dashboard</h1>
      <input value={gameName} onChange={e => setGameName(e.target.value)} placeholder="Game Name" />
      <input value={branchId} onChange={e => setBranchId(e.target.value)} placeholder="Branch ID" />
      <button onClick={addGame}>Add Game & Generate QR</button>
      {qrCodeUrl && <div><img src={qrCodeUrl} alt="QR Code" /><button onClick={() => window.print()}>Print</button></div>}
      <h2>Revenue by Employee</h2>
      <ul>{Object.entries(revenue).map(([empId, rev]) => <li key={empId}>{empId}: {rev} bob</li>)}</ul>
      <h2>Most Active Games</h2>
      <ul>{activeGames.map(game => <li key={game.id}>{game.name}</li>)}</ul>
    </div>
  );
};

export default AdminDashboard;