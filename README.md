# CureZ - A Youth Best Listener

Curez is a comprehensive youth mental wellness platform designed to guide young people towards better mental health. Our AI-powered companion, Curie, provides real-time conversations, coping strategies, and resources to support emotional well-being.

## Table of Contents

- [CureZ - A Youth Best Listener](#curez---a-youth-best-listener)
  - [Table of Contents](#table-of-contents)
  - [Why we Created the system](#why-we-created-the-system)
  - [Features](#features)
  - [Installation](#installation)
    - [Prerequisites](#prerequisites)
    - [Backend Setup](#backend-setup)
  - [Usage](#usage)
  - [Technologies](#technologies)
  - [Future Enhancement](#future-enhancement)

## Why we Created the system
In India, mental health is often not taken seriously. Fear of judgment from society and pressure from different sources can intensify this struggle, leaving many people unable to openly talk about their mental well-being. That’s why we created CureZ—an emotional support AI that is available 24×7 to provide comfort, listen without judgment, and help users find relief from anxiety.


## Features

>- **Curie AI Companion**: Converse with AI in real time in one to one talk session.
>- **Multilingual support**:Allow users to interacte with AI using thier own regional langauge.
>- **Anonymous Chat**: Safe space for users to express feelings without judgment
>- **Resource Library**: Access to relaxation techniques, coping methods, and mental health resources
>- **Mood Tracking**: System calculates user mood based on session interactions
>- **Session Persistence**: Users stay logged in across sessions

## Installation

### Prerequisites
- Node.js
- Python 3.x
- Firebase Admin SDK credentials
- Gemini API key

### Backend Setup

1. **Database Server (Node.js + Firebase)**
   ```bash
   cd scripts
   npm install
   # Add your Firebase admin-key.json file to the scripts folder
   npm start
   ```

2. **AI WebSocket Server (Python)**
   ```bash
   # Install Python dependencies
   pip install -r requirements.txt

   # Create .env file with your Gemini API key
   echo "GEMINI_API_KEY=your_api_key_here" > .env

   # Run the WebSocket server
   python server.py
   ```

3. **Frontend (Next.js)**
   The frontend is pre-configured and ready to run.

## Usage

1. Start the database server: `npm start` in the scripts folder
2. Start the Python WebSocket server
3. Run the Next.js app: `npm run dev`
4. Create an account and navigate through the dashboard
5. Start AI sessions with Curie and explore resources

## Technologies

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Backend**: Node.js, Python, Firebase
- **AI**: Gemini API
- **UI Components**: Radix UI, Framer Motion
- **Database**: Firebase

## Future Enhancement
- **More Personalized coping suggestion**
- **Curated Support Groups**
- **Will add system of Journaling**