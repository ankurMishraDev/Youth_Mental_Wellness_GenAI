// public/resampler-processor.js
class DownsamplerProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.inputSampleRate = sampleRate; // context rate (e.g., 48000/44100)
    this.targetRate = options?.processorOptions?.targetSampleRate || 16000;
    this.factor = this.inputSampleRate / this.targetRate;
    this.buffer = [];
  }
  static get parameterDescriptors() { return []; }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const ch = input[0]; // mono
    // tiny FIR to tame aliasing a bit (hackathon-grade)
    const firTaps = [0.25, 0.5, 0.25];
    for (let i = 2; i < ch.length; i++) {
      const y = ch[i]*firTaps[1] + ch[i-1]*firTaps[0] + ch[i-2]*firTaps[2];
      this.buffer.push(y);
    }

    const out = [];
    if (Math.abs(this.factor - Math.round(this.factor)) < 1e-6) {
      const step = Math.round(this.factor);
      for (let i = 0; i < this.buffer.length; i += step) out.push(this.buffer[i]);
    } else {
      let t = 0;
      while (Math.floor(t) + 1 < this.buffer.length) {
        const i = Math.floor(t);
        const frac = t - i;
        out.push(this.buffer[i] + (this.buffer[i+1] - this.buffer[i]) * frac);
        t += this.factor;
      }
    }

    // keep a little tail so continuity across frames is OK
    const tailKeep = 64;
    this.buffer = this.buffer.slice(Math.max(0, this.buffer.length - tailKeep));

    if (out.length) {
      const pcm = new Int16Array(out.length);
      for (let i = 0; i < out.length; i++) {
        const s = Math.max(-1, Math.min(1, out[i]));
        pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      this.port.postMessage(pcm);
    }
    return true;
  }
}
registerProcessor('downsampler-processor', DownsamplerProcessor);
