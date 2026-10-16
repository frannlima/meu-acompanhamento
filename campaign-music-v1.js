/* Trilha instrumental original (síntese local) — campanha Olhares Brasileiros.
   Sem reprodução de gravações comerciais; começa SOMENTE após clique.
   Violão/plucks suaves, baixo e percussão discreta inspirados em bossa/MPB.
   Desliga ao trocar de seção, ocultar a aba ou sair do aplicativo. */
(function (w) {
  "use strict";
  const AudioContextClass = w.AudioContext || w.webkitAudioContext;
  const BPM = 82, HALF_BEAT = 60 / BPM / 2;
  const chords = [
    { bass: 38, notes: [50,54,57,61,64], top: [73,76,74,69] },
    { bass: 35, notes: [47,50,54,57,61], top: [71,73,69,66] },
    { bass: 31, notes: [43,47,50,54,57], top: [69,71,74,69] },
    { bass: 33, notes: [45,49,52,55,59], top: [73,71,69,76] }
  ];
  let ctx = null, master = null, noise = null, tickTimer = null;
  let enabled = false, running = false, nextTime = 0, step = 0;
  let allowed = false;
  const frequency = n => 440 * Math.pow(2, (n - 69) / 12);
  function setup() {
    if (!AudioContextClass) throw new Error("Este navegador não suporta áudio instrumental.");
    if (ctx) return;
    ctx = new AudioContextClass();
    master = ctx.createGain();
    master.gain.value = 0.0001;
    master.connect(ctx.destination);
    noise = ctx.createBuffer(1, Math.round(ctx.sampleRate * .10), ctx.sampleRate);
    const samples = noise.getChannelData(0);
    let seed = 184729;
    for (let i = 0; i < samples.length; i++) {
      seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
      samples[i] = ((seed / 4294967296) * 2 - 1) * (1 - i / samples.length);
    }
  }
  function pluck(pitch, at, duration, volume, style) {
    const osc = ctx.createOscillator(), env = ctx.createGain();
    osc.type = style === "bass" ? "sine" : style === "lead" ? "sine" : "triangle";
    osc.frequency.setValueAtTime(frequency(pitch), at);
    if (style !== "bass") osc.frequency.exponentialRampToValueAtTime(frequency(pitch) * .997, at + .09);
    env.gain.setValueAtTime(.0001, at);
    env.gain.exponentialRampToValueAtTime(Math.max(volume, .0002), at + (style === "bass" ? .023 : .009));
    env.gain.exponentialRampToValueAtTime(.0001, at + duration);
    osc.connect(env); env.connect(master);
    osc.start(at); osc.stop(at + duration + .02);
  }
  function shaker(at, volume) {
    if (!noise) return;
    const src = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), env = ctx.createGain();
    src.buffer = noise;
    filter.type = "highpass"; filter.frequency.value = 3600;
    env.gain.setValueAtTime(.0001, at);
    env.gain.exponentialRampToValueAtTime(volume, at + .004);
    env.gain.exponentialRampToValueAtTime(.0001, at + .055);
    src.connect(filter); filter.connect(env); env.connect(master);
    src.start(at); src.stop(at + .07);
  }
  function scheduleNext() {
    const chord = chords[Math.floor(step / 8) % chords.length];
    const beat = step % 8, at = nextTime;
    if (beat === 0 || beat === 4) pluck(chord.bass + (beat === 4 ? 7 : 0), at, .60, .14, "bass");
    if (beat === 0 || beat === 3 || beat === 5) {
      const order = beat === 3 ? [1,3,4] : beat === 5 ? [0,2,4] : [0,2,3];
      order.forEach((n,i) => pluck(chord.notes[n], at + i * .035, .48, .036, "guitar"));
    }
    if (beat === 2 || beat === 6) pluck(chord.top[(beat === 2 ? 0 : 1) + ((Math.floor(step / 8) % 2) * 2)], at, .65, .043, "lead");
    if (beat % 2 === 1) shaker(at, beat === 3 || beat === 7 ? .014 : .008);
    nextTime += HALF_BEAT;
    step = (step + 1) % 32;
  }
  function schedule() {
    if (!running || !ctx) return;
    while (nextTime < ctx.currentTime + .20) scheduleNext();
  }
  function stop() {
    running = false;
    if (tickTimer !== null) { clearInterval(tickTimer); tickTimer = null; }
    if (ctx && master) master.gain.setTargetAtTime(.0001, ctx.currentTime, .05);
  }
  async function start() {
    if (!enabled || !allowed || running) return;
    setup();
    await ctx.resume();
    if (!enabled || !allowed || running) return;
    running = true;
    nextTime = ctx.currentTime + .07;
    master.gain.setTargetAtTime(.18, ctx.currentTime, .20);
    schedule();
    tickTimer = setInterval(schedule, 95);
  }
  const music = {
    get supported(){ return Boolean(AudioContextClass); },
    get enabled(){ return enabled; },
    get playing(){ return running; },
    toggle: async function(){
      if (!AudioContextClass) throw new Error("Áudio indisponível neste navegador.");
      enabled = !enabled;
      if (!enabled) { stop(); return false; }
      try { await start(); return true; }
      catch (err) { enabled = false; stop(); throw err; }
    },
    sync: function(homeActive) {
      allowed = Boolean(homeActive);
      if (!allowed) { stop(); return; }
      if (enabled && !running) start().catch(err => { console.warn("Trilha da campanha:",err); enabled=false; stop(); });
    },
    stop: function() { enabled = false; allowed = false; stop(); }
  };
  w.RiaCampaignMusic = music;
})(window);
