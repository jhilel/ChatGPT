import http from 'node:http';
import {readFile} from 'node:fs/promises';
const LOOPBACK='http://127.0.0.1:11434';
export const DEFAULT_MODEL='qwen3.5:4b';
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
async function boundedJson(stream,max){
 let text='';for await(const chunk of stream){text+=chunk;if(Buffer.byteLength(text)>max)throw fail('Request is too large.',413);}
 try{return JSON.parse(text);}catch{throw fail('Invalid JSON request.');}
}
async function readResponse(response,max=160000){
 if(!response.body){const text=await response.text();if(text.length>max)throw fail('Ollama response is too large.',502);return JSON.parse(text);}
 const reader=response.body.getReader();let bytes=0,text='';const decoder=new TextDecoder();
 try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>max)throw fail('Ollama response is too large.',502);text+=decoder.decode(value,{stream:true});}text+=decoder.decode();return JSON.parse(text);}
 finally{await reader.cancel().catch(()=>{});}
}
export function createAppServer({fetchImpl=fetch,publicRoot=new URL('../public/',import.meta.url),port=3000}={}){
 let busy=false;
 async function local(path,options={}){
  try{
   const response=await fetchImpl(LOOPBACK+path,{...options,redirect:'error',signal:options.signal||AbortSignal.timeout(5000)});
   if(!response.ok)throw fail(response.status===404?'Model or API not found. Pull the selected model in Ollama and update Ollama if needed.':'Ollama rejected the request ('+response.status+').',502);
   return await readResponse(response);
  }catch(e){
   if(e.status)throw e;
   if(e.name==='TimeoutError'||e.name==='AbortError')throw fail('Local AI timed out or was cancelled. Try fewer cues or a smaller model; no fallback was used.',504);
   throw fail('Cannot reach local Ollama at 127.0.0.1:11434. Start Ollama on this computer, then Check connection.',503);
  }
 }
 const server=http.createServer(async(req,res)=>{
  const send=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));};
  const host=req.headers.host,allowed=['127.0.0.1:'+server.address().port,'localhost:'+server.address().port];
  if(!allowed.includes(host)||req.headers.origin&&req.headers.origin!=='http://'+host){send(403,{error:'Local same-origin requests only.'});return;}
  try{
   if(req.url==='/api/models'&&req.method==='GET'){
    const result=await local('/api/tags');
    send(200,{defaultModel:DEFAULT_MODEL,models:(result.models||[]).filter(m=>!m.remote_host&&!m.remote_model&&!/cloud/i.test(m.name)).map(m=>({name:m.name,size:m.size}))});return;
   }
   if(req.url==='/api/lighting-plan'&&req.method==='POST'){
    if(!/^application\/json\b/i.test(req.headers['content-type']||''))throw fail('Expected application/json.',415);
    if(busy)throw fail('A local generation is already running. Wait or cancel it before starting another.',429);
    const body=await boundedJson(req,100000);
    const allowedKeys=['model','messages','stream','think','format','options','keep_alive'];
    if(Object.keys(body).some(k=>!allowedKeys.includes(k)))throw fail('Unknown AI request field.');
    const model=body.model;
    if(typeof model!=='string'||!model||model.length>120||!/^[A-Za-z0-9][A-Za-z0-9._:/-]*$/.test(model)||/cloud|https?:/i.test(model))throw fail('Select a downloaded local model, not a cloud model.');
    if(!Array.isArray(body.messages)||body.messages.length!==2||body.messages[0]?.role!=='system'||body.messages[1]?.role!=='user'||
     body.messages.some(m=>typeof m.content!=='string')||JSON.stringify(body.messages).length>36000)throw fail('Invalid planning messages.');
    if(body.format?.properties?.schemaVersion?.const!==2)throw fail('Lighting Plan v2 schema is required.');
    busy=true;
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),180000);
    const closed=()=>{if(!res.writableEnded)controller.abort();};res.on('close',closed);
    try{
     const available=await local('/api/tags');
     const entry=(available.models||[]).find(m=>m.name===model||m.model===model);
     if(!entry||entry.remote_host||entry.remote_model)throw fail('Selected model is not downloaded locally. Run: ollama pull '+model,422);
     const info=await local('/api/show',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model}),signal:controller.signal});
     if(info.remote_host||info.remote_model)throw fail('Cloud-backed models are disabled.',422);
     const result=await local('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
      model,messages:body.messages,format:body.format,stream:false,think:false,
      options:{temperature:0,num_ctx:16384,num_predict:6000},keep_alive:'2m'
     }),signal:controller.signal});
     send(200,{message:{content:result.message?.content},done_reason:result.done_reason});
    }finally{busy=false;clearTimeout(timeout);res.off('close',closed);}
    return;
   }
   if(req.url.startsWith('/api/'))throw fail('Unknown local API route.',404);
   if(req.method!=='GET'&&req.method!=='HEAD')throw fail('Method not allowed.',405);
   const pathname=new URL(req.url,'http://'+host).pathname;
   const file=pathname==='/'?'rig-to-show.html':pathname.slice(1);
   if(!/^(?:[a-z0-9-]+\.html|fixture-verification\.(?:csv|json)|profiles\/profiles-\d{3}\.js)$/.test(file))throw fail('Not found.',404);
   let data;try{data=await readFile(new URL(file,publicRoot));}catch{throw fail('App file not found. Build the app with npm run build.',404);}
   const type=file.endsWith('.js')?'text/javascript':file.endsWith('.csv')?'text/csv':file.endsWith('.json')?'application/json':'text/html';
   res.writeHead(200,{'Content-Type':type+'; charset=utf-8','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"});
   res.end(req.method==='HEAD'?undefined:data);
  }catch(e){if(!res.destroyed&&!res.writableEnded)send(e.status||500,{error:e.status?e.message:'Local server could not complete the request.'});}
 });
 server.requestTimeout=200000;
 return {server,start:()=>new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',()=>resolve('http://127.0.0.1:'+server.address().port));})};
}
