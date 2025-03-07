import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, updateDoc, getDoc, collection, addDoc, onSnapshot } from 'firebase/firestore';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import jengaImage from './images/jenga.jpg';
import ludoImage from './images/ludo.jpg';
import scrabbleImage from './images/scrabble.jpg';
import chessImage from './images/chess.jpg';
import doOrDrinkImage from './images/do_or_drink.jpg';
import QrReader from 'react-qr-reader'; // Import QR Reader

// Styled Components (unchanged except for new QR scanner styling)
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
  background: ${(props) => (props.pause ? '#9333ea' : props.rescan ? '#1e3a8a' : '#f97316')};
  color: white;
  font-weight: bold;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  margin: 0 0.5rem;
  transition: background 0.3s;
  &:hover {
    background: ${(props) => (props.pause ? '#7e22ce' : props.rescan ? '#1e40af' : '#ea580c')};
  }
`;

const ErrorText = styled.p`
  color: #e11d48;
  font-size: 1.25rem;
`;

const GamesSection = styled.div`
  margin-top: 2rem;
`;

const GamesTitle = styled.h2`
  color: #1e3a8a;
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1rem;
`;

const GamesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
`;

const GameCard = styled.div`
  background: #f9fafb;
  border-radius: 10px;
  padding: 0.5rem;
  text-align: center;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
  &:hover {
    transform: translateY(-5px);
  }
`;

const GameImage = styled.img`
  width: 100%;
  height: 100px;
  object-fit: cover;
  border-radius: 8px;
`;

const GameName = styled.p`
  color: #333;
  font-size: 1rem;
  margin: 0.5rem 0 0;
`;

const GamePrice = styled.p`
  color: #f97316;
  font-size: 1rem;
  font-weight: bold;
`;

const ContactSection = styled.div`
  margin-top: 2rem;
`;

const WhatsAppLink = styled(motion.a)`
  display: inline-flex;
  align-items: center;
  padding: 0.75rem 1.5rem;
  background: #25d366;
  color: white;
  font-weight: bold;
  text-decoration: none;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  transition: background 0.3s;
  &:hover {
    background: #20bf55;
  }
`;

const WhatsAppIcon = styled.span`
  margin-right: 0.5rem;
  font-size: 1.25rem;
`;

const ScannerContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ScannerBox = styled.div`
  background: white;
  padding: 1rem;
  border-radius: 10px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  width: 90%;
  max-width: 400px;
`;

const CloseButton = styled(motion.button)`
  padding: 0.5rem 1rem;
  background: #e11d48;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  margin-top: 1rem;
`;

// Game Data (unchanged)
const games = [
  { name: 'Jenga', price: 'KES 700', image: jengaImage },
  { name: 'Ludo', price: 'KES 800', image: ludoImage },
  { name: 'Scrabble', price: 'KES 900', image: scrabbleImage },
  { name: 'Chess', price: 'KES 1800', image: chessImage },
  { name: 'Do or Drink', price: 'KES 600', image: doOrDrinkImage },
];

const CustomerDashboard = () => {
  const { branchId, gameId } = useParams();
  const navigate = useNavigate();
  const [time, setTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [cost, setCost] = useState(0);
  const [rentalId, setRentalId] = useState(null);
  const [gameName, setGameName] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [rentalHistory, setRentalHistory] = useState([]);
  const [error, setError] = useState(null);
  const [showScanner, setShowScanner] = useState(false); // State to toggle QR scanner

  useEffect(() => {
    const checkRentalStatus = async () => {
      console.log('CustomerDashboard: Checking rental for:', gameId, branchId);
      const rentalRef = doc(db, 'rentals', `${gameId}-${branchId}`);
      const gameRef = doc(db, 'games', gameId);
      const historyCollectionRef = collection(db, 'rentals', `${gameId}-${branchId}`, 'history');

      try {
        const gameDoc = await getDoc(gameRef);
        if (gameDoc.exists()) {
          setGameName(gameDoc.data().name);
          console.log('Game name:', gameDoc.data().name);
        } else {
          setError('Game not found in database.');
          console.log('Game not found for ID:', gameId);
          return;
        }

        const unsubscribeRental = onSnapshot(rentalRef, (doc) => {
          if (doc.exists()) {
            const rentalData = doc.data();
            console.log('Current rental updated:', rentalData);
            setRentalId(doc.id);
            if (rentalData.status === 'active') {
              setTime(rentalData.totalTime || 0);
              setIsActive(true);
              console.log('Active rental loaded, time:', rentalData.totalTime);
            } else {
              setCost(rentalData.cost || 0);
              setTime(rentalData.totalTime || 0);
              setIsActive(false);
              console.log('Non-active rental loaded, cost:', rentalData.cost);
            }
          } else {
            console.log('No rental exists, resetting state');
            setIsActive(false);
            setTime(0);
            setCost(0);
            setRentalId(null);
          }
        }, (error) => {
          console.error('Error listening to rental:', error.message);
          setError('Failed to fetch rental data: ' + error.message);
        });

        const unsubscribeHistory = onSnapshot(historyCollectionRef, (snapshot) => {
          const history = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            startTime: doc.data().startTime.toDate().toLocaleString(),
            endTime: doc.data().endTime ? doc.data().endTime.toDate().toLocaleString() : null,
          }));
          console.log('Rental history fetched:', history);
          setRentalHistory(history);
        }, (error) => {
          console.error('Error fetching history:', error.message);
        });

        return () => {
          unsubscribeRental();
          unsubscribeHistory();
        };
      } catch (error) {
        console.error('Firestore error:', error.message);
        setError('Failed to access rental or game data: ' + error.message);
      }
    };
    checkRentalStatus();
  }, [branchId, gameId]);

  useEffect(() => {
    let interval;
    if (isActive && !isPaused && !error) {
      console.log('Starting timer');
      interval = setInterval(() => {
        setTime((t) => {
          console.log('Timer incremented to:', t + 1);
          return t + 1;
        });
      }, 60000); // 1 minute
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, isPaused, error]);

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
      setIsPaused((prev) => !prev);
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
        endTime: new Date(),
      });
      const historyCollectionRef = collection(db, 'rentals', rentalId, 'history');
      await addDoc(historyCollectionRef, {
        gameId,
        branchId,
        prevailedId: null,
        customerId: 'cust1',
        startTime: new Date(rentalId.split('-')[1]),
        totalTime: time,
        cost: finalCost,
        endTime: new Date(),
      });
      console.log('Session ended, cost:', finalCost);
      setCost(finalCost);
      setIsActive(false);
      setTime(0);
      setIsPaused(false);
    } catch (error) {
      console.error('End session error:', error.message);
      setError('Failed to end session: ' + error.message);
    }
  };

  const handleRescan = () => {
    console.log('Rescan clicked, opening QR scanner');
    setShowScanner(true); // Show the QR scanner
  };

  const handleScan = async (data) => {
    if (data) {
      console.log('QR Code scanned:', data);
      setShowScanner(false); // Hide scanner after successful scan
      try {
        // Assuming QR code contains a URL or JSON with gameId and branchId
        const qrData = JSON.parse(data); // Adjust based on your QR code format
        const newGameId = qrData.gameId;
        const newBranchId = qrData.branchId;

        // Start a new rental
        const rentalRef = doc(db, 'rentals', `${newGameId}-${newBranchId}`);
        await updateDoc(rentalRef, {
          gameId: newGameId,
          branchId: newBranchId,
          status: 'active',
          totalTime: 0,
          startTime: new Date(),
        }, { merge: true }); // Use merge to create if it doesn’t exist

        // Update URL params and state
        navigate(`/dashboard/${newBranchId}/${newGameId}`);
      } catch (error) {
        console.error('Error starting new rental:', error.message);
        setError('Failed to start new rental: ' + error.message);
      }
    }
  };

  const handleScanError = (err) => {
    console.error('QR Scan error:', err);
    setError('Failed to scan QR code: ' + err.message);
    setShowScanner(false);
  };

  const closeScanner = () => {
    setShowScanner(false);
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
            <div className="flex justify-center gap-4">
              <Button pause whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={togglePause}>
                {isPaused ? 'Resume' : 'Pause'}
              </Button>
              <Button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={endSession}>
                End Session
              </Button>
            </div>
          </>
        ) : (
          <>
            {cost > 0 && (
              <>
                <GameText>Game: {gameName}</GameText>
                <TimeText>Time Played: {time} minutes</TimeText>
                <CostText>Total Cost: {cost} bob</CostText>
              </>
            )}
            <Button rescan whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleRescan}>
              Rescan to Start
            </Button>
          </>
        )}
        <HistorySection>
          <HistoryTitle>Rental History</HistoryTitle>
          {rentalHistory.length > 0 ? (
            <HistoryList>
              {rentalHistory.map((entry) => (
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

        <GamesSection>
          <GamesTitle>Available Games</GamesTitle>
          <GamesGrid>
            {games.map((game) => (
              <GameCard key={game.name}>
                <GameImage src={game.image} alt={game.name} />
                <GameName>{game.name}</GameName>
                <GamePrice>{game.price}</GamePrice>
              </GameCard>
            ))}
          </GamesGrid>
        </GamesSection>

        <ContactSection>
          <WhatsAppLink
            href="https://wa.me/c/254725592412"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <WhatsAppIcon>📱</WhatsAppIcon>
            Contact Us on WhatsApp
          </WhatsAppLink>
        </ContactSection>
      </Card>

      {showScanner && (
        <ScannerContainer>
          <ScannerBox>
            <QrReader
              delay={300}
              onError={handleScanError}
              onScan={handleScan}
              style={{ width: '100%' }}
            />
            <CloseButton whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={closeScanner}>
              Close Scanner
            </CloseButton>
          </ScannerBox>
        </ScannerContainer>
      )}
    </Container>
  );
};

export default CustomerDashboard;