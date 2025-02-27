import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../firebase';
import { doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';
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
  max-width: 400px;
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

const HistoryText = styled.p`
  color: #333;
  font-size: 1.25rem;
  margin-bottom: 1rem;
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
  &:disabled {
    background: #ccc;
    cursor: not-allowed;
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
  const [rentalHistory, setRentalHistory] = useState(null); // New state for history
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkRentalStatus = async () => {
      console.log('CustomerDashboard: Checking rental for:', gameId, branchId);
      const rentalRef = doc(db, 'rentals', `${gameId}-${branchId}`);
      const gameRef = doc(db, 'games', gameId);

      try {
        const gameDoc = await getDoc(gameRef);
        if (gameDoc.exists()) {
          setGameName(gameDoc.data().name);
          console.log('Game name:', gameDoc.data().name);
        } else {
          setError('Game not found in database.');
          return;
        }

        const rental = await getDoc(rentalRef);
        if (rental.exists()) {
          const rentalData = rental.data();
          console.log('Rental found:', rentalData);
          setRentalId(rental.id);
          if (rentalData.status === 'active') {
            setTime(rentalData.totalTime || 0);
            setIsActive(true);
            setRentalHistory(null); // Clear history if active
          } else if (rentalData.status === 'completed') {
            setCost(rentalData.cost || 0);
            setTime(rentalData.totalTime || 0);
            setIsActive(false);
            setRentalHistory(rentalData); // Show history if completed
          }
        } else {
          console.log('No rental found for this game.');
          setIsActive(false);
          setError('No rental record for this game.');
        }
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
      }, 60000);
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
      console.log('No active rentalId, cannot pause');
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
      console.log('No active rentalId, cannot end session');
      return;
    }
    try {
      const finalCost = time * 3;
      await updateDoc(doc(db, 'rentals', rentalId), { 
        totalTime: time, 
        status: 'completed', 
        cost: finalCost 
      });
      console.log('Session ended, cost:', finalCost);
      setCost(finalCost);
      setIsActive(false);
      setRentalHistory({ gameId, branchId, totalTime: time, cost: finalCost, status: 'completed' });
    } catch (error) {
      console.error('End session error:', error.message);
      setError('Failed to end session: ' + error.message);
    }
  };

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
            {cost > 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
                <CostText>Total Cost: {cost} bob</CostText>
              </motion.div>
            ) : (
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
            )}
          </>
        ) : rentalHistory ? (
          <>
            <GameText>Game: {gameName}</GameText>
            <HistoryText>Time Played: {rentalHistory.totalTime} minutes</HistoryText>
            <CostText>Total Cost: {rentalHistory.cost} bob</CostText>
            <p className="text-gray-600 mt-2">Session completed. Scan again to start a new rental.</p>
          </>
        ) : (
          <ErrorText>No rental history for {gameName || 'this game'}.</ErrorText>
        )}
      </Card>
    </Container>
  );
};

export default CustomerDashboard;