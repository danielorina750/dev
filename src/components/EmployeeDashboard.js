import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { db, auth } from '../firebase';
import { collection, onSnapshot, getDocs, addDoc, updateDoc, doc, getDoc } from 'firebase/firestore';
import { motion } from 'framer-motion';
import styled from 'styled-components';

const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #1e3a8a, #9333ea);
  padding: 2rem;
  font-family: 'Arial', sans-serif;
`;

const Title = styled.h1`
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

const ScannerContainer = styled.div`
  max-width: 500px;
  margin: 0 auto;
  border: 4px solid #9333ea;
  border-radius: 10px;
  overflow: hidden;
`;

const List = styled.ul`
  list-style: none;
  padding: 0;
`;

const ListItem = styled(motion.li)`
  padding: 1rem;
  background: #f3f4f6;
  border-radius: 8px;
  margin-bottom: 0.5rem;
  transition: background 0.3s;
  &:hover {
    background: #e5e7eb;
  }
`;

const EmployeeDashboard = () => {
  const [scanner, setScanner] = useState(null);
  const [activeRentals, setActiveRentals] = useState([]);
  const [rentalHistory, setRentalHistory] = useState([]);
  const [branchId, setBranchId] = useState('');
  const navigate = useNavigate();
  const scannerRef = useRef(null);

  useEffect(() => {
    let unsubscribe;

    const fetchBranch = async () => {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().role === 'employee') {
          const employeeBranch = userDoc.data().branchId;
          setBranchId(employeeBranch);
          console.log('Employee branchId:', employeeBranch);
        } else {
          navigate('/');
        }
      } else {
        navigate('/');
      }
    };
    fetchBranch();

    return () => {
      if (unsubscribe) unsubscribe();
      if (scannerRef.current) {
        scannerRef.current.clear().catch(error => console.error('Scanner cleanup error:', error));
      }
    };
  }, [navigate]);

  useEffect(() => {
    if (!branchId) return;

    const unsubscribe = onSnapshot(collection(db, 'rentals'), async (snapshot) => {
      const rentals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const branchRentals = rentals.filter(r => r.branchId === branchId);

      const rentalsWithGameNames = await Promise.all(
        branchRentals.map(async (rental) => {
          const gameDoc = await getDoc(doc(db, 'games', rental.gameId));
          const gameName = gameDoc.exists() ? gameDoc.data().name : 'Unknown Game';
          return { ...rental, gameName };
        })
      );

      setActiveRentals(rentalsWithGameNames.filter(r => r.status === 'active'));
      setRentalHistory(rentalsWithGameNames.filter(r => r.status === 'completed'));
    }, (error) => {
      console.error('Firestore listener error:', error.message);
    });

    if (!scannerRef.current) {
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
                customerId: 'cust1',
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
      scannerRef.current = qrScanner;
      setScanner(qrScanner);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [branchId, navigate]);

  return (
    <Container>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Title>Employee Dashboard - {branchId}</Title>
      </motion.div>

      <Card initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        <CardTitle>Scan QR Code</CardTitle>
        <ScannerContainer>
          <div id="reader"></div>
        </ScannerContainer>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <CardTitle>Active Rentals</CardTitle>
          <List>
            {activeRentals.map(rental => (
              <ListItem key={rental.id} whileHover={{ scale: 1.02 }}>
                <p className="font-medium">Game: {rental.gameName} (ID: {rental.gameId})</p>
                <p>Time: {rental.totalTime} minutes</p>
              </ListItem>
            ))}
          </List>
        </Card>

        <Card initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
          <CardTitle>Rental History</CardTitle>
          <List>
            {rentalHistory.map(rental => (
              <ListItem key={rental.id} whileHover={{ scale: 1.02 }}>
                <p className="font-medium">Game: {rental.gameName} (ID: {rental.gameId})</p>
                <p>Time: {rental.totalTime} minutes | Cost: {rental.cost} bob</p>
              </ListItem>
            ))}
          </List>
        </Card>
      </div>
    </Container>
  );
};

export default EmployeeDashboard;