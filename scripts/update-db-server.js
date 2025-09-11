// Enhanced database server to handle additional user fields
const express = require("express")
const admin = require("firebase-admin")
const cors = require("cors")

// Initialize Firebase Admin SDK
const serviceAccount = require("./admin-key.json")

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://gen-ai-1610e.firebaseio.com",
  projectId: "gen-ai-1610e",
})

const db = admin.firestore()
const app = express()
const port = 3000

app.use(cors())
app.use(express.json())

app.get("/", (req, res) => {
  res.send("YouthGuide DB server is running!")
})

// Enhanced signup route with additional user fields
app.post("/signup", async (req, res) => {
  const { email, password, name, age, gender } = req.body
  try {
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: name,
    })

    // Store additional user data in Firestore
    await db
      .collection("users")
      .doc(userRecord.uid)
      .set({
        email: email,
        name: name || "",
        age: age ? Number.parseInt(age) : null,
        gender: gender || "",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })

    res.status(201).send({ uid: userRecord.uid })
  } catch (error) {
    res.status(400).send({ error: error.message })
  }
})

// Enhanced login route
app.post("/login", async (req, res) => {
  const { email, password } = req.body
  try {
    const userRecord = await admin.auth().getUserByEmail(email)

    // Get additional user data from Firestore
    const userDoc = await db.collection("users").doc(userRecord.uid).get()
    const userData = userDoc.exists ? userDoc.data() : {}

    res.status(200).send({
      uid: userRecord.uid,
      message: "Login successful",
      userData: userData,
    })
  } catch (error) {
    res.status(401).send({ error: "Invalid credentials. Please check your email and password." })
  }
})

// Get user profile
app.get("/user/:uid", async (req, res) => {
  const { uid } = req.params
  try {
    const userDoc = await db.collection("users").doc(uid).get()
    if (!userDoc.exists) {
      res.status(404).send({ error: "User not found." })
    } else {
      res.status(200).send(userDoc.data())
    }
  } catch (error) {
    res.status(500).send({ error: error.message })
  }
})

// Update user profile
app.put("/user/:uid", async (req, res) => {
  const { uid } = req.params
  const { name, age, gender } = req.body
  try {
    await db
      .collection("users")
      .doc(uid)
      .update({
        name: name || "",
        age: age ? Number.parseInt(age) : null,
        gender: gender || "",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
    res.status(200).send({ message: "Profile updated successfully" })
  } catch (error) {
    res.status(500).send({ error: error.message })
  }
})

// Get latest summary route (unchanged)
app.get("/get-summary/:uid", async (req, res) => {
  const { uid } = req.params
  try {
    const userRef = db.collection("users").doc(uid)
    const doc = await userRef.get()
    if (!doc.exists) {
      res.status(404).send({ error: "No summary found for this user." })
    } else {
      res.status(200).send(doc.data())
    }
  } catch (error) {
    res.status(500).send({ error: error.message })
  }
})

// Save summary route (unchanged)
app.post("/save-summary", async (req, res) => {
  const { uid, summary } = req.body
  if (!uid || !summary) {
    return res.status(400).send({ error: "Missing uid or summary" })
  }

  try {
    const userRef = db.collection("users").doc(uid)
    await userRef.set({ latestSummary: summary }, { merge: true })
    res.status(200).send({ message: "Summary saved successfully" })
  } catch (error) {
    res.status(500).send({ error: error.message })
  }
})

app.listen(port, () => {
  console.log(`Enhanced YouthGuide server listening at http://localhost:${port}`)
})
