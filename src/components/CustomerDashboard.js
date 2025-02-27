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

const Title = styled.h1`
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
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkOrStartRental = async () => {
      console.log('CustomerDashboard: Accessing rental for:', gameId, branchId);
      const rentalRef = doc(db, 'rentals', `${gameId}-${branchId}`);
      const gameRef = doc(db, 'games', gameId);

      try {
        const gameDoc = await getDoc(gameRef);
        if (gameDoc.exists()) {
          setGameName(gameDoc.data().name);
        } else {
          setError('Game not found.');
          return;
        }

        const rental = await getDoc(rentalRef);
        if (rental.exists() && rental.data().status === 'active') {
          setRentalId(rental.id);
          setTime(rental.data().totalTime || 0);
        } else {
          await setDoc(rentalRef, {
            gameId,
            branchId,
            employeeId: null,
            customerId: 'cust1',
            startTime: new Date(),
            status: 'active',
            totalTime: 0,
          });
          setRentalId(rentalRef.id);
        }
      } catch (error) {
        console.error('Firestore error:', error.message);
        setError('Failed to access rental or game data: ' + error.message);
      }
    };
    checkOrStartRental();

    let interval;
    if (!isPaused && !error) {
      interval = setInterval(() => setTime(t => t + 1), 60000);
    }
    return () => clearInterval(interval);
  }, [isPaused, branchId, gameId]);

  useEffect(() => {
    if (isPaused) {
      const timeout = setTimeout(() => setIsPaused(false), 20 * 60 * 1000);
      return () => clearTimeout(timeout);
    }
  }, [isPaused]);

  const togglePause = async () => {
    setIsPaused(!isPaused);
    if (rentalId) {
      try {
        await updateDoc(doc(db, 'rentals', rentalId), { totalTime: time });
      } catch (error) {
        console.error('Pause error:', error.message);
      }
    }
  };

  const endSession = async () => {
    const finalCost = time * 3;
    setCost(finalCost);
    if (rentalId) {
      try {
        await updateDoc(doc(db, 'rentals', rentalId), { totalTime: time, status: 'completed', cost: finalCost });
      } catch (error) {
        console.error('End session error:', error.message);
      }
    }
  };

  return (
    <Container>
      <Card initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
        <Title>Game Rental - {branchId}</Title>
        {error ? (
          <ErrorText>{error}</ErrorText>
        ) : (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              <GameText>Game Rented: {gameName || 'Loading...'}</GameText>
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
        )}
      </Card>
    </Container>
  );
};

export default CustomerDashboard;