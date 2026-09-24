import { makeCard, normalizeSeed } from './core.mjs';

const $ = id => document.getElementById(id);
const input = $('seed');
let card;

function render(seed, push = true) {
  try {
    card = makeCard(seed);
    input.value = card.seed;
    $('card-id').textContent = card.id;
    $('question').textContent = card.question;
    $('test').textContent = card.test;
    $('falsifier').textContent = card.falsifier;
    $('ingredients').textContent = Object.entries(card.ingredients).map(([key, value]) => `${key.toUpperCase()}: ${value}`).join(' / ');
    $('feedback').textContent = '';
    if (push) {
      const url = new URL(location.href);
      url.searchParams.set('seed', card.seed);
      history.replaceState(null, '', url);
    }
  } catch (error) {
    $('feedback').textContent = error.message;
    input.focus();
  }
}

function freshSeed() {
  const bytes = new Uint32Array(2);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, x => x.toString(16).padStart(8, '0')).join('-');
}

const fromUrl = new URL(location.href).searchParams.get('seed');
try { render(normalizeSeed(fromUrl ?? 'rando-001')); }
catch { render('rando-001'); }

$('generate').addEventListener('click', () => render(input.value));
input.addEventListener('keydown', event => { if (event.key === 'Enter') render(input.value); });
$('new-seed').addEventListener('click', () => render(freshSeed()));
$('copy-link').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(location.href); $('feedback').textContent = 'Link copied.'; }
  catch { $('feedback').textContent = 'Clipboard unavailable; copy the address bar instead.'; }
});
$('download').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(card, null, 2) + '\n'], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${card.id.toLowerCase()}-receipt.json`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  $('feedback').textContent = 'Receipt downloaded; it records a proposal, not an observation.';
});
