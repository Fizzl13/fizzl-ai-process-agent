function action(id, title, type, risk, requiresHuman, status = 'PENDING') {
  return { id, title, type, risk, requiresHuman, status };
}

function buildActionPlan(caseData = {}, decision = {}) {
  const risk = decision.risk || 'LOW';
  const intent = String(caseData.intent || '').toLowerCase();
  const actions = [
    action('A1', 'Analyseer klantvraag', 'ANALYZE', 'LOW', false),
    action('A2', 'Haal relevante kennis op', 'RETRIEVE', 'LOW', false),
    action('A3', 'Controleer toepasselijke regels', 'POLICY_CHECK', risk === 'HIGH' ? 'HIGH' : 'LOW', risk === 'HIGH')
  ];

  if (['refund','cancellation','subscription_change','payment_dispute'].includes(intent)) {
    actions.push(action('A4', 'Bereid klantantwoord voor', 'PREPARE_RESPONSE', 'MEDIUM', true));
    actions.push(action('A5', 'Menselijke goedkeuring', 'HUMAN_REVIEW', risk, true, 'REQUIRED'));
    actions.push(action('A6', 'Voer wijziging uit', 'EXECUTE_ACTION', 'HIGH', true, 'BLOCKED'));
  } else if (['offer','upgrade','downgrade','commercial_action'].includes(intent)) {
    actions.push(action('A4', 'Bereid commercieel voorstel voor', 'PREPARE_OFFER', 'MEDIUM', true));
    actions.push(action('A5', 'Menselijke goedkeuring', 'HUMAN_REVIEW', 'MEDIUM', true, 'REQUIRED'));
  } else {
    actions.push(action('A4', 'Bereid antwoord/advies voor', 'PREPARE_RESPONSE', 'LOW', false));
  }

  return actions;
}
module.exports = { buildActionPlan };
