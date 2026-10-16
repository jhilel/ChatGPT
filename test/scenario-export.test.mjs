import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setup,project,seed,definitions} from './compiler-context.mjs';
test('scenario rules produce distinct native cues and stage levels without unsolicited effects',async()=>{
 const ctx=setup();
 for(const [brief,scenario,name,stage] of [
  ['Wedding red and blue','wedding','Toasts',75],
  ['Ballet red and blue','dance','Solo',60],
  ['Theatre drama red and blue','theatre','Curtain Call',80],
  ['Church service red and blue','worship','Sermon',75],
  ['Broadcast studio red and blue','broadcast','Camera Key',70],
  ['Fashion runway red and blue','fashion','Runway',80],
  ['Museum red and blue','museum','Display',60],
  ['Architectural facade red and blue','architectural','Ambient',20],
  ['Sports ceremony red and blue','sports','Ceremony',75],
  ['DJ party red and blue','dj','Drop',45]]){
  const p=project();p.brief=brief;p.brand='auto';
  const result=await ctx.StormBrief.compile(p,ctx.Catalog,seed);
  assert.equal(result.design.scenario,scenario);
  assert.equal(result.design.circle,false);assert.equal(result.design.chase,false);
  const records=ctx.MagicQRigCompiler.records(Buffer.from(result.show).toString('latin1'));
  const cue=records.find(r=>r.type==='S'&&r.text.includes('"'+name+'"'));
  assert.ok(cue,scenario+' native cue');
  const tokens=cue.text.split('\n')[2].split(',').filter(Boolean).map(v=>parseInt(v,16)),values=new Map();
  for(let i=0;i<tokens.length;i+=2)values.set(tokens[i],tokens[i+1]);
  const defs=await definitions(p.rig.map(r=>ctx.Catalog.fixtures.find(f=>f.id===r.profileId)));
  const rig=ctx.MagicQRigCompiler.allocate(p,ctx.Catalog,defs),head=rig.heads.find(h=>h.role==='stage');
  const offset=head.personality.definition.channels.findIndex(([,flags,attr])=>attr===0&&!(flags&8));
  assert.equal(values.get(head.start+offset),Math.floor(stage*65535/100)>>>8,scenario+' serialized stage intensity');
 }
});
test('requested chase is native and restricted to decorative heads for wedding',async()=>{
 const ctx=setup(),p=project();p.brief='Wedding red and blue dim chase';p.brand='auto';
 const result=await ctx.StormBrief.compile(p,ctx.Catalog,seed);
 assert.equal(result.design.chase,true);assert.equal(result.design.effectScope,'decorative');
 assert.match(Buffer.from(result.show).toString('latin1'),/"All Dim Chase"/);
});
