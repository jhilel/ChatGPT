import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setup,project,definitions} from './compiler-context.mjs';
test('LLM request contains only current UI rig and compiler-allocated DMX patch',async()=>{
 const ctx=setup(),p=project();p.rig=p.rig.slice(0,1);p.rig[0].quantity=20;p.places=Array(20).fill('Truss');p.brief='Use only my rig';
 const defs=await definitions(p.rig.map(r=>ctx.Catalog.fixtures.find(f=>f.id===r.profileId)));
 const context=ctx.StormBrief.activeFixtureContext(p,ctx.Catalog,defs);
 assert.equal(context.heads.length,20);assert.equal(context.fixtureTypes[0].quantity,20);
 assert.ok(context.heads.some(h=>h.universe===2));
 assert.ok(context.heads.every(h=>h.address+h.channels-1<=512));
 const request=ctx.StormBrief.buildLLMRequest(p,ctx.Catalog,defs,'test-model');
 assert.match(request.messages[0].content,/ONLY use the active fixtures/);
 assert.match(request.messages[0].content,/ACTIVE_FIXTURE_DATA/);
 assert.doesNotMatch(request.messages[0].content,/storm2-beamwash-basic1/);
 assert.equal(request.messages[1].content,p.brief);
});
test('request rebuilds inventory after removal and rejects AI attempts to replace the patch',async()=>{
 const ctx=setup(),p=project();const fixtures=p.rig.map(r=>ctx.Catalog.fixtures.find(f=>f.id===r.profileId)),defs=await definitions(fixtures);
 const first=ctx.StormBrief.buildLLMRequest(p,ctx.Catalog,defs,'test');
 p.rig.pop();p.places=Array(4).fill('Truss');
 const second=ctx.StormBrief.buildLLMRequest(p,ctx.Catalog,defs,'test');
 assert.notEqual(first.messages[0].content,second.messages[0].content);
 await assert.rejects(()=>ctx.StormBrief.requestLLMDesign(p,ctx.Catalog,defs,{model:'test',fetchImpl:async()=>({ok:true,json:async()=>({plan:{rig:[]}})})}),/must not replace the rig or patch/);
});
