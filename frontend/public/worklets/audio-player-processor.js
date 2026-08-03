class AudioPlayerProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Float32Array(96000);
    this.writeIndex = 0;
    this.readIndex = 0;
    this.isPlaying = false;
    this.isInitialBuffering = true;
    this.initialBufferLength = 12000; // 0.5s at 24kHz
    this.silentFrames = 0;
    this.SILENT_THRESHOLD = 10;

    this.port.onmessage = (event) => {
      if (event.data.type === "audio") {
        this.writeData(event.data.samples);
        this.isPlaying = true;
        this.silentFrames = 0;
      } else if (event.data.type === "clear") {
        this.writeIndex = 0;
        this.readIndex = 0;
        this.isPlaying = false;
        this.isInitialBuffering = true;
        this.silentFrames = 0;
      }
    };
  }

  writeData(samples) {
    const needed = this.writeIndex + samples.length;

    if (needed > this.buffer.length) {
      const unread = this.writeIndex - this.readIndex;
      if (unread + samples.length <= this.buffer.length) {
        this.buffer.copyWithin(0, this.readIndex, this.writeIndex);
        this.writeIndex = unread;
        this.readIndex = 0;
      } else {
        const newSize = Math.max(this.buffer.length * 2, unread + samples.length);
        const newBuffer = new Float32Array(newSize);
        newBuffer.set(this.buffer.subarray(this.readIndex, this.writeIndex));
        this.buffer = newBuffer;
        this.writeIndex = unread;
        this.readIndex = 0;
      }
    }

    this.buffer.set(samples, this.writeIndex);
    this.writeIndex += samples.length;

    if (this.isInitialBuffering && (this.writeIndex - this.readIndex) >= this.initialBufferLength) {
      this.isInitialBuffering = false;
    }
  }

  process(_inputs, outputs) {
    const output = outputs[0];
    if (!output || !output[0]) return true;

    const channel = output[0];
    const frameSize = channel.length;

    if (this.isInitialBuffering) {
      channel.fill(0);
      return true;
    }

    const available = this.writeIndex - this.readIndex;
    const copyLength = Math.min(frameSize, available);

    if (copyLength > 0) {
      channel.set(this.buffer.subarray(this.readIndex, this.readIndex + copyLength));
      this.readIndex += copyLength;
      if (copyLength < frameSize) {
        channel.fill(0, copyLength);
      }
      this.silentFrames = 0;
    } else {
      channel.fill(0);
      if (this.isPlaying) {
        this.silentFrames++;
        if (this.silentFrames >= this.SILENT_THRESHOLD) {
          this.isPlaying = false;
          this.isInitialBuffering = true;
          this.silentFrames = 0;
          this.port.postMessage({ type: "ended" });
        }
      }
    }

    return true;
  }
}

registerProcessor("audio-player-processor", AudioPlayerProcessor);
