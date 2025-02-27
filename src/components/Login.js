import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async () => {
    console.log('Attempting login with:', email, password);
    setError('');
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log('Logged in as:', user.email);

      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const role = userDoc.data().role;
        console.log('User role:', role);
        if (role === 'admin') {
          console.log('Navigating to /admin');
          navigate('/admin', { state: { role }, replace: true });
          console.log('Navigation attempted to /admin');
        } else if (role === 'employee') {
          console.log('Navigating to /employee');
          navigate('/employee', { state: { role }, replace: true });
          console.log('Navigation attempted to /employee');
        } else {
          setError('Unknown role. Contact support.');
          console.log('Unknown role:', role);
        }
      } else {
        setError('User data not found in Firestore.');
        console.log('No Firestore data for UID:', user.uid);
      }
    } catch (error) {
      console.error('Login failed:', error.code, error.message);
      setError(error.message);
    }
  };

  return (
    <div>
      <h1>Login</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      <button onClick={handleLogin}>Login</button>
    </div>
  );
};

export default Login;