# [CureZ](https://curez.in/) - Youth's best listener

CureZ is a real-time AI-powered mental wellness platform built to guide and mentor youth through life’s challenges. At the heart of CureZ is Curie, an empathetic AI youth companion that offers secure audio and text sessions, tracks emotional well-being, and recommends personalized coping methods. With its stigma-free, always-available design, CureZ helps young people build resilience, find balance, and take meaningful steps toward better mental health.

<img src="./public/images/Landing.jpg">



## Table of Contents

- [CureZ - Youth's best listener](#curez---youths-best-listener)
  - [Table of Contents](#table-of-contents)
  - [Why we Created the system](#why-we-created-the-system)
  - [Features](#features)
  - [Installation](#installation)
    - [Prerequisites](#prerequisites)
    - [Backend Setup](#backend-setup)
  - [Usage](#usage)
  - [Technologies](#technologies)
  - [Future Enhancement](#future-enhancement)
  - [AI session](#ai-session)

## Why we Created the system
In India, mental health is often not taken seriously. Fear of judgment from society and pressure from different sources can intensify this struggle,making it diffcult for people to openly talk about their mental well-being. CureZ was created to change that an emotional support AI that is available 24×7 to provide comfort, listen without judgment, and help users find relief from anxiety.


## Features
<img src="./public/images/Dashboard.jpg" style="padding-bottom:4px">


>- **Curie AI Companion**: Converse with AI in real time in one to one talk session.
>- **Patient & Consultant Support**: Curie automatically prepares summaries and insights to guide consultants so that each session builds on the user’s progress.
>- **Multilingual support**:Allow users to interacte with AI using thier own regional langauge.
>- **Anonymous Chat**: Safe space for users to express feelings without judgment
>- **Resource Library**: Access to relaxation techniques, coping methods, and mental health resources
>- **Mood Tracking**: System calculates user mood based on session interactions.
>- **AI-Powered Journaling**: Maintain personal journals with AI-assisted reflections, mood tracking, and categorized entries for better self-awareness.
>- **Gamified Wellness Plant**: Celebrate streaks with a virtual plant that grows as users show up for themselves every day, turning consistency into a rewarding habit.

## Installation

### Prerequisites
- Node.js
- Python 3.x
- Firebase Admin SDK credentials
- Google Cloud
- Google Vertex AI API

### Backend Setup

1. **Clone & Install Dependencies**
   ```
   git clone https://github.com/ankurMishraDev/Youth_Mental_Wellness_GenAI.git
   cd Youth_Mental_Wellness_GenAI
   npm install
   # Create a env file
   ```
2. **Adding Env**
   ```bash
   # Make sure to create ENV file in the root directory
   NEXT_PUBLIC_FIREBASE_API_KEY = # Add your firbase API_KEY
   NEXT_PUBLIC_WS_PATH = # Add your Path for the websocket
   DATABASE_SERVICE_URL = # Add your Database URL
   ```
 - Add the Firebase Admin credential JSON at `scripts/admin-server.json` to unlock database access for the Node.js server.
   

3. **Database Server (Node.js + Firebase)**

   ```bash
   cd scripts
   npm install
   nodemon db-server.js
   ```
 - Requires the Firebase Admin SDK credentials referenced above.

4. **AI WebSocket Server (Python)**
   - Enable the Google Vertex AI API on your Google Cloud project.
   - Create a `service-account/` folder in the repository root and place your Google Cloud service account JSON inside it.
   ```bash
   # Install Python dependencies
   pip install -r requirements.txt
   # Run the WebSocket server
   python server.py
   ```

5. **Frontend (Next.js)**
   ```bash
   npm run dev
   ```


<img src="./public/images/signUp.jpg" style="padding-bottom:5px">

## Usage

1. Start the database server: `nodemon db_server.js` in the scripts folder
2. Start the Python WebSocket server from the root directory.
3. Run the Next.js app: `npm run dev`
4. Create an account by filling required fields.
5. After clicking on create Account a mail will be sent to the registered mail id <b>please make sure to check it in spam section</b>
6. Only after authentication Login to the system can take place
7. Start AI sessions with Curie and explore resources.
8. Use the AI-powered journaling feature to maintain personal journals, get AI-assisted reflections, and track your mood.

## Technologies

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Backend**: Node.js, Python, Firebase
- **AI**: Gemini API
- **UI Components**: Radix UI, Framer Motion
- **Database**: Firebase

## Future Enhancement
- **More Personalized coping suggestion**
- **Curated Support Groups**
- **Native Mobile Application**: Expand the experience with a dedicated phone app to keep support within reach anywhere.
- **IoT-Based Wellness Insights**: Pair with wearable devices to surface contextualized recommendations from biometric signals.
- **Predictive Well-Being Analytics**: Use longitudinal data to forecast high-risk periods and intervene proactively.
- **Video-Based Interaction**: Introduce video sessions to deepen connection with consultants and community mentors.


## AI session
<img src="./public/images/CurieAIsession.jpg">


