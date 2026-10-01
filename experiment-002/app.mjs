import { config, render, SAMPLE_RATE, LANES, makeReceipt, verifyReceipt, wavBytes, trial } from './core.mjs';

const $ = id => document.getElementById(id);
let current, reference, shifted, receipt, context, source, gain, session;
let preparing = false, verifying = false, playEpoch = 0;
const locked = ['seed', 'bpm', 'delay', 'forge'];
const artifacts = ['wav-a', 'wav-b', 'receipt', 'tamper'];

function buttons() {
  const ready = !!receipt && !preparing;
  for (const id of locked) $(id).disabled = preparing || !!session?.active;
  for (const id of artifacts) $(id).disabled = !ready || !!session?.active || (id === 'tamper' && verifying);
  for (const id of ['play-a', 'play-b', 'begin']) $(id).disabled = !ready || !!session?.active;
  $('stop').disabled = !source;
  $('verify-file').disabled = verifying;
}

function stop() {
  playEpoch++;
  if (source) { source.onended = null; source.stop(); source = null; }
  buttons();
}

async function play(which, label) {
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) throw new Error('This browser has no Web Audio playback. WAV export still works.');
  if (!context) {
    context = new Audio();
    gain = context.createGain(); gain.connect(context.destination);
  }
  const epoch = ++playEpoch;
  await context.resume();
  if (epoch !== playEpoch) return false;
  if (source) { source.onended = null; source.stop(); source = null; }
  const pcm = which === 'A' ? reference.pcm : shifted.pcm;
  const buffer = context.createBuffer(1, pcm.length, SAMPLE_RATE);
  const samples = buffer.getChannelData(0);
  for (let i = 0; i < pcm.length; i++) samples[i] = pcm[i] / 32768;
  gain.gain.value = Number($('volume').value) / 100;
  const playing = context.createBufferSource();
  playing.buffer = buffer; playing.connect(gain); source = playing;
  playing.onended = () => { if (source === playing) { source = null; buttons(); } };
  playing.start(); buttons();
  $('status').textContent = `Playing ${label}. Output ${$('volume').value}%.`;
  if (session?.active) session.plays.push({ trial: session.answers.length + 1, label,
    gain_percent_at_start: Number($('volume').value), device_sample_rate: context.sampleRate });
  return true;
}

function action(fn) {
  return async () => { try { await fn(); } catch (e) { $('status').textContent = e.message; } };
}

function draw() {
  const canvas = $('scope'), ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#424039'; ctx.beginPath(); ctx.moveTo(0, 55); ctx.lineTo(1000, 55); ctx.stroke();
  ctx.strokeStyle = '#e4ad55'; ctx.beginPath();
  for (let x = 0; x < 1000; x++) {
    const from = Math.floor(x * reference.pcm.length / 1000);
    const to = Math.floor((x + 1) * reference.pcm.length / 1000);
    let lo = 0, hi = 0;
    for (let i = from; i < to; i++) { lo = Math.min(lo, reference.pcm[i]); hi = Math.max(hi, reference.pcm[i]); }
    ctx.moveTo(x, 55 - hi * 48 / 16000); ctx.lineTo(x, 55 - lo * 48 / 16000);
  }
  ctx.stroke();
  $('readout').textContent = `${reference.pcm.length} FRAMES / 24 kHz / MONO PCM16 / PEAK ${reference.peak} / CLIPPED ${reference.clipped}`;
  $('tracker').replaceChildren();
  LANES.forEach((name, lane) => {
    const label = document.createElement('span'); label.className = 'lane-name'; label.textContent = name;
    const row = document.createElement('div'); row.className = 'lane-steps';
    for (let step = 0; step < 64; step++) {
      const mark = document.createElement('span');
      const hit = reference.score.events.some(e => e.lane === lane && e.step === step);
      mark.className = 'step' + (step % 16 === 0 ? ' bar' : '') + (hit ? lane === 4 ? ' lead' : ' hit' : '');
      mark.title = `${name} / step ${step + 1}${hit ? ' / hit' : ''}`;
      row.append(mark);
    }
    $('tracker').append(label, row);
  });
}

async function forge(input) {
  if (preparing || session?.active) return;
  const c = config(input);
  preparing = true; stop(); buttons(); $('status').textContent = 'Rendering exact PCM and hashing both versions…';
  try {
    // Let the disabled state paint before CPU work.
    await new Promise(resolve => requestAnimationFrame(resolve));
    const a = render(c), b = render(c, true), r = await makeReceipt(c);
    current = c; reference = a; shifted = b; receipt = r;
    $('seed').value = c.seed; $('bpm').value = String(c.bpm); $('delay').value = String(c.delay);
    draw(); $('hash-a').textContent = r.reference_pcm_sha256; $('hash-b').textContent = r.shifted_pcm_sha256;
    $('difference').textContent = `B delays the CARRIER lane and its echoes by ${c.delay} samples (${(c.delay * 1000 / SAMPLE_RATE).toFixed(3)} ms). A is unchanged. Both have ${a.pcm.length} frames.`;
    $('status').textContent = 'Loop ready. The sub has a receipt. The narrator has no alibi.';
    const url = new URL(location.href); for (const [k,v] of Object.entries(c)) url.searchParams.set(k, v);
    history.replaceState(null, '', url);
  } finally { preparing = false; buttons(); }
}

function download(bytes, type, name) {
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  const link = document.createElement('a'); link.href = url; link.download = name; document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const jsonDownload = (value, name) => download(JSON.stringify(value, null, 2) + '\n', 'application/json', name);

function nextTrial() {
  session.bit = crypto.getRandomValues(new Uint8Array(1))[0] & 1;
  session.heard = new Set();
  $('guess-a').disabled = true; $('guess-b').disabled = true;
  $('trial-label').textContent = `TRIAL ${session.answers.length + 1} / 8`;
}

function finish(aborted = false) {
  stop(); session.active = false; session.aborted = aborted;
  $('session').hidden = true;
  const correct = session.answers.filter(x => x.correct).length;
  $('result').textContent = session.config.delay === 0
    ? `Identical-reference control: ${session.answers.length} answers recorded. A and B have the same PCM; correctness labels carry no hearing information.`
    : `${correct} / ${session.answers.length} correct${aborted ? ' (ended early)' : ''}. This records this session only; it does not establish a hearing threshold.`;
  $('session-export').disabled = false; buttons();
}

function guess(choice) {
  if (!session?.active || session.heard.size !== 3) return;
  session.answers.push(trial(session.bit, choice)); stop();
  if (session.answers.length === 8) finish(); else nextTrial();
}

$('forge-form').addEventListener('submit', e => { e.preventDefault(); action(() => forge({ seed: $('seed').value, bpm: Number($('bpm').value), delay: Number($('delay').value) }))(); });
$('play-a').addEventListener('click', action(() => play('A', 'reference A')));
$('play-b').addEventListener('click', action(() => play('B', 'shifted B')));
$('stop').addEventListener('click', stop);
$('volume').addEventListener('input', () => { $('volume-value').value = $('volume').value + '%'; if (gain) gain.gain.value = Number($('volume').value) / 100; });
$('wav-a').addEventListener('click', () => download(wavBytes(reference.pcm), 'audio/wav', 'receipt-rave-A.wav'));
$('wav-b').addEventListener('click', () => download(wavBytes(shifted.pcm), 'audio/wav', 'receipt-rave-B.wav'));
$('receipt').addEventListener('click', () => jsonDownload(receipt, 'receipt-rave-receipt.json'));

$('begin').addEventListener('click', () => {
  stop(); session = { active: true, config: { ...current }, receipt: { ...receipt }, answers: [], plays: [] };
  $('session').hidden = false; $('result').textContent = ''; $('session-export').disabled = true;
  nextTrial(); buttons();
});
for (const label of ['A', 'B', 'X']) $('hear-' + label.toLowerCase()).addEventListener('click', action(async () => {
  if (!session?.active) return;
  const activeSession = session, activeTrial = session.answers.length;
  const played = await play(label === 'X' ? session.bit ? 'B' : 'A' : label, label);
  if (!played) return;
  if (session !== activeSession || !session.active || session.answers.length !== activeTrial) return;
  session.heard.add(label);
  $('guess-a').disabled = session.heard.size !== 3; $('guess-b').disabled = session.heard.size !== 3;
}));
$('guess-a').addEventListener('click', () => guess('A')); $('guess-b').addEventListener('click', () => guess('B'));
$('abort').addEventListener('click', () => finish(true));
$('session-export').addEventListener('click', () => jsonDownload({ schema: 'rando.listening-record.v1',
  method: 'informal-local-abx', planned_trials: 8, ended_early: session.aborted,
  identical_reference_control: session.config.delay === 0, audio_receipt: session.receipt,
  plays: session.plays, answers: session.answers }, 'receipt-rave-listening.json'));

async function check(value) {
  const result = await verifyReceipt(value);
  $('verify-result').textContent = result.verified ? 'VERIFIED / regenerated score, PCM, WAV, and render statistics agree.'
    : `REJECTED / mismatch: ${result.mismatches.join(', ')}`;
}
async function verifyAction(fn) {
  if (verifying) return;
  verifying = true; buttons(); $('verify-result').textContent = 'Regenerating the receipt…';
  try { await check(await fn()); }
  catch (e) { $('verify-result').textContent = `REJECTED / ${e.message}`; }
  finally { verifying = false; buttons(); }
}
$('tamper').addEventListener('click', () => verifyAction(() => ({ ...receipt,
  reference_pcm_sha256: (receipt.reference_pcm_sha256[0] === '0' ? '1' : '0') + receipt.reference_pcm_sha256.slice(1) })));
$('verify-file').addEventListener('change', () => verifyAction(async () => {
  const file = $('verify-file').files[0];
  if (!file || file.size > 16384) throw new Error('Choose a JSON receipt of at most 16 KiB.');
  return JSON.parse(await file.text());
}));

const url = new URL(location.href);
let initial;
try { initial = config({ seed: url.searchParams.get('seed') ?? undefined,
  bpm: url.searchParams.has('bpm') ? Number(url.searchParams.get('bpm')) : undefined,
  delay: url.searchParams.has('delay') ? Number(url.searchParams.get('delay')) : undefined }); }
catch { initial = config(); }
action(() => forge(initial))();
