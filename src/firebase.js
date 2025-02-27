import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: "AIzaSyCokto_f-rtYu5eLDnQqjX_Vi2ihIjZv4E",
    authDomain: "gamerentalsystem.firebaseapp.com",
    projectId: "gamerentalsystem",
    storageBucket: "gamerentalsystem.firebasestorage.app",
    messagingSenderId: "883966873547",
    appId: "1:883966873547:web:8397324f25825b15be704e",
    measurementId: "G-DV0XVZQ64S"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);


