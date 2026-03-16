/* ============================================
   js/ui.js — UI helpers & DOM utilities
   ============================================ */

// ── Error box ──────────────────────────────────────────
function showError(msg) {
  const box = document.getElementById('errorBox');
  box.textContent = msg;
  box.classList.add('visible');
}

function hideError() {
  document.getElementById('errorBox').classList.remove('visible');
}

// ── File status banner ─────────────────────────────────
function setFileStatus(filename, info) {
  const el = document.getElementById('fileStatus');
  document.getElementById('fileStatusText').textContent = `${filename} — ${info}`;
  el.style.display = 'flex';
}

// ── Loading cycle ──────────────────────────────────────
const LOADING_MESSAGES = [
  'Reading through your experience and skills…',
  'Checking ATS compatibility…',
  'Identifying key strengths…',
  'Formulating suggestions…',
];

let _loadingInterval = null;

function startLoadingCycle() {
  let i = 0;
  document.getElementById('loadingMsg').textContent = LOADING_MESSAGES[0];
  _loadingInterval = setInterval(() => {
    i = (i + 1) % LOADING_MESSAGES.length;
    document.getElementById('loadingMsg').textContent = LOADING_MESSAGES[i];
  }, 2200);
}

function stopLoadingCycle() {
  clearInterval(_loadingInterval);
  _loadingInterval = null;
}

// ── ATS Score ring animation ───────────────────────────
function animateScore(score) {
  const arc = document.getElementById('scoreArc');
  const circumference = 264;
  const color = score >= 75 ? '#00e5b0' : score >= 50 ? '#f59e0b' : '#f43f5e';

  arc.style.stroke = color;
  document.getElementById('scoreNum').style.color = color;

  const offset = circumference - (score / 100) * circumference;
  setTimeout(() => {
    arc.style.transition = 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)';
    arc.style.strokeDashoffset = offset;
  }, 100);

  // Animated count-up
  let current = 0;
  const el = document.getElementById('scoreNum');
  const step = setInterval(() => {
    current = Math.min(current + Math.ceil(score / 40), score);
    el.textContent = current;
    if (current >= score) clearInterval(step);
  }, 30);
}

// ── Populate feedback list ─────────────────────────────
function populateList(id, items) {
  const ul = document.getElementById(id);
  ul.innerHTML = '';
  (items || []).forEach(item => {
    const li = document.createElement('li');
    li.textContent = item;
    ul.appendChild(li);
  });
}

// ── Show results panel ─────────────────────────────────
function showResults(parsed) {
  document.getElementById('atsReasoning').textContent = parsed.ats_reasoning || '';
  animateScore(parsed.ats_score || 0);
  populateList('strengthsList', parsed.strengths);
  populateList('weaknessesList', parsed.weaknesses);
  populateList('suggestionsList', parsed.suggestions);

  document.getElementById('results').style.display = 'block';
  setTimeout(() => document.getElementById('results').classList.add('visible'), 10);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Tab switching ──────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    document.getElementById('pasteTab').style.display  = tab === 'paste'  ? 'block' : 'none';
    document.getElementById('uploadTab').style.display = tab === 'upload' ? 'block' : 'none';
  });
});

// ── Character count ────────────────────────────────────
document.getElementById('resumeText').addEventListener('input', function () {
  document.getElementById('charCount').textContent = `${this.value.length.toLocaleString()} characters`;
});

// ── JD toggle ──────────────────────────────────────────
document.getElementById('jdToggle').addEventListener('change', function () {
  document.getElementById('jdArea').classList.toggle('visible', this.checked);
});
