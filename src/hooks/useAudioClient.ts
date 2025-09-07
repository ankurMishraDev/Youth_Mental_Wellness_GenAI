import { useEffect, useRef, useState, useCallback } from 'react';
import { 
  AUDIO_CONFIG, 
  WEBSOCKET_CONFIG, 
  MESSAGE_TYPES,
  type WebSocketMessage,
  type AudioMessage,
  type TextMessage,
  type UserIdMessage 
} from '../config/config';
import { authService } from '../services/auth';

interface AudioClientCallbacks {
  onReady?: () => void;
  onAudioReceived?: (audioData: string) => void;
  onTextReceived?: (text: string) => void;
  onTurnComplete?: () => void;
  onError?: (error: any) => void;
  onInterrupted?: () => void;
  onSessionIdReceived?: (sessionId: string) => void;
}

class AudioClient {
  public serverUrl: string;
  public ws: WebSocket | null = null;
  public recorder: any = null;
  public audioContext: AudioContext | null = null;
  public isConnected: boolean = false;
  public isRecording: boolean = false;
  public isModelSpeaking: boolean = false;
  public reconnectAttempts: number = 0;
  public maxReconnectAttempts: number = WEBSOCKET_CONFIG.RECONNECT_ATTEMPTS;
  public sessionId: string | null = null;
  
  // Configuration constants (matching server.py)
  public readonly SEND_SAMPLE_RATE = AUDIO_CONFIG.SEND_SAMPLE_RATE;
  public readonly RECEIVE_SAMPLE_RATE = AUDIO_CONFIG.RECEIVE_SAMPLE_RATE;

  public onReady: () => void = () => {};
  public onAudioReceived: (audioData: string) => void = () => {};
  public onTextReceived: (text: string) => void = () => {};
  public onTurnComplete: () => void = () => {};
  public onError: (error: any) => void = () => {};
  public onInterrupted: () => void = () => {};
  public onSessionIdReceived: (sessionId: string) => void = () => {};

  public audioQueue: ArrayBuffer[] = [];
  public isPlaying: boolean = false;
  public currentSource: AudioBufferSourceNode | null = null;

  constructor(serverUrl?: string) {
    this.serverUrl = serverUrl || WEBSOCKET_CONFIG.URL;

    // Clean up any existing audioContexts
    if ((window as any).existingAudioContexts) {
      (window as any).existingAudioContexts.forEach((ctx: AudioContext) => {
        try {
          ctx.close();
        } catch (e) {
          console.error("Error closing existing audio context:", e);
        }
      });
    }

    // Keep track of audio contexts created
    (window as any).existingAudioContexts = (window as any).existingAudioContexts || [];
  }

  async connect(): Promise<void> {
    // Close existing connection if any
    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {
        console.error("Error closing WebSocket:", e);
      }
    }

    // Reset reconnect attempts if this is a new connection
    if (this.reconnectAttempts > this.maxReconnectAttempts) {
      this.reconnectAttempts = 0;
    }

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.serverUrl);

        const connectionTimeout = setTimeout(() => {
          if (!this.isConnected) {
            console.error('WebSocket connection timed out');
            this.tryReconnect();
            reject(new Error('Connection timeout'));
          }
        }, WEBSOCKET_CONFIG.CONNECTION_TIMEOUT);

        this.ws.onopen = () => {
          console.log('WebSocket connection established');
          clearTimeout(connectionTimeout);
          this.reconnectAttempts = 0;
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket connection closed:', event.code, event.reason);
          this.isConnected = false;

          if (event.code !== 1000 && event.code !== 1001) {
            this.tryReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          clearTimeout(connectionTimeout);
          this.onError(error);
          reject(error);
        };

        this.ws.onmessage = async (event) => {
          try {
            console.log('Raw WebSocket message received:', event.data);
            const message = JSON.parse(event.data);

            if (message.type === MESSAGE_TYPES.READY) {
              this.isConnected = true;
              this.onReady();
              resolve();
            } else if (message.type === MESSAGE_TYPES.AUDIO) {
              const audioData = message.data;
              this.onAudioReceived(audioData);
              await this.playAudio(audioData);
            } else if (message.type === MESSAGE_TYPES.TEXT) {
              this.onTextReceived(message.data);
            } else if (message.type === MESSAGE_TYPES.TURN_COMPLETE) {
              this.isModelSpeaking = false;
              this.onTurnComplete();
            } else if (message.type === MESSAGE_TYPES.INTERRUPTED) {
              this.isModelSpeaking = false;
              this.onInterrupted();
            } else if (message.type === MESSAGE_TYPES.ERROR) {
              this.onError(message.data);
            } else if (message.type === MESSAGE_TYPES.SESSION_ID) {
              console.log('Received session ID message:', message);
              this.sessionId = message.data;
              this.onSessionIdReceived(message.data);
            }
          } catch (error) {
            console.error('Error processing message:', error);
          }
        };
      } catch (error) {
        console.error('Error creating WebSocket:', error);
        reject(error);
      }
    });
  }

  async tryReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const backoffTime = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);

    console.log(`Attempting to reconnect in ${backoffTime}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(async () => {
      try {
        await this.connect();
        console.log('Reconnected successfully');
      } catch (error) {
        console.error('Reconnection failed:', error);
      }
    }, backoffTime);
  }

  async initializeAudio(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      if (!this.audioContext || this.audioContext.state === 'closed') {
        console.log("Creating new audio context for recording");
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: this.SEND_SAMPLE_RATE
        });

        (window as any).existingAudioContexts = (window as any).existingAudioContexts || [];
        (window as any).existingAudioContexts.push(this.audioContext);
      }

      const source = this.audioContext.createMediaStreamSource(stream);
      const processor = this.audioContext.createScriptProcessor(AUDIO_CONFIG.PROCESSOR_BUFFER_SIZE, AUDIO_CONFIG.AUDIO_CHANNELS, AUDIO_CONFIG.AUDIO_CHANNELS);

      processor.onaudioprocess = (e) => {
        if (!this.isRecording) return;

        const inputData = e.inputBuffer.getChannelData(0);
        const int16Data = new Int16Array(inputData.length);
        
        for (let i = 0; i < inputData.length; i++) {
          int16Data[i] = Math.max(-32768, Math.min(32767, Math.floor(inputData[i] * 32768)));
        }

        if (this.isConnected && this.isRecording) {
          const audioBuffer = int16Data.buffer;
          const base64Audio = this._arrayBufferToBase64(audioBuffer);

          this.ws?.send(JSON.stringify({
            type: MESSAGE_TYPES.AUDIO,
            data: base64Audio
          }));
        }
      };

      source.connect(processor);
      processor.connect(this.audioContext.destination);

      this.recorder = {
        source: source,
        processor: processor,
        stream: stream
      };

      return true;
    } catch (error) {
      console.error('Error initializing audio:', error);
      this.onError(error);
      return false;
    }
  }

  async startRecording(): Promise<boolean> {
    if (!this.recorder) {
      const initialized = await this.initializeAudio();
      if (!initialized) return false;
    }

    if (!this.isConnected) {
      try {
        await this.connect();
      } catch (error) {
        console.error('Failed to connect to server:', error);
        return false;
      }
    }

    this.isRecording = true;
    return true;
  }

  stopRecording(): void {
    this.isRecording = false;

    if (this.isConnected) {
      this.ws?.send(JSON.stringify({
        type: MESSAGE_TYPES.END
      }));
    }
  }

  async playAudio(base64Audio: string): Promise<void> {
    try {
      const audioData = this._base64ToArrayBuffer(base64Audio);

      if (!this.audioContext || this.audioContext.state === 'closed') {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: this.RECEIVE_SAMPLE_RATE
        });

        (window as any).existingAudioContexts.push(this.audioContext);

        if ((window as any).existingAudioContexts.length > 5) {
          const oldContext = (window as any).existingAudioContexts.shift();
          try {
            if (oldContext && oldContext !== this.audioContext && oldContext.state !== 'closed') {
              oldContext.close();
            }
          } catch (e) {
            console.error("Error closing old audio context:", e);
          }
        }
      }

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.audioQueue.push(audioData);

      if (!this.isPlaying) {
        this.playNextInQueue();
      }

      this.isModelSpeaking = true;
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  }

  playNextInQueue(): void {
    if (this.audioQueue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;

    try {
      if (this.currentSource) {
        try {
          this.currentSource.onended = null;
          this.currentSource.stop();
          this.currentSource.disconnect();
        } catch (e) {
          // Ignore errors if already stopped
        }
        this.currentSource = null;
      }

      const audioData = this.audioQueue.shift()!;
      const int16Array = new Int16Array(audioData);
      const float32Array = new Float32Array(int16Array.length);
      
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }

      const audioBuffer = this.audioContext!.createBuffer(1, float32Array.length, this.RECEIVE_SAMPLE_RATE);
      audioBuffer.getChannelData(0).set(float32Array);

      const source = this.audioContext!.createBufferSource();
      source.buffer = audioBuffer;
      this.currentSource = source;

      source.connect(this.audioContext!.destination);

      source.onended = () => {
        this.currentSource = null;
        this.playNextInQueue();
      };

      source.start(0);
    } catch (error) {
      console.error('Error during audio playback:', error);
      this.currentSource = null;
      setTimeout(() => this.playNextInQueue(), 100);
    }
  }

  interrupt(): void {
    this.isModelSpeaking = false;

    if (this.currentSource) {
      try {
        this.currentSource.onended = null;
        this.currentSource.stop();
        this.currentSource.disconnect();
      } catch (e) {
        // Ignore errors if already stopped
      }
      this.currentSource = null;
    }

    this.audioQueue = [];
    this.isPlaying = false;
  }

  close(): void {
    this.stopRecording();
    this.sessionId = null;
    this.interrupt();
    this.isModelSpeaking = false;

    if (this.recorder) {
      try {
        this.recorder.stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
        this.recorder.source.disconnect();
        this.recorder.processor.disconnect();
        this.recorder = null;
      } catch (e) {
        console.error("Error cleaning up recorder:", e);
      }
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close().catch(e => console.error("Error closing audio context:", e));
      } catch (e) {
        console.error("Error closing audio context:", e);
      }
    }

    if (this.ws) {
      try {
        if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
          this.ws.close();
        }
        this.ws = null;
      } catch (e) {
        console.error("Error closing WebSocket:", e);
      }
    }

    this.isConnected = false;
  }

  private _arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private _base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

export function useAudioClient(serverUrl?: string) {
  const audioClientRef = useRef<AudioClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isModelSpeaking, setIsModelSpeaking] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const initializeAudioClient = useCallback(async (callbacks: AudioClientCallbacks = {}) => {
    if (!audioClientRef.current) {
      audioClientRef.current = new AudioClient(serverUrl);
    }

    const client = audioClientRef.current;

    // Set up callbacks
    client.onReady = () => {
      setIsConnected(true);
      callbacks.onReady?.();
      
      // Automatically send user ID if user is authenticated
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        client.ws?.send(JSON.stringify({
          type: MESSAGE_TYPES.USER_ID,
          data: currentUser.uid
        }));
      }
    };

    client.onAudioReceived = (audioData: string) => {
      setIsModelSpeaking(true);
      callbacks.onAudioReceived?.(audioData);
    };

    client.onTextReceived = (text: string) => {
      callbacks.onTextReceived?.(text);
    };

    client.onTurnComplete = () => {
      setIsModelSpeaking(false);
      callbacks.onTurnComplete?.();
    };

    client.onError = (error: any) => {
      callbacks.onError?.(error);
    };

    client.onInterrupted = () => {
      setIsModelSpeaking(false);
      callbacks.onInterrupted?.();
    };

    client.onSessionIdReceived = (id: string) => {
      setSessionId(id);
      callbacks.onSessionIdReceived?.(id);
    };

    try {
      await client.connect();
    } catch (error) {
      console.error('Failed to initialize audio client:', error);
      throw error;
    }
  }, [serverUrl]);

  const startRecording = useCallback(async () => {
    if (!audioClientRef.current) return false;

    try {
      const success = await audioClientRef.current.startRecording();
      setIsRecording(success);
      return success;
    } catch (error) {
      console.error('Error starting recording:', error);
      return false;
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (!audioClientRef.current) return;

    audioClientRef.current.stopRecording();
    setIsRecording(false);
  }, []);

  const sendUserId = useCallback((userId: string) => {
    if (audioClientRef.current?.ws && audioClientRef.current.isConnected) {
      audioClientRef.current.ws.send(JSON.stringify({
        type: MESSAGE_TYPES.USER_ID,
        data: userId
      }));
    }
  }, []);

  const interrupt = useCallback(() => {
    if (!audioClientRef.current) return;
    audioClientRef.current.interrupt();
    setIsModelSpeaking(false);
  }, []);

  const close = useCallback(() => {
    if (!audioClientRef.current) return;
    
    audioClientRef.current.close();
    setIsConnected(false);
    setIsRecording(false);
    setIsModelSpeaking(false);
    setSessionId(null);
  }, []);

  useEffect(() => {
    return () => {
      close();
    };
  }, [close]);

  return {
    initializeAudioClient,
    startRecording,
    stopRecording,
    sendUserId,
    interrupt,
    close,
    isConnected,
    isRecording,
    isModelSpeaking,
    sessionId
  };
}
