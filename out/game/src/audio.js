// Sound, drawn from nothing but the Web Audio oscillator: a few short beeps for the
// kitchen's answers — a chop, a sizzle pop, a serve ding, a mistake buzz. No audio files,
// and nothing plays until the player has pressed a key or clicked (the browser's rule).

export function createAudio() {
  let context = null;

  function ensure() {
    if (context === null) {
      const AudioContext = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
    }
    if (context.state === 'suspended') void context.resume();
    return context;
  }

  /** One oscillator note: frequency, seconds, wave shape and a quick fade out. */
  function beep(frequency, duration, type, volume) {
    const audio = ensure();
    if (audio === null) return;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + duration);
  }

  return {
    /** Called on the first gesture so later sounds are allowed to play. */
    unlock() {
      ensure();
    },
    chop() {
      beep(180, 0.07, 'square', 0.12);
    },
    place() {
      beep(520, 0.08, 'sine', 0.1);
    },
    ready() {
      beep(880, 0.12, 'sine', 0.12);
      window.setTimeout(() => beep(1174, 0.16, 'sine', 0.12), 90);
    },
    serve() {
      beep(660, 0.1, 'triangle', 0.14);
      window.setTimeout(() => beep(880, 0.14, 'triangle', 0.14), 80);
      window.setTimeout(() => beep(1320, 0.2, 'triangle', 0.12), 170);
    },
    mistake() {
      beep(140, 0.22, 'sawtooth', 0.1);
    },
    tick() {
      beep(980, 0.05, 'sine', 0.07);
    },
  };
}
