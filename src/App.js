import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import './App.css';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

function App() {
  const [note, setNote] = useState('');
  const [pastNotes, setPastNotes] = useState([]);
  const [user, setUser] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    signInAnonymously(auth).catch(console.error);
    onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        fetchPastNotes(user.uid);
      }
    });
  }, []);

  const fetchPastNotes = async (userId, date = new Date()) => {
    const today = date;
    const timeFrames = [1, 7, 30, 365];
    const notes = [];

    for (const days of timeFrames) {
      const pastDate = new Date(today);
      pastDate.setDate(today.getDate() - days);

      const q = query(collection(db, 'notes'), where('userId', '==', userId), where('date', '==', pastDate.toISOString().split('T')[0]));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        notes.push({ ...doc.data(), id: doc.id });
      });
    }
    setPastNotes(notes);
  };

  const handleDateChange = (date) => {
    if (!user) return; // Ensure user is authenticated
    setSelectedDate(date);
    fetchPastNotes(user.uid, date);
    setNote(''); // Clear note to refresh placeholder
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user || note.trim() === '') return; // Ensure user is authenticated

    try {
      await addDoc(collection(db, 'notes'), {
        userId: user.uid,
        content: note,
        date: selectedDate.toISOString().split('T')[0]
      });
      setNote('');
      fetchPastNotes(user.uid, selectedDate);
    } catch (error) {
      console.error('Error adding document: ', error);
    }
  };

  return (
    <div className="App">
      <h1>Daily Notes</h1>
      <form onSubmit={handleSubmit}>
        <Calendar
          onChange={handleDateChange}
          value={selectedDate}
        />
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={280}
          placeholder={`Write your note for ${selectedDate.toLocaleDateString()}...`}
        />
        <button type="submit">Save Note</button>
      </form>
      <div className="past-notes">
        <h2>Memory Reflections</h2>
        {pastNotes.length > 0 ? (
          pastNotes.map((note) => (
            <div key={note.id} className="note">
              <p>{note.content}</p>
              <small>{note.date}</small>
            </div>
          ))
        ) : (
          <p>No reflections available.</p>
        )}
      </div>
    </div>
  );
}

export default App;
