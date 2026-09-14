const test=require('node:test');const assert=require('node:assert/strict');const {buildDecision}=require('../server/decision-engine');const {buildActionPlan}=require('../server/action-planner');
test('refund is HIGH risk and blocked',()=>{const d=buildDecision({category:'billing',intent:'refund',confidence:.95});assert.equal(d.risk,'HIGH');assert.equal(d.humanRequired,true);assert.equal(d.executionAllowed,false);const a=buildActionPlan({intent:'refund'},d);assert.equal(a.at(-1).status,'BLOCKED')});
test('information question is LOW risk',()=>{const d=buildDecision({category:'information',intent:'question',confidence:.95});assert.equal(d.risk,'LOW');assert.equal(d.humanRequired,false)});
test('low confidence forces review',()=>{const d=buildDecision({category:'unknown',intent:'unknown',confidence:.4});assert.equal(d.humanRequired,true)});
test('commercial offer requires review',()=>{const d=buildDecision({category:'sales',intent:'offer',confidence:.9});assert.equal(d.risk,'MEDIUM');assert.equal(d.humanRequired,true)});

test('incorrect charge complaint is HIGH risk',()=>{
  const d=buildDecision({
    category:'facturatie',
    intent:'klacht_over_onterechte_afschrijving',
    urgency:'hoog',
    confidence:.85
  });
  assert.equal(d.risk,'HIGH');
  assert.equal(d.humanRequired,true);
  assert.equal(d.executionAllowed,false);
  const a=buildActionPlan({intent:'klacht_over_onterechte_afschrijving'},d);
  assert.equal(a.at(-1).status,'BLOCKED');
});

test('low confidence is reviewed even when otherwise low risk',()=>{
  const d=buildDecision({category:'information',intent:'question',confidence:.5});
  assert.equal(d.risk,'LOW');
  assert.equal(d.humanRequired,true);
});

test('high-risk policy check keeps correct action metadata',()=>{
  const d=buildDecision({
    category:'facturatie',
    intent:'klacht_over_onterechte_afschrijving',
    confidence:.85
  });
  const a=buildActionPlan({intent:'klacht_over_onterechte_afschrijving'},d);
  assert.equal(a[2].type,'POLICY_CHECK');
  assert.equal(a[2].risk,'HIGH');
  assert.equal(a[2].requiresHuman,true);
  assert.equal(a[2].status,'REQUIRED');
});
