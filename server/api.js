const http = require('http');
const fs = require('fs');
const path = require('path');
const { processCase, approveCase } = require('./process-agent');

const PORT = Number(process.env.PORT || 3000);
const KB = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'knowledge', 'knowledge-base.json'), 'utf8'));
const cases = new Map();
const publicDir = path.join(__dirname, '..', 'public');

function json(res, status, body) { res.writeHead(status, {'content-type':'application/json; charset=utf-8','cache-control':'no-store'}); res.end(JSON.stringify(body)); }
function body(req) { return new Promise((resolve,reject)=>{let s=''; req.on('data',c=>{s+=c;if(s.length>20000) reject(new Error('payload too large'));});req.on('end',()=>{try{resolve(JSON.parse(s||'{}'));}catch(e){reject(e);}});}); }
function serve(req,res) { const file = req.url === '/' ? 'index.html' : req.url.replace(/^\//,''); const safe = path.normalize(file).replace(/^\.\.(\/|\\)/,''); const target=path.join(publicDir,safe); if(!target.startsWith(publicDir) || !fs.existsSync(target)) return json(res,404,{error:'NOT_FOUND'}); const ext=path.extname(target); const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8'}; res.writeHead(200,{'content-type':types[ext]||'application/octet-stream'}); fs.createReadStream(target).pipe(res); }

const server=http.createServer(async (req,res)=>{
  try {
    if(req.method==='GET' && (req.url==='/' || req.url.startsWith('/assets/') || req.url.endsWith('.css') || req.url.endsWith('.js'))) return serve(req,res);
    if(req.method==='GET' && req.url==='/health') return json(res,200,{ok:true,service:'fizzl-ai-process-agent',status:'online'});
    if(req.method==='POST' && req.url==='/api/process-case') { const b=await body(req); const result=await processCase({message:b.message,knowledgeBase:KB}); cases.set(result.caseId,result); return json(res,200,result); }
    if(req.method==='POST' && req.url==='/api/approve-action') { const b=await body(req); const result=cases.get(b.caseId); if(!result) return json(res,404,{error:'CASE_NOT_FOUND'}); const updated=approveCase(result); cases.set(updated.caseId,updated); return json(res,200,updated); }
    json(res,404,{error:'NOT_FOUND'});
  } catch(e) { json(res,400,{error:e.message || 'BAD_REQUEST'}); }
});
server.listen(PORT,()=>console.log(`FIZZL AI Process Agent running on port ${PORT}`));
