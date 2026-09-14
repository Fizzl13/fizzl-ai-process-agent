function action(id, title, type, risk, requiresHuman, status = 'PENDING') {
  return { id, title, type, risk, requiresHuman, status };
}

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[-\s]+/g, '_');
}

function isHighRiskIntent(intent) {
  const patterns = [
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
  return patterns.some(pattern => intent.includes(pattern));
}

function isMediumRiskIntent(intent) {
  return [
    'offer',
    'upgrade',
    'downgrade',
    'commercial_action',
    'aanbod'
  ].some(pattern => intent.includes(pattern));
}

function buildActionPlan(caseData = {}, decision = {}) {
  const risk = decision.risk || 'LOW';
  const intent = normalize(caseData.intent);

  const actions = [
    action('A1', 'Analyseer klantvraag', 'ANALYZE', 'LOW', false),
    action('A2', 'Haal relevante kennis op', 'RETRIEVE', 'LOW', false),
    action(
      'A3',
      'Controleer toepasselijke regels',
      'POLICY_CHECK',
      risk,
      risk === 'HIGH',
      risk === 'HIGH' ? 'REQUIRED' : 'PENDING'
    )
  ];

  if (isHighRiskIntent(intent) || risk === 'HIGH') {
    actions.push(
      action('A4', 'Bereid klantantwoord voor', 'PREPARE_RESPONSE', 'MEDIUM', true)
    );
    actions.push(
      action('A5', 'Menselijke goedkeuring', 'HUMAN_REVIEW', 'HIGH', true, 'REQUIRED')
    );
    actions.push(
      action('A6', 'Voer financiële/abonnementsactie uit', 'EXECUTE_ACTION', 'HIGH', true, 'BLOCKED')
    );
  } else if (isMediumRiskIntent(intent) || risk === 'MEDIUM') {
    actions.push(
      action('A4', 'Bereid commercieel voorstel voor', 'PREPARE_OFFER', 'MEDIUM', true)
    );
    actions.push(
      action('A5', 'Menselijke goedkeuring', 'HUMAN_REVIEW', 'MEDIUM', true, 'REQUIRED')
    );
  } else {
    actions.push(
      action('A4', 'Bereid antwoord/advies voor', 'PREPARE_RESPONSE', 'LOW', false)
    );
  }

  return actions;
}

module.exports = { buildActionPlan };
