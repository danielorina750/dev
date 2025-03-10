import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { db, auth } from '../firebase';
import { collection, onSnapshot, getDoc, addDoc, updateDoc, doc, setDoc } from 'firebase/firestore';
import { motion } from 'framer-motion';
import styled from 'styled-components';

const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #1e3a8a, #9333ea);
  padding: 2rem;
  font-family: 'Arial', sans-serif;
`;

const DashboardTitle = styled.h1`
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: background 0.3s;
  &:hover {
    background: #e5e7eb;
  }
`;

const EndButton = styled(motion.button)`
  padding: 0.5rem 1rem;
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

const TimerText = styled.span`
  color: #9333ea;
  font-weight: 600;
`;

const EmployeeDashboard = () => {
  const [scanner, setScanner] = useState(null);
  const [activeRentals, setActiveRentals] = useState([]);
  const [rentalHistory, setRentalHistory] = useState([]);
  const [branchId, setBranchId] = useState('');
  const navigate = useNavigate();
  const scannerRef = useRef(null);
  const timerRef = useRef(null);

  // Fetch employee branch and handle auth
  useEffect(() => {
    const fetchBranch = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          navigate('/');
          return;
        }
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().role === 'employee') {
          setBranchId(userDoc.data().branchId);
        } else {
          navigate('/');
        }
      } catch (error) {
        console.error('Error fetching branch:', error.message);
        navigate('/');
      }
    };
    fetchBranch();

    return () => {
      if (scanner) {
        scanner.clear().catch((error) => console.error('Scanner cleanup error:', error));
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [navigate, scanner]);

  // Update rental time in Firestore and local state
  const updateRentalTime = useCallback(async (rental) => {
    try {
      const newTime = (rental.totalTime || 0) + 1;
      const rentalRef = doc(db, 'rentals', rental.id);
      await updateDoc(rentalRef, { totalTime: newTime });
      // Update local state to reflect timer immediately
      setActiveRentals((prev) =>
        prev.map((r) => (r.id === rental.id ? { ...r, totalTime: newTime } : r))
      );
    } catch (error) {
      console.error('Error updating rental time:', error.message);
    }
  }, []);

  // Fetch rentals and set up timer
  useEffect(() => {
    if (!branchId) return;

    const unsubscribe = onSnapshot(collection(db, 'rentals'), async (snapshot) => {
      try {
        const rentals = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        const branchRentals = rentals.filter((r) => r.branchId === branchId);

        const rentalsWithGameNames = await Promise.all(
          branchRentals.map(async (rental) => {
            const gameDoc = await getDoc(doc(db, 'games', rental.gameId));
            const gameName = gameDoc.exists() ? gameDoc.data().name : 'Unknown Game';
            return { ...rental, gameName };
          })
        );

        const active = rentalsWithGameNames.filter((r) => r.status === 'active');
        setActiveRentals(active);
        setRentalHistory(rentalsWithGameNames.filter((r) => r.status === 'completed'));
      } catch (error) {
        console.error('Firestore data fetch error:', error.message);
      }
    });

    // Timer to update active rentals every minute
    timerRef.current = setInterval(() => {
      activeRentals.forEach((rental) => {
        if (rental.status === 'active') {
          updateRentalTime(rental);
        }
      });
    }, 60000); // 1 minute

    return () => {
      unsubscribe();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [branchId, activeRentals, updateRentalTime]);

  // Initialize QR scanner
  useEffect(() => {
    if (!branchId || scanner) return;

    const qrScanner = new Html5QrcodeScanner(
      'reader',
      {
        fps: 10, // Reduce FPS for better performance
        qrbox: { width: 250, height: 250 }, // Smaller scan area for precision
        aspectRatio: 1.0,
        disableFlip: false,
        rememberLastUsedCamera: true, // Improve user experience
      },
      false
    );

    qrScanner.render(
      async (decodedText) => {
        try {
          console.log('Scanned QR:', decodedText);
          // Assuming QR code format matches CustomerDashboard: JSON with gameId and branchId
          const qrData = JSON.parse(decodedText);
          const { gameId: scannedGameId, branchId: scannedBranchId } = qrData;

          if (scannedBranchId !== branchId) {
            console.warn('Scanned branch does not match employee branch');
            return;
          }

          const rentalId = `${scannedGameId}-${scannedBranchId}`;
          const rentalRef = doc(db, 'rentals', rentalId);
          const rentalDoc = await getDoc(rentalRef);

          if (rentalDoc.exists() && rentalDoc.data().status === 'active') {
            // End existing rental
            const totalTime = rentalDoc.data().totalTime || 0;
            await updateDoc(rentalRef, {
              status: 'completed',
              cost: totalTime * 3,
              endTime: new Date(),
            });
            console.log('Employee ended rental via scan:', rentalId);
          } else {
            // Start new rental
            await setDoc(rentalRef, {
              gameId: scannedGameId,
              branchId: scannedBranchId,
              employeeId: auth.currentUser.uid,
              customerId: 'cust1', // Should be dynamic if possible
              startTime: new Date(),
              status: 'active',
              totalTime: 0,
            });
            console.log('Employee started new rental via scan:', rentalId);
          }
        } catch (error) {
          console.error('Scan processing error:', error.message);
        }
      },
      (error) => console.log('Scan error:', error.message)
    );

    setScanner(qrScanner);
    scannerRef.current = qrScanner;

    return () => {
      qrScanner.clear().catch((error) => console.error('Scanner cleanup error:', error));
    };
  }, [branchId]);

  // End rental session manually
  const endRentalSession = async (rentalId) => {
    try {
      const rentalRef = doc(db, 'rentals', rentalId);
      const rentalDoc = await getDoc(rentalRef);
      if (rentalDoc.exists() && rentalDoc.data().status === 'active') {
        const totalTime = rentalDoc.data().totalTime || 0;
        await updateDoc(rentalRef, {
          status: 'completed',
          cost: totalTime * 3,
          endTime: new Date(),
        });
        const historyCollectionRef = collection(db, 'rentals', rentalId, 'history');
        await addDoc(historyCollectionRef, {
          gameId: rentalDoc.data().gameId,
          branchId: rentalDoc.data().branchId,
          employeeId: rentalDoc.data().employeeId,
          customerId: rentalDoc.data().customerId,
          startTime: rentalDoc.data().startTime,
          totalTime,
          cost: totalTime * 3,
          endTime: new Date(),
        });
        console.log('Employee ended rental via button:', rentalId);
      }
    } catch (error) {
      console.error('Error ending rental:', error.message);
    }
  };

  return (
    <Container>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <DashboardTitle>Employee Dashboard - {branchId || 'Loading...'}</DashboardTitle>
      </motion.div>

      <Card initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        <CardTitle>Scan QR Code</CardTitle>
        <ScannerContainer>
          <div id="reader" style={{ width: '100%' }}></div>
        </ScannerContainer>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <CardTitle>Active Rentals</CardTitle>
          <List>
            {activeRentals.length > 0 ? (
              activeRentals.map((rental) => (
                <ListItem key={rental.id} whileHover={{ scale: 1.02 }}>
                  <div>
                    <p className="font-medium">
                      Game: {rental.gameName} (ID: {rental.gameId})
                    </p>
                    <p>
                      Time: <TimerText>{rental.totalTime || 0}</TimerText> minutes
                    </p>
                  </div>
                  <EndButton
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => endRentalSession(rental.id)}
                  >
                    End Session
                  </EndButton>
                </ListItem>
              ))
            ) : (
              <p>No active rentals.</p>
            )}
          </List>
        </Card>

        <Card initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
          <CardTitle>Rental History</CardTitle>
          <List>
            {rentalHistory.length > 0 ? (
              rentalHistory.map((rental) => (
                <ListItem key={rental.id} whileHover={{ scale: 1.02 }}>
                  <p className="font-medium">
                    Game: {rental.gameName} (ID: {rental.gameId})
                  </p>
                  <p>
                    Time: {rental.totalTime || 0} minutes | Cost: {rental.cost || 0} bob
                  </p>
                </ListItem>
              ))
            ) : (
              <p>No rental history yet.</p>
            )}
          </List>
        </Card>
      </div>
    </Container>
  );
};

export default EmployeeDashboard;