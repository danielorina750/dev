import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';

const CustomerDashboard = () => {
  const { branchId, gameId } = useParams();
  const [time, setTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [cost, setCost] = useState(0);
  const [rentalId, setRentalId] = useState(null);

  useEffect(() => {
    const startRental = async () => {
      const rental = await getDoc(doc(db, 'rentals', `${gameId}-${branchId}`)); // Simplified ID
      if (rental.exists() && rental.data().status === 'active') {
        setRentalId(rental.id);
        setTime(rental.data().totalTime || 0);
      }
    };
    startRental();

    let interval;
    if (!isPaused) {
      interval = setInterval(() => setTime(t => t + 1), 60000); // 1 min
    }
    return () => clearInterval(interval);
  }, [isPaused]);

  useEffect(() => {
    if (isPaused) {
      const timeout = setTimeout(() => setIsPaused(false), 20 * 60 * 1000); // 20 min
      return () => clearTimeout(timeout);
    }
  }, [isPaused]);

  const togglePause = async () => {
    setIsPaused(!isPaused);
    await updateDoc(doc(db, 'rentals', rentalId), { totalTime: time });
  };

  const endSession = async () => {
    const finalCost = time * 3;
    setCost(finalCost);
    await updateDoc(doc(db, 'rentals', rentalId), { totalTime: time, status: 'completed', cost: finalCost });
  };

  return (
    <div>
      <h1>Game Rental</h1>
      <p>Time Played: {time} minutes</p>
      {cost > 0 ? (
        <p>Total Cost: {cost} bob</p>
      ) : (
        <>
          <button onClick={togglePause}>{isPaused ? 'Resume' : 'Pause'}</button>
          <button onClick={endSession}>End Session</button>
        </>
      )}
    </div>
  );
};

export default CustomerDashboard;