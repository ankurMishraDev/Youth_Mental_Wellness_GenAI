// src/pages/Dashboard.jsx (or .tsx)
import React, { useEffect, useRef, useState } from "react";
import Navbar from "../components/Navbar";

// ⬇️ Make sure this path points to your AudioClient class
// Example: src/lib/audio-client.js exports default class AudioClient
import AudioClient from "../audio/audio-client";
// const AudioClient = window.AudioClient || null; // fallback if you include it via <script>

export default function Dashboard() {
  // --- UI state ---
  const [showStart, setShowStart] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [connectingText, setConnectingText] = useState("Connecting...");
  const [audioActive, setAudioActive] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);

  // Chat state
  const [messages, setMessages] = useState([
    { id: "m0", sender: "assistant", text: "Hello! I'm YouthGuide, your AI mentor. I'm here to listen. What's on your mind?" },
  ]);

  // Internals
  const chatRef = useRef(null);
  const timerRef = useRef(null);
  const clientRef = useRef(null);
  const currentResponseRef = useRef({ text: "", id: null });

  // Auto-scroll on new messages
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  // Timer
  useEffect(() => {
    if (!showStart && !sessionEnded) {
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [showStart, sessionEnded]);

  const fmt = (n) => n.toString().padStart(2, "0");
  const mm = fmt(Math.floor(seconds / 60));
  const ss = fmt(seconds % 60);

  async function initializeClient() {
    try {
      if (!AudioClient) throw new Error("AudioClient not found. Import it or expose it on window.");
      const client = new AudioClient("ws://localhost:8765",{ enablePlayback: true });
      clientRef.current = client;

      // Wire up callbacks
      client.onReady = () => {
        setConnectingText(`${mm}:${ss}`);
      };

      client.onAudioReceived = () => setAudioActive(true);

      client.onTextReceived = (chunk) => {
        if (!chunk || !chunk.trim()) return;

        const { id } = currentResponseRef.current;
        if (!id) {
          const newId = `a-${Date.now()}`;
          currentResponseRef.current.id = newId;
          currentResponseRef.current.text = chunk;
          setMessages((m) => [...m, { id: newId, sender: "assistant", text: chunk }]);
        } else {
          currentResponseRef.current.text += " " + chunk.trim();
          setMessages((m) =>
            m.map((msg) =>
              msg.id === id ? { ...msg, text: currentResponseRef.current.text } : msg
            )
          );
        }
      };

      client.onTurnComplete = () => {
        setAudioActive(false);
        currentResponseRef.current = { text: "", id: null };
      };

      client.onError = (err) => {
        console.error("Audio client error:", err);
        pushAssistant("Sorry, I encountered an error. Please try again.");
        currentResponseRef.current = { text: "", id: null };
      };

      client.onInterrupted = () => {
        setAudioActive(false);
        client.interrupt?.();
        currentResponseRef.current = { text: "", id: null };
      };

      await client.connect();
      setConnectingText(`${mm}:${ss}`);
    } catch (e) {
      console.error("Failed to initialize audio client:", e);
      pushAssistant("Sorry, I'm having trouble connecting. Please try again later.");
    }
  }

  function pushAssistant(text) {
    setMessages((m) => [...m, { id: `a-${Date.now()}`, sender: "assistant", text }]);
  }

  function pushUserPlaceholder() {
    setMessages((m) => [...m, { id: `u-${Date.now()}`, sender: "user", text: "..." }]);
  }

  function removeLastUserPlaceholder() {
    setMessages((m) => {
      const last = [...m].reverse().find((x) => x.sender === "user");
      if (last && last.text === "...") {
        return m.filter((x) => x.id !== last.id);
      }
      return m;
    });
  }

  async function startSession() {
    setShowStart(false);
    setSessionEnded(false);
    setSeconds(0);
    await initializeClient();
  }

  async function toggleMic() {
    const client = clientRef.current;
    if (!client) return;

    if (isRecording) {
      client.stopRecording();
      setIsRecording(false);
      removeLastUserPlaceholder();
    } else {
      const ok = await client.startRecording();
      if (ok) {
        setIsRecording(true);
        pushUserPlaceholder(); // placeholder bubble
      }
    }
  }

  function endCall() {
    const client = clientRef.current;
    if (isRecording) {
      client?.stopRecording();
      setIsRecording(false);
      removeLastUserPlaceholder();
    }
    client?.close?.();
    clearInterval(timerRef.current);
    setSessionEnded(true);
    pushAssistant("Our session has ended. Remember to take care.");
  }

  return (
    <>
      <Navbar />
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-[linear-gradient(135deg,#1a1a2e_0%,#16213e_100%)] text-[#e0e0e0] overflow-hidden">
        {/* Custom styles ported from your HTML (scoped to this component) */}
        <style>{`
          :root {
            --bg-dark-gradient: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            --glass-bg: rgba(44, 44, 84, 0.5);
            --primary-accent: #6a5acd;
            --secondary-accent: #00bfa5;
            --text-light: #e0e0e0;
            --text-dark: #1a1a2e;
            --danger-red: #e53e3e;
          }
          .call-container {
            background: var(--glass-bg);
            backdrop-filter: blur(15px);
            border: 1px solid rgba(255,255,255,0.1);
          }
          .start-screen-btn {
            background-color: var(--primary-accent);
            transition: transform .2s ease, box-shadow .2s ease;
          }
          .start-screen-btn:hover {
            transform: scale(1.05);
            box-shadow: 0 0 20px rgba(106,90,205,.5);
          }
          .call-control-btn {
            background-color: rgba(255,255,255,0.1);
            transition: background-color .2s ease-in-out;
          }
          .call-control-btn:hover { background-color: rgba(255,255,255,0.2); }
          .mic-button {
            background-color: var(--primary-accent);
            transition: all .3s ease;
            box-shadow: 0 0 0 0 rgba(106,90,205,.7);
          }
          .mic-active {
            background-color: var(--secondary-accent);
            animation: pulse 1.5s infinite;
          }
          @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(0,191,165,.7); }
            70% { box-shadow: 0 0 0 20px rgba(0,191,165,0); }
            100% { box-shadow: 0 0 0 0 rgba(0,191,165,0); }
          }
          .end-call-btn { background-color: var(--danger-red); }
          .chat-message {
            max-width: 80%;
            margin-bottom: 12px;
            padding: 12px 18px;
            border-radius: 20px;
            word-wrap: break-word;
            line-height: 1.5;
          }
          .user-message {
            align-self: flex-end;
            background-color: var(--primary-accent);
            color: white;
            border-bottom-right-radius: 5px;
          }
          .assistant-message {
            align-self: flex-start;
            background-color: rgba(255,255,255,0.15);
            color: var(--text-light);
            border-bottom-left-radius: 5px;
          }
          .audio-wave span {
            display:inline-block;
            width:4px; height:16px; margin:0 2px; border-radius:2px;
            background-color: var(--secondary-accent);
            animation: wave 1.2s infinite ease-in-out;
          }
          .audio-wave span:nth-child(2){ animation-delay:.1s; }
          .audio-wave span:nth-child(3){ animation-delay:.2s; }
          .audio-wave span:nth-child(4){ animation-delay:.3s; }
          .audio-wave span:nth-child(5){ animation-delay:.4s; }
          @keyframes wave {
            0%, 40%, 100% { transform: scaleY(0.4); }
            20% { transform: scaleY(1); }
          }
          ::-webkit-scrollbar { width: 6px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: var(--primary-accent); border-radius: 10px; }
          ::-webkit-scrollbar-thumb:hover { background: var(--secondary-accent); }
        `}</style>

        {/* Start Screen */}
        {showStart ? (
          <div className="text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-teal-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a2 2 0 01-2-2V4a2 2 0 012-2h8a2 2 0 012 2v4z" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold mb-2">Welcome to YouthGuide</h1>
            <p className="text-lg text-gray-300 mb-8">Your personal AI mentor is here to listen.</p>
            <button onClick={startSession} className="start-screen-btn text-white font-bold py-3 px-8 rounded-full text-lg">
              Start Session
            </button>
          </div>
        ) : (
          // Call Container
          <div className="call-container w-full max-w-lg h-[90vh] max-h-[700px] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex-shrink-0 p-4 flex justify-between items-center border-b border-white/10">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-teal-400 rounded-full flex items-center justify-center mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </div>
                <div>
                  <h2 className="font-bold">YouthGuide</h2>
                  <p className="text-xs text-gray-300">{sessionEnded ? `Session ended at ${mm}:${ss}` : connectingText}</p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div ref={chatRef} id="chat-messages" className="flex-grow p-4 flex flex-col overflow-y-auto">
              {messages.map((m) => (
                <div key={m.id} className={`chat-message ${m.sender}-message`}>{m.text}</div>
              ))}
            </div>

            {/* Audio Indicator */}
            <div className={`px-4 pb-2 flex justify-center items-center h-10 ${audioActive ? "" : "hidden"}`}>
              <div className="audio-wave flex items-center justify-center h-5">
                <span></span><span></span><span></span><span></span><span></span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex-shrink-0 p-4 flex justify-around items-center border-t border-white/10">
              <button className="call-control-btn w-14 h-14 rounded-full flex items-center justify-center opacity-50 cursor-not-allowed" disabled>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>

              <button
                onClick={toggleMic}
                className={`mic-button w-20 h-20 rounded-full flex items-center justify-center text-white ${isRecording ? "mic-active" : ""}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </button>

              <button onClick={endCall} className="end-call-btn w-14 h-14 rounded-full flex items-center justify-center text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3.59 1.322a1 1 0 011.053-.22l1.103.44a1 1 0 01.658.943v.393a1 1 0 01-.52.883l-1.148.573a1 1 0 01-1.21-.285l-.13-.2a1 1 0 01.278-1.21l.48-.36a1 1 0 01.94-.095l.407.162a.5.5 0 00.328-.472V3.03a.5.5 0 00-.328-.472L4.643 2.1a1 1 0 01-.53-.943v-.057a1 1 0 01.477-.878zM15.202 3.03c0-.26-.148-.5-.38-.614l-.406-.2a1 1 0 00-.94.095l-.48.36a1 1 0 00-.279 1.21l.13.2a1 1 0 001.21.285l1.148-.574a1 1 0 00.52-.883v-.392a1 1 0 00-.658-.943l-1.103-.441a1 1 0 00-1.054.22L7.643 6.91A1.002 1.002 0 007 7.643v.857a1 1 0 00.279.68l3.78 4.25a1 1 0 001.37-.113l.36-.48a1 1 0 00-.095-.94l-.162-.407a.5.5 0 01.472-.658h.057a1 1 0 00.943-.53l.44-1.104a1 1 0 00-.22-1.053L15.202 3.03z"/>
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
