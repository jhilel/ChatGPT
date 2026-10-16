import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {createAppServer} from '../src/local-ai-server.mjs';
const json=x=>new Response(JSON.stringify(x),{headers:{'Content-Type':'application/json'}});
async function start(t,fetchImpl){
 const app=createAppServer({port:0,fetchImpl});const url=await app.start();
 t.after(()=>{app.server.closeAllConnections();return new Promise(resolve=>app.server.close(resolve));});
 assert.equal(app.server.address().address,'127.0.0.1');return url;
}
const request={model:'qwen3.5:4b',messages:[{role:'system',content:'Plan schema'},{role:'user',content:'Current rig'}],format:{properties:{schemaVersion:{const:2}}},stream:false};
const post=(url,body=request,headers={})=>fetch(url+'/api/lighting-plan',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
test('bridge only uses fixed loopback model endpoint and forces local structured inference settings',async t=>{
 const calls=[];const url=await start(t,async(endpoint,options)=>{
  calls.push({endpoint,options});
  if(endpoint.endsWith('/api/tags'))return json({models:[{name:'qwen3.5:4b',size:4000000000},{name:'remote:cloud',remote_host:'cloud'}]});
  if(endpoint.endsWith('/api/show'))return json({});
  return json({message:{content:'{"schemaVersion":2}'},done_reason:'stop'});
 });
 const models=await (await fetch(url+'/api/models')).json();assert.equal(models.models.length,1);
 const response=await post(url);assert.equal(response.status,200);
 assert.ok(calls.every(c=>c.endpoint.startsWith('http://127.0.0.1:11434/')));
 const body=JSON.parse(calls.find(c=>c.endpoint.endsWith('/api/chat')).options.body);
 assert.equal(body.stream,false);assert.equal(body.think,false);assert.equal(body.options.num_ctx,16384);
 assert.equal(body.options.temperature,0);assert.equal(body.keep_alive,'2m');assert.equal(body.format.properties.schemaVersion.const,2);
});
test('cross-origin/host requests, arbitrary endpoints and cloud models are rejected',async t=>{
 const url=await start(t,async()=>json({models:[]}));
 assert.equal((await post(url,request,{Origin:'https://evil.example'})).status,403);
 const hostStatus=await new Promise((resolve,reject)=>{const req=http.get(url+'/api/models',{headers:{Host:'evil.example'}},res=>{res.resume();resolve(res.statusCode);});req.on('error',reject);});assert.equal(hostStatus,403);
 assert.equal((await post(url,{...request,endpoint:'https://evil.example'})).status,400);
 assert.equal((await post(url,{...request,model:'model:cloud'})).status,400);
 assert.equal((await post(url,{...request,model:'https://evil.example'})).status,400);
 assert.equal((await post(url)).status,422);
});
test('connection failures are actionable and no successful plan is fabricated',async t=>{
 const url=await start(t,async()=>{throw Error('ECONNREFUSED');});
 const response=await post(url);assert.equal(response.status,503);assert.match((await response.json()).error,/Start Ollama/);
});
test('installed model metadata cannot redirect inference to cloud',async t=>{
 const url=await start(t,async endpoint=>endpoint.endsWith('/api/tags')?json({models:[{name:'qwen3.5:4b'}]}):json({remote_host:'https://cloud.example'}));
 const response=await post(url);assert.equal(response.status,422);assert.match((await response.json()).error,/Cloud-backed/);
});
