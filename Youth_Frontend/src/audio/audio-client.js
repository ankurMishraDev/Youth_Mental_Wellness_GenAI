// src/audio/audio-client.js
export default class AudioClient {
  constructor(serverUrl = "ws://localhost:8765", opts = {}) {
    this.serverUrl = serverUrl;
    this.ws = null;

    // Upstream capture
    this.audioContext = null;     // single context for capture + (optional) playback
    this.mediaStream = null;
    this.sourceNode = null;
    this.downsampleNode = null;
    this.isRecording = false;

    // Transport / codec settings
    this.targetSampleRate = opts.targetSampleRate || 16000; // mic → server
    this.upstreamMime = `audio/pcm;rate=${this.targetSampleRate}`;
    this.workletUrl = opts.workletUrl || "/resampler-processor.js"; // served from /public

    // Optional built-in playback of server audio (PCM16 only)
    this.enablePlayback = !!opts.enablePlayback; // false => you handle via onAudioReceived
    this.playbackGain = opts.playbackGain ?? 1.0;
    this.playbackCtx = null;      // reuse same context as capture to avoid autoplay issues
    this.playbackQueue = [];
    this.playbackBusy = false;

    // Callbacks to integrate with your UI
    this.onReady = () => {};
    this.onAudioReceived = () => {};    // (payload: {data: Uint8Array|ArrayBuffer, mime: string})
    this.onTextReceived = () => {};     // (text: string)
    this.onTurnComplete = () => {};
    this.onError = () => {};
    this.onInterrupted = () => {};
    this.onSessionId = () => {};        // (id: string)
  }

  // ---------- Connection ----------
  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.serverUrl);
      this.ws.binaryType = "arraybuffer";

      this.ws.onopen = async () => {
        try {
          // Tell server how we'll send audio upstream
          this._sendJson({
            type: "client_settings",
            transport: { audio: "binary", mime: this.upstreamMime },
          });
          this.onReady?.();
          resolve();
        } catch (e) {
          this.onError?.(e);
          reject(e);
        }
      };

      this.ws.onerror = (e) => {
        this.onError?.(e);
        reject(e);
      };

      this.ws.onmessage = (evt) => this._handleServerMessage(evt);
    });
  }

  _sendJson(obj) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj));
    }
  }

  // ---------- Audio capture (mic → server) ----------
  async _ensureContext() {
    if (!this.audioContext) {
      // Do NOT force sampleRate; we’ll resample in the worklet.
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      // Use the same context for playback to reduce autoplay friction
      this.playbackCtx = this.audioContext;

      // Load resampler once
      await this.audioContext.audioWorklet.addModule(this.workletUrl);
    }
  }

  async _ensureMedia() {
    if (!this.mediaStream) {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    }
    if (!this.sourceNode) {
      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
    }
    if (!this.downsampleNode) {
      this.downsampleNode = new AudioWorkletNode(this.audioContext, "downsampler-processor", {
        processorOptions: { targetSampleRate: this.targetSampleRate },
      });
      this.sourceNode.connect(this.downsampleNode);

      // Receive PCM16 frames from worklet and ship to server as binary
      this.downsampleNode.port.onmessage = (e) => {
        if (!this.isRecording) return;
        const pcm16 = e.data; // Int16Array (mono)
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(pcm16.buffer);
        }
      };
    }
  }

  async startRecording() {
    try {
      await this._ensureContext();
      await this._ensureMedia();
      await this.audioContext.resume(); // must be after a user gesture
      this.isRecording = true;
      return true;
    } catch (err) {
      this.onError?.(err);
      return false;
    }
  }

  stopRecording() {
    this.isRecording = false;
  }

  // For autoplay policies: call this from a user click if you only need playback
  async unlockAudio() {
    await this._ensureContext();
    await this.audioContext.resume();
  }

  close() {
    try {
      this.isRecording = false;
      this.ws?.close();
      this.mediaStream?.getTracks().forEach((t) => t.stop());
      // Keep contexts by default for snappy resume; uncomment to fully tear down:
      // this.audioContext?.close(); this.playbackCtx = null; this.audioContext = null;
      // this.sourceNode = null; this.downsampleNode = null; this.mediaStream = null;
    } catch (_) {}
  }

  // Optional helper if you support barge-in/interrupt on server
  interrupt() {
    try {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this._sendJson({ type: "interrupt" });
      }
    } catch {}
  }

  // ---------- Server → client handling ----------
  async _handleServerMessage(evt) {
    const data = evt.data;

    // Binary path (if server ever sends raw audio frames)
    if (data instanceof ArrayBuffer) {
      const u8 = new Uint8Array(data);
      const mime = "audio/pcm;rate=24000"; // best guess; server should send JSON w/ mime
      if (this.enablePlayback && mime.startsWith("audio/pcm")) {
        await this._playPcm16(u8, this._parseRate(mime) || 24000);
      }
      this.onAudioReceived?.({ data: u8, mime });
      return;
    }

    // Text path (JSON protocol)
    if (typeof data === "string") {
      let msg = null;
      try { msg = JSON.parse(data); } catch { /* ignore stray text */ }
      if (!msg || typeof msg !== "object") return;

      switch (msg.type) {
        case "text":
          if (msg.data != null) this.onTextReceived?.(String(msg.data));
          break;

        case "audio": {
          // Server sends base64 + mime
          const b64 = msg.data;
          const mime = msg.mime || "audio/pcm;rate=24000";
          const u8 = this._b64ToU8(b64);

          // Built-in playback for PCM16
          if (this.enablePlayback && mime.startsWith("audio/pcm")) {
            const rate = this._parseRate(mime) || 24000;
            await this._playPcm16(u8, rate);
          }
          this.onAudioReceived?.({ data: u8, mime });
          break;
        }

        case "turn_complete":
          this.onTurnComplete?.();
          break;

        case "interrupted":
          this.onInterrupted?.();
          break;

        case "session_id":
          if (msg.data) this.onSessionId?.(String(msg.data));
          break;

        // You can add handlers for "summary_saved", "pong", etc.
        default:
          // no-op
          break;
      }
    }
  }

  _b64ToU8(b64) {
    // Fast base64 → Uint8Array
    const bin = atob(b64);
    const len = bin.length;
    const u8 = new Uint8Array(len);
    for (let i = 0; i < len; i++) u8[i] = bin.charCodeAt(i);
    return u8;
  }

  _parseRate(mime) {
    const m = /rate\s*=\s*(\d+)/i.exec(mime);
    return m ? parseInt(m[1], 10) : null;
  }

  // ---------- Minimal PCM16 playback (mono) ----------
  async _playPcm16(u8, sampleRate) {
    try {
      if (!this.playbackCtx) {
        await this._ensureContext();
        await this.playbackCtx.resume();
      }
      // Queue chunks to avoid gaps/pops
      this.playbackQueue.push({ u8, sampleRate });
      if (!this.playbackBusy) this._drainPlayback();
    } catch (e) {
      this.onError?.(e);
    }
  }

  async _drainPlayback() {
    if (this.playbackBusy) return;
    this.playbackBusy = true;

    try {
      while (this.playbackQueue.length) {
        const { u8, sampleRate } = this.playbackQueue.shift();
        const f32 = this._pcm16ToFloat32(u8);
        const ctx = this.playbackCtx;

        // Create a buffer with the server's sample rate; the context will resample if needed.
        const buffer = ctx.createBuffer(1, f32.length, sampleRate);
        buffer.getChannelData(0).set(f32);

        const src = ctx.createBufferSource();
        src.buffer = buffer;

        const gain = ctx.createGain();
        gain.gain.value = this.playbackGain;

        src.connect(gain);
        gain.connect(ctx.destination);

        const done = new Promise((res) => (src.onended = res));
        src.start();
        await done;
      }
    } finally {
      this.playbackBusy = false;
    }
  }

  _pcm16ToFloat32(u8) {
    const view = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    const len = u8.byteLength / 2;
    const out = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      const s = view.getInt16(i * 2, true); // little-endian
      out[i] = Math.max(-1, Math.min(1, s / 32768));
    }
    return out;
  }
}
