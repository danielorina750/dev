import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../firebase';
import { doc, setDoc, updateDoc, getDoc, collection, addDoc, onSnapshot } from 'firebase/firestore';
import { motion } from 'framer-motion';
import styled from 'styled-components';

const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #1e3a8a, #9333ea);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Arial', sans-serif;
`;

const Card = styled(motion.div)`
  background: white;
  border-radius: 20px;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
  padding: 2rem;
  width: 100%;
  max-width: 500px;
  text-align: center;
`;

const DashboardTitle = styled.h1`
  color: #1e3a8a;
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 1.5rem;
`;

const GameText = styled.p`
  color: #9333ea;
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1rem;
`;

const TimeText = styled.p`
  color: #333;
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
`;

const CostText = styled.p`
  color: #f97316;
  font-size: 1.75rem;
  font-weight: bold;
`;

const HistorySection = styled.div`
  margin-top: 2rem;
`;

const HistoryTitle = styled.h2`
  color: #1e3a8a;
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1rem;
`;

const HistoryList = styled.ul`
  list-style: none;
  padding: 0;
`;

const HistoryItem = styled.li`
  padding: 0.5rem 0;
  color: #333;
  border-bottom: 1px solid #e5e7eb;
`;

const Button = styled(motion.button)`
  padding: 0.75rem 1.5rem;
  background: ${props => props.pause ? '#9333ea' : '#f97316'};
  color: white;
  font-weight: bold;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  margin: 0 0.5rem;
  transition: background 0.3s;
  &:hover {
    background: ${props => props.pause ? '#7e22ce' : '#ea580c'};
  }
`;

const ErrorText = styled.p`
  color: #e11d48;
  font-size: 1.25rem;
`;

const CustomerDashboard = () => {
  const { branchId, gameId } = useParams();
  const [time, setTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [cost, setCost] = useState(0);
  const [rentalId, setRentalId] = useState(null);
  const [gameName, setGameName] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [rentalHistory, setRentalHistory] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkRentalStatus = async () => {
      console.log('CustomerDashboard: Checking rental for:', gameId, branchId);
      const rentalRef = doc(db, 'rentals', `${gameId}-${branchId}`);
      const gameRef = doc(db, 'games', gameId);
      const historyCollectionRef = collection(db, 'rentals', `${gameId}-${branchId}`, 'history');

      try {
        // Fetch game name
        const gameDoc = await getDoc(gameRef);
        if (gameDoc.exists()) {
          setGameName(gameDoc.data().name);
          console.log('Game name:', gameDoc.data().name);
        } else {
          setError('Game not found in database.');
          console.log('Game not found for ID:', gameId);
          return;
        }

        // Check current rental status
        const rental = await getDoc(rentalRef);
        if (rental.exists()) {
          const rentalData = rental.data();
          console.log('Current rental found:', rentalData);
          setRentalId(rental.id);

          if (rentalData.status === 'active') {
            setTime(rentalData.totalTime || 0);
            setIsActive(true);
            console.log('Active rental loaded, time:', rentalData.totalTime);
          } else if (rentalData.status === 'completed') {
            setCost(rentalData.cost || 0);
            setTime(rentalData.totalTime || 0);
            setIsActive(false);
            console.log('Completed rental loaded, cost:', rentalData.cost);
            // No automatic restart—wait for rescan
          }
        } else {
          // No rental exists—wait for scan to start
          console.log('No rental exists, waiting for scan');
          setIsActive(false);
        }

        // Fetch rental history
        const unsubscribe = onSnapshot(historyCollectionRef, (snapshot) => {
          const history = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            startTime: doc.data().startTime.toDate().toLocaleString(),
            endTime: doc.data().endTime ? doc.data().endTime.toDate().toLocaleString() : null
          }));
          console.log('Rental history fetched:', history);
          setRentalHistory(history);
        }, (error) => {
          console.error('Error fetching history:', error.message);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error('Firestore error:', error.message);
        setError('Failed to access rental or game data: ' + error.message);
      }
    };
    checkRentalStatus();

    let interval;
    if (!isPaused && isActive && !error) {
      console.log('Starting timer');
      interval = setInterval(() => {
        setTime(t => {
          console.log('Timer incremented to:', t + 1);
          return t + 1;
        });
      }, 60000); // 1 minute
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPaused, branchId, gameId, isActive]);

  useEffect(() => {
    if (isPaused && rentalId) {
      const timeout = setTimeout(() => {
        setIsPaused(false);
        console.log('Auto-resuming after 20 minutes');
      }, 20 * 60 * 1000);
      return () => clearTimeout(timeout);
    }
  }, [isPaused, rentalId]);

  const togglePause = async () => {
    console.log('Toggle Pause clicked, current isPaused:', isPaused);
    if (!rentalId || !isActive) {
      console.log('No active rental, cannot pause');
      return;
    }
    try {
      setIsPaused(prev => !prev);
      await updateDoc(doc(db, 'rentals', rentalId), { totalTime: time });
      console.log('Rental updated, paused at:', time);
    } catch (error) {
      console.error('Pause error:', error.message);
      setError('Failed to pause rental: ' + error.message);
    }
  };

  const endSession = async () => {
    console.log('End Session clicked');
    if (!rentalId || !isActive) {
      console.log('No active rental, cannot end session');
      return;
    }
    try {
      const finalCost = time * 3;
      await updateDoc(doc(db, 'rentals', rentalId), { 
        totalTime: time, 
        status: 'completed', 
        cost: finalCost,
        endTime: new Date()
      });
      // Add to history
      const historyCollectionRef = collection(db, 'rentals', rentalId, 'history');
      await addDoc(historyCollectionRef, {
        gameId,
        branchId,
        employeeId: null,
        customerId: 'cust1',
        startTime: new Date(rentalId.split('-')[1]), // Approximate from rental creation
        totalTime: time,
        cost: finalCost,
        endTime: new Date()
      });
      console.log('Session ended, cost:', finalCost);
      setCost(finalCost);
      setIsActive(false);
    } catch (error) {
      console.error('End session error:', error.message);
      setError('Failed to end session: ' + error.message);
    }
  };

  const startNewRental = async () => {
    console.log('Starting new rental via scan');
    const rentalRef = doc(db, 'rentals', `${gameId}-${branchId}`);
    try {
      await setDoc(rentalRef, {
        gameId,
        branchId,
        employeeId: null,
        customerId: 'cust1',
        startTime: new Date(),
        status: 'active',
        totalTime: 0,
      });
      setRentalId(`${gameId}-${branchId}`);
      setTime(0);
      setIsActive(true);
      setCost(0);
      console.log('New rental started');
    } catch (error) {
      console.error('Start rental error:', error.message);
      setError('Failed to start new rental: ' + error.message);
    }
  };

  useEffect(() => {
    // Trigger new rental on mount (simulating scan)
    if (!isActive && !rentalHistory.length) {
      startNewRental();
    }
  }, [branchId, gameId]);

  return (
    <Container>
      <Card initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
        <DashboardTitle>Game Rental - {branchId}</DashboardTitle>
        {error ? (
          <ErrorText>{error}</ErrorText>
        ) : isActive ? (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              <GameText>Game Rented: {gameName}</GameText>
            </motion.div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
              <TimeText>Time Played: {time} minutes</TimeText>
            </motion.div>
            <div className="flex justify-center gap-4">
              <Button
                pause
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={togglePause}
              >
                {isPaused ? 'Resume' : 'Pause'}
              </Button>
              <Button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={endSession}
              >
                End Session
              </Button>
            </div>
          </>
        ) : (
          <p className="text-gray-600 mt-2">Scan to start a new rental.</p>
        )}
        <HistorySection>
          <HistoryTitle>Rental History</HistoryTitle>
          {rentalHistory.length > 0 ? (
            <HistoryList>
              {rentalHistory.map(entry => (
                <HistoryItem key={entry.id}>
                  Started: {entry.startTime} | Time: {entry.totalTime} min | Cost: {entry.cost || 0} bob
                  {entry.endTime && ` | Ended: ${entry.endTime}`}
                </HistoryItem>
              ))}
            </HistoryList>
          ) : (
            <p>No rental history yet.</p>
          )}
        </HistorySection>
      </Card>
    </Container>
  );
};

export default CustomerDashboard;