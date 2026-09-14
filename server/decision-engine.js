const RISK_LEVELS = Object.freeze({ LOW: 'LOW', MEDIUM: 'MEDIUM', HIGH: 'HIGH' });

function determineRisk(caseData = {}) {
  const intent = String(caseData.intent || '').toLowerCase();
  const category = String(caseData.category || '').toLowerCase();
  if (['refund','cancellation','subscription_change','payment_dispute','financial_action'].includes(intent)) return RISK_LEVELS.HIGH;
  if (['offer','upgrade','downgrade','commercial_action'].includes(intent)) return RISK_LEVELS.MEDIUM;
  if (category === 'billing' && ['change','cancel','refund'].some(x => intent.includes(x))) return RISK_LEVELS.HIGH;
  return RISK_LEVELS.LOW;
}

function buildDecision(caseData = {}) {
  const risk = determineRisk(caseData);
  const confidence = Number.isFinite(Number(caseData.confidence)) ? Number(caseData.confidence) : 0;
  const lowConfidence = confidence > 0 && confidence < 0.75;
  const humanRequired = risk === RISK_LEVELS.HIGH || risk === RISK_LEVELS.MEDIUM || lowConfidence || caseData.missingInformation === true;
  return {
    risk,
    confidence,
    humanRequired,
    nextStep: humanRequired ? 'HUMAN_REVIEW' : 'SAFE_PREPARATION',
    executionAllowed: false,
    reason: risk === RISK_LEVELS.HIGH ? 'High-risk action requires human control.' : lowConfidence ? 'Low AI confidence requires human review.' : risk === RISK_LEVELS.MEDIUM ? 'Commercial action requires human review.' : caseData.missingInformation ? 'Required information is missing.' : 'Safe preparation only.'
  };
}

module.exports = { RISK_LEVELS, determineRisk, buildDecision };
