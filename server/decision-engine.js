const RISK_LEVELS = Object.freeze({
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH'
});

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[-\s]+/g, '_');
}

function determineRisk(caseData = {}) {
  const intent = normalize(caseData.intent);
  const category = normalize(caseData.category);

  // Financial/subscription execution or disputes are always HIGH.
  const highRiskPatterns = [
    'refund',
    'terugbetaling',
    'terugstorting',
    'cancellation',
    'opzegging',
    'opzeggen',
    'subscription_change',
    'abonnement_wijzigen',
    'abonnement_stopzetten',
    'payment_dispute',
    'betaling_betwisten',
    'financial_action',
    'onterechte_afschrijving',
    'afschrijving',
    'incasso',
    'terugboeken'
  ];

  if (highRiskPatterns.some(pattern => intent.includes(pattern))) {
    return RISK_LEVELS.HIGH;
  }

  // A billing case that is explicitly a complaint about a charge is HIGH.
  if (
    ['billing', 'facturatie', 'betaling'].some(x => category.includes(x)) &&
    (
      intent.includes('klacht') ||
      intent.includes('dispute') ||
      intent.includes('afschrijving') ||
      intent.includes('betaling')
    )
  ) {
    return RISK_LEVELS.HIGH;
  }

  const mediumRiskPatterns = [
    'offer',
    'upgrade',
    'downgrade',
    'commercial_action',
    'aanbod',
    'upgrade',
    'downgrade'
  ];

  if (mediumRiskPatterns.some(pattern => intent.includes(pattern))) {
    return RISK_LEVELS.MEDIUM;
  }

  return RISK_LEVELS.LOW;
}

function buildDecision(caseData = {}) {
  const risk = determineRisk(caseData);
  const confidence = Number.isFinite(Number(caseData.confidence))
    ? Math.max(0, Math.min(1, Number(caseData.confidence)))
    : 0;

  const lowConfidence = confidence < 0.75;

  const humanRequired =
    risk === RISK_LEVELS.HIGH ||
    risk === RISK_LEVELS.MEDIUM ||
    lowConfidence ||
    caseData.missingInformation === true;

  let reason = 'Safe preparation only.';

  if (risk === RISK_LEVELS.HIGH) {
    reason = 'High-risk financial or subscription case requires human control.';
  } else if (risk === RISK_LEVELS.MEDIUM) {
    reason = 'Commercial action requires human review.';
  } else if (lowConfidence) {
    reason = 'AI confidence is below 0.75; human review required.';
  } else if (caseData.missingInformation === true) {
    reason = 'Required information is missing.';
  }

  return {
    risk,
    confidence,
    humanRequired,
    nextStep: humanRequired ? 'HUMAN_REVIEW' : 'SAFE_PREPARATION',
    executionAllowed: false,
    reason
  };
}

module.exports = {
  RISK_LEVELS,
  determineRisk,
  buildDecision
};
