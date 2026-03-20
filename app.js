const requirementsInput = document.querySelector('#requirementsFile');
const docsInput = document.querySelector('#docsFiles');
const analyzeButton = document.querySelector('#analyzeButton');
const sampleButton = document.querySelector('#sampleButton');
const statusMessage = document.querySelector('#statusMessage');
const fileSummary = document.querySelector('#fileSummary');
const resultsList = document.querySelector('#resultsList');
const resultsEmpty = document.querySelector('#resultsEmpty');
const summaryEmpty = document.querySelector('#summaryEmpty');
const summaryContent = document.querySelector('#summaryContent');
const requirementsCount = document.querySelector('#requirementsCount');
const coveredCount = document.querySelector('#coveredCount');
const partialCount = document.querySelector('#partialCount');
const missingCount = document.querySelector('#missingCount');
const coveredBar = document.querySelector('#coveredBar');
const partialBar = document.querySelector('#partialBar');
const missingBar = document.querySelector('#missingBar');
const statusFilter = document.querySelector('#statusFilter');
const matchThreshold = document.querySelector('#matchThreshold');
const partialThreshold = document.querySelector('#partialThreshold');
const matchThresholdValue = document.querySelector('#matchThresholdValue');
const partialThresholdValue = document.querySelector('#partialThresholdValue');

const state = {
  analysis: [],
};

const sampleRequirements = `REQ-001: L'utente deve autenticarsi con email e password.
REQ-002: Il sistema deve permettere il reset della password via email.
REQ-003: La dashboard deve mostrare gli ultimi ordini dell'utente.
REQ-004: Il sistema deve esportare report mensili in CSV.
REQ-005: Ogni chiamata API deve essere tracciata con audit log.`;

const sampleDocs = [
  {
    name: 'manuale-prodotto.md',
    content: `Autenticazione\nGli utenti accedono tramite email e password.\n\nRecupero credenziali\nSe l'utente dimentica la password può richiedere una mail di reset con link temporaneo.\n\nDashboard\nLa home mostra il riepilogo con gli ordini recenti.`
  },
  {
    name: 'specifica-api.md',
    content: `Audit\nTutte le richieste API vengono salvate nel registro di audit con utente, timestamp e endpoint.\n\nExport\nI report possono essere esportati in formato PDF.`
  }
];

analyzeButton.addEventListener('click', runAnalysis);
sampleButton.addEventListener('click', loadSampleData);
statusFilter.addEventListener('change', renderResults);
matchThreshold.addEventListener('input', syncThresholdLabels);
partialThreshold.addEventListener('input', syncThresholdLabels);
requirementsInput.addEventListener('change', updateFileSummary);
docsInput.addEventListener('change', updateFileSummary);

syncThresholdLabels();

function syncThresholdLabels() {
  const matchValue = Number(matchThreshold.value);
  const partialValue = Number(partialThreshold.value);

  if (partialValue >= matchValue) {
    partialThreshold.value = Math.max(0.05, matchValue - 0.05).toFixed(2);
  }

  matchThresholdValue.textContent = Number(matchThreshold.value).toFixed(2);
  partialThresholdValue.textContent = Number(partialThreshold.value).toFixed(2);
}

function updateFileSummary() {
  const requirementsName = requirementsInput.files[0]?.name ?? 'nessun file';
  const docsNames = Array.from(docsInput.files).map((file) => file.name);
  fileSummary.innerHTML = `
    <p><strong>Requisiti:</strong> ${escapeHtml(requirementsName)}</p>
    <p><strong>Documenti:</strong> ${docsNames.length ? escapeHtml(docsNames.join(', ')) : 'nessun file'}</p>
  `;
}

async function runAnalysis() {
  syncThresholdLabels();

  let requirementSource;
  let docsSources;

  try {
    requirementSource = requirementsInput.files[0]
      ? await readFile(requirementsInput.files[0])
      : null;
    docsSources = docsInput.files.length
      ? await Promise.all(Array.from(docsInput.files).map(async (file) => ({
          name: file.name,
          content: await readFile(file)
        })))
      : [];
  } catch (error) {
    setStatus(`Errore durante la lettura dei file: ${error.message}`, 'warning');
    return;
  }

  if (!requirementSource || !docsSources.length) {
    setStatus('Carica almeno un file di requisiti e un file di documentazione.', 'warning');
    return;
  }

  analyze(requirementSource, docsSources);
}

function loadSampleData() {
  analyze(sampleRequirements, sampleDocs);
  setStatus('Analisi di esempio completata. Ora puoi sostituire i dati con i tuoi file.', 'success');
  fileSummary.innerHTML = '<p><strong>Dataset:</strong> esempio integrato nell\'app.</p>';
}

function analyze(requirementsText, docs) {
  const requirements = extractRequirements(requirementsText);

  if (!requirements.length) {
    state.analysis = [];
    renderSummary({ covered: 0, partial: 0, missing: 0, total: 0 });
    renderResults();
    setStatus('Non sono riuscito a trovare requisiti interpretabili nel file caricato.', 'warning');
    return;
  }

  const docsIndex = docs.map((doc) => ({
    name: doc.name,
    tokens: tokenize(doc.content),
    original: doc.content
  }));

  const thresholds = {
    covered: Number(matchThreshold.value),
    partial: Number(partialThreshold.value)
  };

  state.analysis = requirements.map((requirement, index) => assessRequirement(requirement, docsIndex, thresholds, index));

  const totals = state.analysis.reduce(
    (acc, item) => {
      acc[item.status] += 1;
      return acc;
    },
    { covered: 0, partial: 0, missing: 0 }
  );

  renderSummary({ ...totals, total: state.analysis.length });
  renderResults();
  setStatus(`Analizzati ${state.analysis.length} requisiti su ${docs.length} documenti.`, 'success');
}

function extractRequirements(text) {
  const trimmed = text.trim();
  if (!trimmed) {
    return [];
  }

  if (trimmed.startsWith('[')) {
    try {
      const data = JSON.parse(trimmed);
      if (Array.isArray(data)) {
        return data.map((item) => typeof item === 'string' ? item : item.requirement || item.text || JSON.stringify(item)).filter(Boolean);
      }
    } catch {
      // fallback to line parsing
    }
  }

  return trimmed
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*\d.)\s]+/, '').trim())
    .filter((line) => line.length > 12);
}

function assessRequirement(requirement, docsIndex, thresholds, index) {
  const requirementTokens = tokenize(requirement);
  let bestMatch = {
    score: 0,
    name: 'Nessun documento compatibile',
    snippet: 'Nessuna evidenza trovata nella documentazione caricata.',
    keywordHits: []
  };

  for (const doc of docsIndex) {
    const sharedKeywords = requirementTokens.filter((token) => doc.tokens.includes(token));
    const score = requirementTokens.length ? sharedKeywords.length / requirementTokens.length : 0;

    if (score > bestMatch.score) {
      bestMatch = {
        score,
        name: doc.name,
        snippet: buildSnippet(requirementTokens, doc.original),
        keywordHits: [...new Set(sharedKeywords)].slice(0, 8)
      };
    }
  }

  const status = bestMatch.score >= thresholds.covered
    ? 'covered'
    : bestMatch.score >= thresholds.partial
      ? 'partial'
      : 'missing';

  return {
    id: index + 1,
    requirement,
    status,
    score: bestMatch.score,
    source: bestMatch.name,
    snippet: bestMatch.snippet,
    keywordHits: bestMatch.keywordHits
  };
}

function buildSnippet(tokens, originalText) {
  const sentences = originalText
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  const ranked = sentences
    .map((sentence) => ({
      sentence,
      score: tokenize(sentence).filter((token) => tokens.includes(token)).length
    }))
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.score
    ? ranked[0].sentence
    : 'Nessuna frase rilevante trovata nel documento migliore.';
}

function renderSummary({ covered, partial, missing, total }) {
  if (!total) {
    summaryEmpty.classList.remove('hidden');
    summaryContent.classList.add('hidden');
    requirementsCount.textContent = '0';
    coveredCount.textContent = '0';
    partialCount.textContent = '0';
    missingCount.textContent = '0';
    coveredBar.style.width = '0%';
    partialBar.style.width = '0%';
    missingBar.style.width = '0%';
    return;
  }

  summaryEmpty.classList.add('hidden');
  summaryContent.classList.remove('hidden');
  requirementsCount.textContent = String(total);
  coveredCount.textContent = String(covered);
  partialCount.textContent = String(partial);
  missingCount.textContent = String(missing);
  coveredBar.style.width = `${(covered / total) * 100}%`;
  partialBar.style.width = `${(partial / total) * 100}%`;
  missingBar.style.width = `${(missing / total) * 100}%`;
}

function renderResults() {
  const filterValue = statusFilter.value;
  const items = filterValue === 'all'
    ? state.analysis
    : state.analysis.filter((item) => item.status === filterValue);

  resultsList.innerHTML = '';

  if (!items.length) {
    resultsEmpty.classList.remove('hidden');
    resultsEmpty.textContent = state.analysis.length
      ? 'Nessun requisito corrisponde al filtro selezionato.'
      : 'I risultati appariranno qui dopo l\'analisi.';
    return;
  }

  resultsEmpty.classList.add('hidden');

  for (const item of items) {
    const article = document.createElement('article');
    article.className = 'result-item';
    article.innerHTML = `
      <div class="result-topline">
        <div>
          <div class="badge ${item.status}">${labelForStatus(item.status)}</div>
          <h3>Requisito ${item.id}</h3>
        </div>
        <div class="score">Copertura ${Math.round(item.score * 100)}%</div>
      </div>
      <p>${escapeHtml(item.requirement)}</p>
      <p class="muted"><strong>Documento migliore:</strong> ${escapeHtml(item.source)}</p>
      <p class="snippet"><strong>Evidenza:</strong> ${escapeHtml(item.snippet)}</p>
      <div class="keyword-list"><strong>Keyword trovate:</strong> ${renderKeywordHits(item.keywordHits)}</div>
    `;
    resultsList.append(article);
  }
}

function renderKeywordHits(keywordHits) {
  if (!keywordHits.length) {
    return '<span class="muted">nessuna keyword condivisa</span>';
  }

  return keywordHits
    .map((keyword) => `<span class="keyword-chip">${escapeHtml(keyword)}</span>`)
    .join('');
}

function labelForStatus(status) {
  return {
    covered: 'Coperto',
    partial: 'Parziale',
    missing: 'Non coperto'
  }[status];
}

function tokenize(text) {
  return [...new Set(normalizeText(text)
    .split(/\s+/)
    .filter((word) => word.length > 3 && !STOPWORDS.has(word)))];
}

function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function setStatus(message, tone) {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${tone}`;
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error(`impossibile leggere ${file.name}`));
    reader.readAsText(file);
  });
}

function escapeHtml(text) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

const STOPWORDS = new Set([
  'alla', 'allo', 'agli', 'anche', 'come', 'con', 'dalla', 'dalle', 'dallo', 'degli', 'della', 'delle', 'dello',
  'deve', 'deve', 'devono', 'degli', 'degli', 'dopo', 'dove', 'dunque', 'essere', 'fare', 'gli', 'html', 'json',
  'linea', 'nelle', 'nello', 'ogni', 'perche', 'quale', 'quali', 'questo', 'quella', 'quello', 'sara', 'sono',
  'sotto', 'sugli', 'sulla', 'sulle', 'sullo', 'tutte', 'tutti', 'utente', 'utenti', 'verso', 'dati', 'sistema',
  'deve', 'must', 'should', 'with', 'that', 'this', 'from', 'your', 'sono', 'nelle', 'delle', 'degli'
]);
