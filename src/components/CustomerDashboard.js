import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../firebase';
import { doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';

const CustomerDashboard = () => {
  const { branchId, gameId } = useParams();
  const [time, setTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [cost, setCost] = useState(0);
  const [rentalId, setRentalId] = useState(null);

  useEffect(() => {
    const checkOrStartRental = async () => {
      const rentalRef = doc(db, 'rentals', `${gameId}-${branchId}`);
      const rental = await getDoc(rentalRef);
      if (rental.exists() && rental.data().status === 'active') {
        setRentalId(rental.id);
        setTime(rental.data().totalTime || 0);
      } else {
        // Start rental if none exists
        await setDoc(rentalRef, {
          gameId,
          branchId,
          employeeId: null, // No employee for customer scan
          customerId: 'cust1', // Dynamic later
          startTime: new Date(),
          status: 'active',
          totalTime: 0,
        });
        setRentalId(rentalRef.id);
      }
    };
    checkOrStartRental();

    let interval;
    if (!isPaused) {
      interval = setInterval(() => setTime(t => t + 1), 60000); // 1 min
    }
    return () => clearInterval(interval);
  }, [isPaused, branchId, gameId]);

  useEffect(() => {
    if (isPaused) {
      const timeout = setTimeout(() => setIsPaused(false), 20 * 60 * 1000); // 20 min
      return () => clearTimeout(timeout);
    }
  }, [isPaused]);

  const togglePause = async () => {
    setIsPaused(!isPaused);
    if (rentalId) {
      await updateDoc(doc(db, 'rentals', rentalId), { totalTime: time });
    }
  };

  const endSession = async () => {
    const finalCost = time * 3;
    setCost(finalCost);
    if (rentalId) {
      await updateDoc(doc(db, 'rentals', rentalId), { totalTime: time, status: 'completed', cost: finalCost });
    }
  };

  return (
    <div>
      <h1>Game Rental - {branchId}</h1>
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