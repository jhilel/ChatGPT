import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {setup,project,definitions,seed,root} from './compiler-context.mjs';
const reference=JSON.parse(fs.readFileSync(new URL('test/fixtures/recorded-aim.json',root))),text=reference.personality+'\n'+reference.heads.join('\n')+reference.cue;
async function rig(){const ctx=setup(),p=project([{profileId:'storm2-profile-32',quantity:4,role:'stage'}]),target={id:'stage',name:'Stage centre',x:0,depth:1.524,height:0};p.targets=[target];p.layout=[[-6.619,4.8768,7.617],[-2.415,4.8768,7.616952],[1.997,0,7.616952],[5.9429904,0,7.616952]].map(([x,depth,height])=>({x,depth,height,rx:0,ry:0,rz:0,neutralBeam:'down',panHeading:0,targetId:target.id,target}));p.aimTargets=true;const defs=await definitions([ctx.StormLibrary.byId.get('storm2-profile-32')]);return {ctx,p,defs};}
test('recorded MagicQ calibration preserves each reference aim through native export and JSON reload',async()=>{
 const {ctx,p,defs}=await rig(),before=JSON.stringify(p),updates=ctx.MagicQRigCompiler.calibrate(p,ctx.Catalog,defs,text);assert.equal(JSON.stringify(p),before);assert.equal(updates.length,4);for(const u of updates)p.layout[u.index].focusCalibration=u.calibration;
 const restored=JSON.parse(JSON.stringify(p)),built=await ctx.StormBrief.compile(restored,ctx.Catalog,seed),expected=[[36096,47872],[33024,47872],[31232,46080],[28160,46080]];
 assert.deepEqual(Array.from(built.focus,f=>[f.pan,f.tilt]),expected);
 const cue=ctx.MagicQRigCompiler.records(Buffer.from(built.show).toString()).find(r=>r.type==='S'&&r.text.startsWith('S,0001,')).text.split('\n')[2].split(','),values=new Map();for(let i=0;i+1<cue.length;i+=2)values.set(parseInt(cue[i],16),parseInt(cue[i+1],16));expected.forEach(([pan,tilt],i)=>{const start=i*32+1;assert.equal(values.get(start)*256+values.get(start+1),pan);assert.equal(values.get(start+2)*256+values.get(start+3),tilt);});
 restored.targets[0].depth+=.25;const moved=await ctx.StormBrief.compile(restored,ctx.Catalog,seed);assert.notEqual(moved.focus[0].pan,built.focus[0].pan);assert.notEqual(moved.focus[0].tilt,built.focus[0].tilt);
});
test('calibration rejects mismatched geometry, profiles, incomplete values and ambiguous cues',async()=>{
 const {ctx,p,defs}=await rig(),run=t=>ctx.MagicQRigCompiler.calibrate(p,ctx.Catalog,defs,t);assert.throws(()=>run(text+reference.cue),/exactly one/);assert.throws(()=>run(text.replace('2,0,3,bb,','2,100,3,bb,')),/raw pan/);assert.throws(()=>run(text.replace('Chauvet Pro_MaverickStorm2P_32ch','WrongProfile')),/personality/);p.layout[0].height+=1;assert.throws(()=>run(text),/position or rotation/);assert.ok(p.layout.every(point=>!point.focusCalibration));
});
