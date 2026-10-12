import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
const html=fs.readFileSync(new URL('../public/storm-show-builder.html',import.meta.url),'utf8');
const elements=new Map();const make=()=>({value:'corporate',append(){},replaceChildren(){}});
const document={createElement:make,getElementById(id){if(!elements.has(id))elements.set(id,make());return elements.get(id)}};
const context=vm.createContext({document,Uint8Array,crypto:webcrypto});
vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],context);
const colors=['White','Red','Amber','Yellow','Green','Cyan','Blue','Pink','UV','Magenta'];
let source='\\ MagicQ Show File.\r\nV,preserve,;\r\n';
const heads=Array.from({length:20},(_,i)=>i<4?i+1:5+Math.floor((i-4)/2));
for(let i=0;i<64;i++)source+=`L,${(i+1).toString(16)},"fixture",1,2,0,0,ffff,0,0,${(i<20?heads[i]:1+(i%12)).toString(16)},2,;\r\n`;
for(const [id,color] of colors.entries()){
 source+=`F,${(0xb000+id).toString(16)},"${color}",2c,\r\n`;
 for(let i=20;i<64;i++)source+=(i+1).toString(16)+','+((id+i)%256).toString(16)+',0,';
 source+='\r\n0,0,;\r\n';
}
for(const id of [1,2]){
 source+=`S,000${id},"Example ${id}",40,0,0,\r\n0000,0000,\r\n`;
 for(let i=0;i<64;i++)source+=(i+1).toString(16)+','+(i<20?'7f':(0xb00000+i).toString(16))+',';
 source+='\r\n0,0,;\r\n';
}
for(const id of [1,2])source+=`C,000${id},"Example ${id}",0000,0001,0000a01f,\r\n0,0,\r\n0000,0000,000${id},0000,00006000,1.000000,"",\r\n0,;\r\n`;
source+='B,0001,"",00ca,0000,0000,\r\n';
for(let i=0;i<202;i++)source+=(i<2?i+1:0).toString(16).padStart(4,'0')+',00000000,';
source+='\r\n0,;\r\nQ,preserve,;\r\n';
const bytes=Buffer.from(source);
test('generates all four event templates with linked cue stacks and playbacks',()=>{
 for(const event of ['corporate','gala','expo','band']){
  const result=Buffer.from(context.generateShow(bytes,event)).toString();
  assert.equal((result.match(/^S,/gm)||[]).length,10);assert.equal((result.match(/^C,/gm)||[]).length,10);
  const page=context.dataTokens(context.record(result,'B',1).text,1,404);
  assert.equal(page[0].text,'0001');assert.equal(page[2].text,'0002');
  for(let i=0;i<8;i++){
   assert.equal(parseInt(page[(i+2)*2].text,16),101+i);
   const stack=context.record(result,'C',101+i).text;
   assert.match(stack,new RegExp('^0000,0000,'+(101+i).toString(16).padStart(4,'0')+',','m'));
  }
  for(const kind of ['S','C'])for(const id of [1,2])assert.equal(context.record(result,kind,id).text,context.record(source,kind,id).text);
  for(const kind of ['F','L','V','Q'])assert.deepEqual([...result.matchAll(new RegExp('^'+kind+',[\\s\\S]*?;\\r?\\n','gm'))].map(m=>m[0]),[...source.matchAll(new RegExp('^'+kind+',[\\s\\S]*?;\\r?\\n','gm'))].map(m=>m[0]));
 }
});
test('writes fixture-specific intensities and palette references',()=>{
 const result=Buffer.from(context.generateShow(bytes,'corporate')).toString();
 const fields=context.dataTokens(context.record(result,'S',101).text,2,128);
 assert.equal(fields[1].text,'4c');assert.equal(fields[9].text,'33');
 const profileColorIndex=Array.from({length:44},(_,i)=>i+20).find(i=>1+(i%12)<=4);
 assert.equal(parseInt(fields[profileColorIndex*2+1].text,16)>>8,0xb000);
 const washColorIndex=Array.from({length:44},(_,i)=>i+20).find(i=>1+(i%12)>4);
 assert.equal(parseInt(fields[washColorIndex*2+1].text,16)>>8,0xb006);
 const blackout=context.dataTokens(context.record(result,'S',108).text,2,128);
 for(let i=0;i<20;i++)assert.equal(blackout[i*2+1].text,'0');
});
test('refuses occupied playback slots, missing palettes, and duplicate generation',()=>{
 assert.throws(()=>context.generateShow(bytes,'unknown'),/Unknown event/);
 const occupied=source.replace(/(B,0001,[\s\S]*?0002,00000000,)0000,/, '$10009,');
 assert.throws(()=>context.generateShow(Buffer.from(occupied),'corporate'),/occupied/);
 assert.throws(()=>context.generateShow(Buffer.from(source.replace('"Blue"','"Other"')),'corporate'),/Missing Blue/);
 const output=context.generateShow(bytes,'corporate');assert.throws(()=>context.generateShow(output,'corporate'),/already exist/);
});
test('public builder rejects an unrecognized source before editing',async()=>{
 await assert.rejects(()=>context.build(bytes,'corporate'),/exact original/);
});
