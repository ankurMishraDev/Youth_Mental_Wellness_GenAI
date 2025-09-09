const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');

// Initialize Firebase Admin SDK
const serviceAccount = require('./admin-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('YouthGuide DB server is running!');
});

// Signup route
app.post('/signup', async (req, res) => {
  const { email, password } = req.body;
  try {
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
    });
    res.status(201).send({ uid: userRecord.uid });
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

// Login route
app.post('/login', async (req, res) => {
    // NOTE: This is a simplified login for server-side session management.
    // For client-side apps, you would typically use Firebase's client-side SDKs
    // to sign in and then send the ID token to the backend for verification.
    const { email, password } = req.body;
    try {
        const userRecord = await admin.auth().getUserByEmail(email);
        // This is a simplified login and does not actually verify the password.
        // In a real application, you should use the Firebase client-side SDK to sign in the user
        // and then send the ID token to the backend for verification.
        res.status(200).send({ uid: userRecord.uid, message: "Login successful (simulation)" });
    } catch (error) {
        res.status(401).send({ error: "Invalid credentials. Please check your email and password." });
    }
});


// Get latest summary route
app.get('/get-summary/:uid', async (req, res) => {
    const { uid } = req.params;
    try {
        const userRef = db.collection('users').doc(uid);
        const doc = await userRef.get();
        if (!doc.exists) {
            res.status(404).send({ error: 'No summary found for this user.' });
        } else {
            res.status(200).send(doc.data());
        }
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

// Save summary route
app.post('/save-summary', async (req, res) => {
  const { uid, summary } = req.body;
  if (!uid || !summary) {
    return res.status(400).send({ error: 'Missing uid or summary' });
  }

  try {
    const userRef = db.collection('users').doc(uid);
    await userRef.set({ latestSummary: summary }, { merge: true });
    res.status(200).send({ message: 'Summary saved successfully' });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Save name route
app.post('/save-name', async (req, res) => {
    const { uid, name } = req.body;
    if (!uid || !name) {
        return res.status(400).send({ error: 'Missing uid or name' });
    }

    try {
        const userRef = db.collection('users').doc(uid);
        await userRef.set({ name: name }, { merge: true });
        res.status(200).send({ message: 'Name saved successfully' });
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
