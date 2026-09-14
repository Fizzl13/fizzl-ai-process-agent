const { buildDecision } = require('./decision-engine');
const { buildActionPlan } = require('./action-planner');

function createCaseId() { return `CASE-${Date.now().toString(36).toUpperCase()}`; }

function safeParse(text) {
  try {
    const cleaned = String(text).replace(/^```json\s*/i, '').replace(/```$/,'').trim();
    const parsed = JSON.parse(cleaned);
    if (!parsed.category || !parsed.intent) throw new Error('Missing required fields');
    parsed.confidence = Math.max(0, Math.min(1, Number(parsed.confidence ?? 0)));
    parsed.required_information = Array.isArray(parsed.required_information) ? parsed.required_information : [];
    return parsed;
  } catch (_) {
    return { category:'unknown', intent:'unknown', urgency:'unknown', sentiment:'unknown', customer_goal:'', required_information:[], confidence:0, parseError:true };
  }
}

async function analyzeWithClaude(message) {
  if (!process.env.ANTHROPIC_API_KEY) return { category:'unknown', intent:'unknown', urgency:'unknown', sentiment:'unknown', customer_goal:'', required_information:['AI analysis unavailable'], confidence:0 };
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';
  const prompt = `Analyseer uitsluitend de volgende klantcase. Geef alleen geldige JSON terug met exact deze velden: category, intent, urgency, sentiment, customer_goal, required_information, confidence. confidence is een getal tussen 0 en 1. Verzin geen klantgegevens. Voer niets uit en beslis niet over financiële of abonnementsuitvoering.\n\nCASE:\n${message}`;
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method:'POST', headers:{'content-type':'application/json','x-api-key':process.env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01'},
    body: JSON.stringify({ model, max_tokens:500, messages:[{role:'user',content:prompt}] })
  });
  if (!response.ok) throw new Error(`Claude HTTP ${response.status}`);
  const data = await response.json();
  const text = Array.isArray(data.content) ? data.content.map(x => x.text || '').join('') : '';
  return safeParse(text);
}

function retrieveKnowledge(kb, analysis) {
  const terms = [analysis.category, analysis.intent, ...(analysis.required_information || [])].filter(Boolean).map(String);
  return (kb.policies || []).filter(p => terms.some(t => `${p.topic} ${p.text}`.toLowerCase().includes(t.toLowerCase()))).slice(0,5);
}

async function processCase({ message, knowledgeBase }) {
  if (!message || typeof message !== 'string') throw new Error('message is required');
  if (message.length > 5000) throw new Error('message too long');
  const caseId = createCaseId();
  const auditLog = [{event:'CASE_RECEIVED', at:new Date().toISOString()}];
  const analysis = await analyzeWithClaude(message);
  auditLog.push({event:'CASE_ANALYZED', at:new Date().toISOString()});
  const knowledge = retrieveKnowledge(knowledgeBase, analysis);
  auditLog.push({event:'KNOWLEDGE_RETRIEVED', at:new Date().toISOString(), count:knowledge.length});
  const decision = buildDecision(analysis);
  auditLog.push({event:'RISK_ASSESSED', at:new Date().toISOString(), risk:decision.risk});
  const actions = buildActionPlan(analysis, decision);
  auditLog.push({event:'ACTION_PLAN_CREATED', at:new Date().toISOString(), actions:actions.length});
  const status = decision.humanRequired ? 'AWAITING_HUMAN_REVIEW' : 'READY_FOR_HUMAN_CHECK';
  return { caseId, status, message, analysis, knowledge, decision, actions, execution:{allowed:false, mode:'DEMO_ONLY'}, auditLog };
}

function approveCase(result) {
  if (!result || !result.caseId) throw new Error('Invalid case');
  if (!result.decision || !result.decision.humanRequired) {
    throw new Error('HUMAN_REVIEW_NOT_REQUIRED');
  }
  result.auditLog.push({event:'HUMAN_APPROVED', at:new Date().toISOString()});
  result.status = 'APPROVED_DEMO_EXECUTION';
  result.execution = { allowed:true, mode:'DEMO_ONLY', result:'SIMULATED_SUCCESS' };
  result.actions = result.actions.map(a => a.type === 'EXECUTE_ACTION' ? {...a, status:'SIMULATED'} : a);
  return result;
}

module.exports = { processCase, approveCase };
