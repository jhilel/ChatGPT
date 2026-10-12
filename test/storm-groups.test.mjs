import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync(new URL('../public/storm-group-builder.html',import.meta.url),'utf8');
const elements=new Map();const make=()=>({append(){},add(){},setAttribute(){},replaceChildren(){}});
const document={createElement:make,getElementById(id){if(!elements.has(id))elements.set(id,make());return elements.get(id)}};
const context=vm.createContext({document,Option:function(){},Uint8Array});
vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],context);
let source='\\ MagicQ Show File.\r\nP,0002,"Chauvet Pro_MaverickStorm2P_32ch","Chauvet Pro","32ch",\r\nP,0003,"Chauvet Pro_MavStorm2BW_Single Basic1","Chauvet Pro","Single Basic1",\r\n';
let channel=1;const refs=[];
for(let head=1;head<=12;head++){
 source+=`H,${head.toString(16)},1,;\r\n`;refs.push(channel.toString(16));
 for(let offset=0;offset<(head<=4?32:31);offset++)source+=`L,${(channel++).toString(16)},"fixture",36,${head<=4?2:3},${offset.toString(16)},0,ffff,0,0,${head.toString(16)},2,;\r\n`;
}
source+='G,0001,"MaverickStorm2P",4,'+refs.slice(0,4).join(',')+',21000024,\r\n00000003,0,\r\n\r\n00000000,0,\r\n0,\r\n00000000,0000,0000,0000,0000,0000,0000,0000,00000000,00000000,\r\n;\r\n\r\nQ,keep-this,;\r\n';
const bytes=Buffer.from(source);
const places=Array.from({length:12},(_,i)=>(i<2||(i>=4&&i<8))?'Truss':'Floor');
test('adds correct groups while preserving original data and line endings',()=>{
 const result=context.buildShow(bytes,places);const output=Buffer.from(result.output);
 assert.equal(result.assigned.length,13);
 assert.deepEqual(output.subarray(0,result.insert),bytes.subarray(0,result.insert));
 assert.deepEqual(output.subarray(result.insert+result.addedLength),bytes.subarray(result.insert));
 assert.equal(result.assigned.find(g=>g.name==='Truss').members.join(','),'1,2,5,6,7,8');
 assert.match(output.toString(),/^G,006f,"Profiles Even",2,21,61,21000024,\r\n/m);
 assert.throws(()=>context.buildShow(output,places),/already exist/);
});
test('omits empty groups when all fixtures are on floor',()=>{
 const result=context.buildShow(bytes,Array(12).fill('Floor'));
 assert.equal(result.assigned.length,10);
 assert.ok(result.assigned.every(g=>g.members.length>0));
});
test('rejects wrong modes and invalid locations',()=>{
 assert.throws(()=>context.buildShow(Buffer.from(source.replace('"32ch"','"Other"')),places),/personalities/);
 assert.throws(()=>context.buildShow(bytes,Array(12).fill('Unknown')),/placement/);
});
