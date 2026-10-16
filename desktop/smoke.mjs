import {_electron as electron} from 'playwright';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';
const root=path.resolve(import.meta.dirname,'..'),directory=fs.mkdtempSync(path.join(os.tmpdir(),'rig-desktop-'));
const executable=process.env.RIG_PACKAGED_EXECUTABLE,args=process.platform==='linux'?['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']:[];
if(!executable)args.push(root);
const app=await electron.launch({...(executable?{executablePath:executable}:{}),args,env:{...process.env,RIG_TO_SHOW_USER_DATA:path.join(directory,'profile'),RIG_TO_SHOW_HEADLESS:'1'},timeout:30000});
const appProcess=app.process();
try{
 const window=await app.firstWindow(),errors=[];window.on('pageerror',e=>errors.push(e.message));
 await window.waitForFunction(()=>document.getElementById('startup').hidden);
 assert.match(window.url(),/^http:\/\/127\.0\.0\.1:/);assert.equal(await window.locator('#rig tr').count(),0);
 await app.evaluate((electron,directory)=>{globalThis.rigDownloads=[];electron.session.defaultSession.on('will-download',(_event,item)=>{const file=directory+'/'+item.getFilename();item.setSavePath(file);item.once('done',(_event,state)=>globalThis.rigDownloads.push({file,state}));});},directory);
 const p={version:1,aimingModelVersion:2,name:'AI smoke',rig:[{profileId:'storm2-profile-32',quantity:4,role:'stage'},{profileId:'storm2-beamwash-basic1',quantity:8,role:'decorative'}],
 brief:'Corporate summit red and blue',event:'auto',brand:'auto',movement:true,chase:true,aimTargets:false,operatingPage:false,movementSpeed:1,circleSize:10,
 room:{unit:'ft',width:60,depth:40,stageWidth:24,stageDepth:10,trussHeight:16},places:Array(12).fill('Truss'),layout:[]};
 const [chooser]=await Promise.all([window.waitForEvent('filechooser'),window.locator('#loadRig').click()]);
 await chooser.setFiles({name:'rig.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(p))});
 await window.waitForFunction(()=>document.querySelectorAll('#rig tr').length===2);
 assert.equal(await window.locator('input[type=color]').first().inputValue(),'#73e2bc');
 assert.equal(await window.locator('input[type=color]').nth(1).inputValue(),'#f5d547');
 // Basic mode remains available only through an explicit mode selection.
 await window.locator('#generationMode').selectOption('basic');await window.locator('#generate').click();
 await window.waitForFunction(()=>document.getElementById('status').textContent.includes('Native show exported'));
 const plan={schemaVersion:2,targetVersion:'1.9.7.3',summary:'White speaker look',decisions:['Use existing speaker head.'],issues:[],groups:[],
 cues:[{id:'speech',name:'Speaker White',trigger:{type:'manualPlayback'},timing:{mode:'compilerDefault',fadeSeconds:null,delaySeconds:null},
 states:[{selection:{headIds:[1],groupIds:[]},intensity:70,color:'White',targetId:null}]}],effects:[]};
 await window.route('**/api/models',route=>route.fulfill({json:{models:[{name:'qwen3.5:4b'}]}}));
 let requests=0;await window.route('**/api/lighting-plan',async route=>{
  const body=route.request().postDataJSON();assert.equal(body.model,'qwen3.5:4b');
  const context=JSON.parse(body.messages[1].content).activeRigAndCompilerContext;
  assert.equal(context.heads.length,12);requests++;await route.fulfill({json:{message:{content:JSON.stringify(plan)},done_reason:'stop'}});
 });
 await window.locator('#generationMode').selectOption('ai');
 await window.locator('#aiSetup').evaluate(el=>el.open=true);await window.locator('#aiConnect').click();
 await window.waitForFunction(()=>document.getElementById('aiConnection').textContent.includes('Connected locally'));
 await window.locator('#generate').click();await window.waitForFunction(()=>!document.getElementById('aiExport').disabled);
 assert.match(await window.locator('#looks').textContent(),/Speaker White/);
 await window.locator('#brief').fill('Corporate summit revised');
 assert.equal(await window.locator('#aiExport').isDisabled(),true);
 await window.locator('#generate').click();await window.waitForFunction(()=>!document.getElementById('aiExport').disabled);
 await window.locator('#aiExport').click();await window.waitForFunction(()=>document.getElementById('status').textContent.includes('Native show exported from reviewed AI plan'));
 assert.equal(requests,2);
 // Malformed model content must block export, not turn into a rules-based show.
 await window.unroute('**/api/lighting-plan');await window.route('**/api/lighting-plan',route=>route.fulfill({json:{message:{content:'not JSON'}}}));
 await window.locator('#generate').click();await window.waitForFunction(()=>document.getElementById('status').textContent.includes('invalid JSON'));
 assert.equal(await window.locator('#aiExport').isDisabled(),true);
 for(let i=0;i<50;i++){const downloads=await app.evaluate(()=>globalThis.rigDownloads);if(downloads.length===2)break;await new Promise(r=>setTimeout(r,100));}
 const downloads=await app.evaluate(()=>globalThis.rigDownloads);assert.equal(downloads.length,2);assert.ok(downloads.every(d=>d.state==='completed'));
 for(const d of downloads)assert.ok(fs.statSync(d.file).size>0);
 await window.reload();await window.waitForFunction(()=>document.getElementById('startup').hidden);
 assert.equal(await window.locator('#rig tr').count(),0);assert.equal(await window.locator('#generationMode').inputValue(),'ai');
 assert.deepEqual(errors,[]);
 console.log('Desktop smoke passed: empty launch, rig load/colors, explicit legacy export, mocked local model connection, reviewed AI export, stale-plan invalidation and no silent fallback.');
}finally{let timer;await Promise.race([app.close(),new Promise(r=>{timer=setTimeout(r,5000);})]);clearTimeout(timer);if(appProcess.exitCode===null)appProcess.kill('SIGTERM');fs.rmSync(directory,{recursive:true,force:true});}
