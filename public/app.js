const $ = id => document.getElementById(id);
const result = $('result');

document.querySelectorAll('.example').forEach(button => {
  button.addEventListener('click', () => {
    $('message').value = button.dataset.case || '';
    $('message').focus();
  });
});

// Confirm the Render-hosted app can reach its own API.
(async () => {
  try {
    const r = await fetch('/health', {cache:'no-store'});
    if (!r.ok) throw new Error('offline');
  } catch {
    const pill = document.querySelector('.live-pill');
    if (pill) pill.innerHTML = '<i style="background:#ff5151;box-shadow:0 0 12px #ff5151"></i> OFFLINE';
  }
})();

const statusText = {
  PENDING: 'In afwachting',
  REQUIRED: 'Goedkeuring nodig',
  BLOCKED: 'Geblokkeerd',
  SIMULATED: 'Gesimuleerd',
  COMPLETED: 'Afgerond'
};

const typeText = {
  ANALYZE: 'Analyse',
  RETRIEVE: 'Informatie zoeken',
  POLICY_CHECK: 'Regels controleren',
  PREPARE_RESPONSE: 'Antwoord voorbereiden',
  PREPARE_OFFER: 'Voorstel voorbereiden',
  HUMAN_REVIEW: 'Menselijke goedkeuring',
  EXECUTE_ACTION: 'Actie uitvoeren'
};

const iconFor = type => ({
  ANALYZE: '⌕', RETRIEVE: '▣', POLICY_CHECK: '◈',
  PREPARE_RESPONSE: '◌', PREPARE_OFFER: '◇',
  HUMAN_REVIEW: '✓', EXECUTE_ACTION: '⚙'
}[type] || '•');

$('run').onclick = async () => {
  const message = $('message').value.trim();
  if (!message) return;
  result.innerHTML = '<div class="muted loading">AI analyseert de klantvraag…</div>';
  try {
    const r = await fetch('/api/process-case', {
      method: 'POST', headers: {'content-type':'application/json'},
      body: JSON.stringify({message})
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Er ging iets mis.');
    window.lastCase = d;
    render(d);
  } catch (e) {
    result.innerHTML = `<div class="blocked">${escapeHtml(e.message)}</div>`;
  }
};

function render(d) {
  const high = d.decision.risk === 'HIGH';
  const approved = d.execution && d.execution.allowed;
  const analysis = d.analysis || {};

  result.innerHTML = `
    <div class="case-head">
      <div><b>${escapeHtml(d.caseId)}</b><div class="muted">${humanStatus(d.status)}</div></div>
      <div class="risk-badge ${d.decision.risk.toLowerCase()}">${riskText(d.decision.risk)}</div>
    </div>

    <div class="reason">${escapeHtml(humanReason(d.decision))}</div>

    <section class="metrics">
      <div><span>VERTROUWEN</span><strong>${confidencePercent(analysis.confidence)}</strong><small>AI-inschatting</small></div>
      <div><span>MENSELIJKE CONTROLE</span><strong>${d.decision.humanRequired ? 'VEREIST' : 'NIET VEREIST'}</strong><small>op basis van risico en zekerheid</small></div>
      <div><span>UITVOERING</span><strong>${approved ? 'DEMO' : 'GEBLOKKEERD'}</strong><small>echte acties worden niet uitgevoerd</small></div>
    </section>

    <section class="friendly-analysis">
      <h2>WAT BEGRIJPT DE AI?</h2>
      <div class="analysis-grid">
        <div><span>Onderwerp</span><strong>${escapeHtml(pretty(analysis.category))}</strong></div>
        <div><span>Wat is er aan de hand?</span><strong>${escapeHtml(pretty(analysis.intent))}</strong></div>
        <div><span>Urgentie</span><strong>${escapeHtml(pretty(analysis.urgency))}</strong></div>
        <div><span>Gevoel van klant</span><strong>${escapeHtml(pretty(analysis.sentiment))}</strong></div>
        <div class="wide"><span>Wat wil de klant?</span><strong>${escapeHtml(analysis.customer_goal || 'Nog niet duidelijk')}</strong></div>
      </div>
    </section>

    <section class="action-section">
      <h2>VOORGESTELDE STAPPEN</h2>
      <p class="section-help">Dit zijn de stappen die de AI voorstelt om deze klantvraag op te lossen.</p>
      <div class="steps">${(d.actions || []).map(actionCard).join('')}</div>
    </section>

    <section class="execution ${approved ? 'approved' : 'blocked-panel'}">
      <div>
        <h2>UITVOERING</h2>
        <div class="execution-title">${approved ? 'DEMO UITVOERING TOEGESTAAN' : 'UITVOERING GEBLOKKEERD'}</div>
        <div class="note">${approved ? 'De menselijke goedkeuring is gegeven. Deze demo voert niets echt uit.' : high ? 'Een medewerker moet eerst controleren en goedkeuren.' : 'Alleen veilige voorbereidende stappen zijn toegestaan.'}</div>
      </div>
      ${d.decision.humanRequired && !approved ? `
        <div class="approval-box">
          <div class="approval-title">👤 Menselijke controle</div>
          <label for="reviewer">Naam medewerker</label>
          <input id="reviewer" value="Demo reviewer" maxlength="80">
          <label for="approvalReason">Waarom keur je dit goed?</label>
          <textarea id="approvalReason" rows="3" maxlength="300">De voorgestelde oplossing is gecontroleerd en mag in deze demo worden gesimuleerd.</textarea>
          <button id="approve">GOEDKEUREN & DEMO UITVOEREN</button>
        </div>` : ''}
    </section>

    <section class="audit">
      <h2>PROCESOVERZICHT</h2>
      <div class="audit-list">${(d.auditLog || []).map(log => `<div><span>${formatTime(log.at)}</span><b>${auditText(log.event)}${log.reviewer ? ' — ' + escapeHtml(log.reviewer) : ''}</b>${log.reason ? `<small>${escapeHtml(log.reason)}</small>` : ''}</div>`).join('')}</div>
    </section>

    <details class="technical"><summary>Technische details voor developers</summary><pre>${escapeHtml(JSON.stringify({analysis:d.analysis, decision:d.decision, actions:d.actions}, null, 2))}</pre></details>
  `;

  const approve = $('approve');
  if (approve) approve.onclick = approveCase;
}

function actionCard(a) {
  const risk = (a.risk || 'LOW').toLowerCase();
  return `<div class="step-card">
    <div class="step-number">${escapeHtml(a.id)}</div>
    <div class="step-main"><div class="step-title"><span class="step-icon">${iconFor(a.type)}</span>${escapeHtml(typeText[a.type] || a.title)}</div><div class="step-desc">${descriptionFor(a.type)}</div></div>
    <div class="step-meta"><span class="badge ${risk}">${riskText(a.risk)}</span><span class="status ${String(a.status).toLowerCase()}">${statusText[a.status] || pretty(a.status)}</span>${a.requiresHuman ? '<span class="human">👤 Menselijke goedkeuring</span>' : ''}</div>
  </div>`;
}

function descriptionFor(type) {
  return ({
    ANALYZE:'We bepalen wat de klant precies vraagt en wat het probleem is.',
    RETRIEVE:'We zoeken de relevante informatie in de kennisbank.',
    POLICY_CHECK:'We controleren welke voorwaarden en regels van toepassing zijn.',
    PREPARE_RESPONSE:'We maken een conceptantwoord op basis van de gevonden informatie.',
    PREPARE_OFFER:'We bereiden een voorstel voor dat past bij de klant.',
    HUMAN_REVIEW:'Een medewerker controleert de voorgestelde oplossing voordat er iets gebeurt.',
    EXECUTE_ACTION:'Een financiële of abonnementsactie kan pas na menselijke goedkeuring worden uitgevoerd.'
  })[type] || 'De AI bereidt deze stap voor.';
}

async function approveCase() {
  const button = $('approve');
  const reviewer = $('reviewer')?.value.trim();
  const reason = $('approvalReason')?.value.trim();
  if (!reviewer || !reason) {
    result.insertAdjacentHTML('afterbegin', '<div class="blocked">Vul naam en reden voor de goedkeuring in.</div>');
    return;
  }
  if (button) { button.disabled = true; button.textContent = 'WORDT GOEDGEKEURD…'; }
  try {
    const r = await fetch('/api/approve-action', {
      method:'POST', headers:{'content-type':'application/json'},
      body:JSON.stringify({caseId:window.lastCase.caseId, reviewer, reason})
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Goedkeuring mislukt.');
    window.lastCase = d;
    render(d);
  } catch(e) {
    result.insertAdjacentHTML('afterbegin', `<div class="blocked">${escapeHtml(e.message)}</div>`);
  }
}

function confidencePercent(v) { const n = Math.round(Math.max(0, Math.min(1, Number(v || 0))) * 100); return n + '%'; }
function riskText(risk) { return ({LOW:'Laag risico', MEDIUM:'Middel risico', HIGH:'Hoog risico'})[risk] || risk; }
function humanStatus(s) { return ({AWAITING_HUMAN_REVIEW:'Wacht op menselijke controle', READY_FOR_HUMAN_CHECK:'Klaar voor controle', APPROVED_DEMO_EXECUTION:'Mens heeft goedgekeurd'})[s] || pretty(s); }
function humanReason(d) { return d.risk === 'HIGH' ? 'Dit gaat over geld of een abonnement. Daarom mag de AI dit niet zelfstandig uitvoeren.' : d.reason || 'De AI kan dit veilig voorbereiden.'; }
function pretty(v) {
  const raw = String(v || 'Onbekend').trim();
  const normalized = raw.toLowerCase().replace(/[-\s]+/g, '_');
  const labels = {
    abonnementen: 'Abonnementen',
    abonnementsbeheer: 'Abonnementsbeheer',
    upgrade_van_abonnement_aanvragen: 'Upgrade van abonnement aanvragen',
    upgrade_van_abonnement: 'Upgrade van abonnement',
    subscription_upgrade: 'Upgrade van abonnement',
    offer: 'Aanbod',
    klacht: 'Klacht',
    facturatie: 'Facturatie',
    onterechte_afschrijving_na_opzegging: 'Onterechte afschrijving na opzegging'
  };
  if (labels[normalized]) return labels[normalized];
  return raw.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
}
function formatTime(v) { try { return new Date(v).toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit',second:'2-digit'}); } catch { return ''; } }
function auditText(e) { return ({CASE_RECEIVED:'Klantvraag ontvangen',CASE_ANALYZED:'Klantvraag geanalyseerd',KNOWLEDGE_RETRIEVED:'Relevante informatie opgezocht',RISK_ASSESSED:'Risiconiveau bepaald',ACTION_PLAN_CREATED:'Stappenplan opgesteld',HUMAN_APPROVED:'Medewerker heeft goedgekeurd'})[e] || pretty(e); }
function escapeHtml(v) { return String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
