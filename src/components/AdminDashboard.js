import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, getDocs, updateDoc, doc, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import QRCode from 'qrcode';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { motion } from 'framer-motion';
import styled from 'styled-components';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// Styled Components
const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #1e3a8a, #9333ea);
  padding: 2rem;
  font-family: 'Arial', sans-serif;
`;

const DashboardTitle = styled.h1` // Renamed from Title to avoid conflict
  color: white;
  font-size: 2.5rem;
  font-weight: bold;
  text-align: center;
  margin-bottom: 2rem;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
`;

const Card = styled(motion.div)`
  background: white;
  border-radius: 15px;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`;

const CardTitle = styled.h2`
  color: #1e3a8a;
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1rem;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  border: 2px solid #9333ea;
  border-radius: 8px;
  font-size: 1rem;
  outline: none;
  transition: border-color 0.3s;
  &:focus {
    border-color: #f97316;
  }
`;

const Button = styled(motion.button)`
  width: 100%;
  padding: 0.75rem;
  background: #f97316;
  color: white;
  font-weight: bold;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.3s;
  &:hover {
    background: #ea580c;
  }
`;

const QRGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1.5rem;
`;

const QRCard = styled(motion.div)`
  text-align: center;
  background: #f3f4f6;
  padding: 1rem;
  border-radius: 10px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
`;

const List = styled.ul`
  list-style: none;
  padding: 0;
`;

const ListItem = styled.li`
  padding: 0.5rem 0;
  color: #333;
`;

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
  const [topGames, setTopGames] = useState({ daily: [], weekly: [], monthly: [] });
  const [topEmployees, setTopEmployees] = useState({ daily: [], weekly: [], monthly: [] });

  const fetchAllGames = async () => {
    const gamesSnapshot = await getDocs(collection(db, 'games'));
    const gamesData = gamesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const gamesWithQRs = await Promise.all(
      gamesData.map(async (game) => {
        const url = `https://dev-opal-six.vercel.app/game/${game.branchId}/${game.id}`;
        const qrCode = await QRCode.toDataURL(url, { width: 200, margin: 2 });
        return { ...game, qrCode, url };
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
      const url = `https://dev-opal-six.vercel.app/game/${branchId}/${docRef.id}`;
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
      await setDoc(doc(db, 'users', user.uid), {
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

  const fetchPerformanceData = async () => {
    const rentals = await getDocs(collection(db, 'rentals'));
    const games = await getDocs(collection(db, 'games'));
    const gameMap = {};
    games.forEach(doc => gameMap[doc.id] = doc.data().name);

    const now = new Date();
    const dayMs = 24 * 60 * 60 * 1000;
    const weekMs = 7 * dayMs;
    const monthMs = 30 * dayMs;

    const filterByTime = (rentals, periodMs) => rentals.filter(r => 
      new Date(r.startTime) > now - periodMs && r.status === 'completed'
    );

    const dailyRentals = filterByTime(rentals.docs.map(doc => doc.data()), dayMs);
    const weeklyRentals = filterByTime(rentals.docs.map(doc => doc.data()), weekMs);
    const monthlyRentals = filterByTime(rentals.docs.map(doc => doc.data()), monthMs);

    const calcTopGames = (rentals) => {
      const gameCount = {};
      rentals.forEach(r => gameCount[r.gameId] = (gameCount[r.gameId] || 0) + 1);
      return Object.entries(gameCount)
        .map(([id, count]) => ({ name: gameMap[id] || id, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    };

    const calcTopEmployees = (rentals) => {
      const empRevenue = {};
      rentals.forEach(r => empRevenue[r.employeeId] = (empRevenue[r.employeeId] || 0) + (r.cost || 0));
      return Object.entries(empRevenue)
        .map(([id, revenue]) => ({ id, revenue }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
    };

    setTopGames({
      daily: calcTopGames(dailyRentals),
      weekly: calcTopGames(weeklyRentals),
      monthly: calcTopGames(monthlyRentals),
    });
    setTopEmployees({
      daily: calcTopEmployees(dailyRentals),
      weekly: calcTopEmployees(weeklyRentals),
      monthly: calcTopEmployees(monthlyRentals),
    });
  };

  useEffect(() => {
    fetchRevenue();
    fetchActiveGames();
    fetchAllGames();
    fetchPerformanceData();
  }, []);

  const chartOptions = {
    responsive: true,
    plugins: { legend: { position: 'top' }, title: { display: true } },
  };

  const createChartData = (data, label, title) => ({
    labels: data.map(item => item.name || item.id),
    datasets: [{
      label,
      data: data.map(item => item.count || item.revenue),
      backgroundColor: 'rgba(249, 115, 22, 0.6)',
      borderColor: 'rgba(249, 115, 22, 1)',
      borderWidth: 1,
    }],
    options: { ...chartOptions, plugins: { ...chartOptions.plugins, title: { text: title } } },
  });

  const printAllQRCodes = () => window.print();

  return (
    <Container>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <DashboardTitle>Admin Dashboard</DashboardTitle>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <CardTitle>Add Game</CardTitle>
          <Input value={gameName} onChange={e => setGameName(e.target.value)} placeholder="Game Name" />
          <Input value={branchId} onChange={e => setBranchId(e.target.value)} placeholder="Branch ID" />
          <Button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={addGame}>
            Add Game & Generate QR
          </Button>
          {qrCodeUrl && (
            <div className="mt-4 text-center">
              <img src={qrCodeUrl} alt="Single Game QR" className="mx-auto max-w-[150px]" />
              <p className="text-sm text-gray-600">Single Game QR</p>
            </div>
          )}
        </Card>

        <Card initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <CardTitle>Add Employee</CardTitle>
          <Input value={employeeEmail} onChange={e => setEmployeeEmail(e.target.value)} placeholder="Employee Gmail" />
          <Input value={employeePassword} onChange={e => setEmployeePassword(e.target.value)} placeholder="Employee Password" type="password" />
          <Input value={employeeBranch} onChange={e => setEmployeeBranch(e.target.value)} placeholder="Branch ID" />
          <Button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={addEmployee}>
            Add Employee
          </Button>
        </Card>

        <Card initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="col-span-1 md:col-span-2 lg:col-span-3">
          <CardTitle>All Game QR Codes</CardTitle>
          <Button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={printAllQRCodes} className="mb-4">
            Print All QR Codes
          </Button>
          <QRGrid>
            {allGames.map(game => (
              <QRCard key={game.id} whileHover={{ scale: 1.05 }}>
                <img src={game.qrCode} alt={`QR Code for ${game.name}`} className="mx-auto max-w-[150px]" />
                <p className="mt-2 font-medium">{game.name} ({game.branchId})</p>
                <p className="text-sm text-gray-600 break-all">{game.url}</p>
              </QRCard>
            ))}
          </QRGrid>
        </Card>

        <Card initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="col-span-1 md:col-span-2">
          <CardTitle>Top Performing Games</CardTitle>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Bar data={createChartData(topGames.daily, 'Rentals', 'Daily')} />
            <Bar data={createChartData(topGames.weekly, 'Rentals', 'Weekly')} />
            <Bar data={createChartData(topGames.monthly, 'Rentals', 'Monthly')} />
          </div>
        </Card>

        <Card initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.0 }} className="col-span-1 md:col-span-2">
          <CardTitle>Top Performing Employees</CardTitle>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Bar data={createChartData(topEmployees.daily, 'Revenue (bob)', 'Daily')} />
            <Bar data={createChartData(topEmployees.weekly, 'Revenue (bob)', 'Weekly')} />
            <Bar data={createChartData(topEmployees.monthly, 'Revenue (bob)', 'Monthly')} />
          </div>
        </Card>

        <Card initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}>
          <CardTitle>Revenue by Employee</CardTitle>
          <List>
            {Object.entries(revenue).map(([empId, rev]) => (
              <ListItem key={empId}>{empId}: {rev} bob</ListItem>
            ))}
          </List>
        </Card>

        <Card initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }}>
          <CardTitle>Most Active Games</CardTitle>
          <List>
            {activeGames.map(game => (
              <ListItem key={game.id}>{game.name}</ListItem>
            ))}
          </List>
        </Card>
      </div>
    </Container>
  );
};

export default AdminDashboard;