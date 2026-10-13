import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setup,project,seed} from './compiler-context.mjs';

test('summit colors follow spatial order rather than patch order and leave stage white',()=>{
 const ctx=setup(),p=project();p.brief='Corporate summit red and blue stagewash dim chase';p.brand='auto';
 const design=ctx.StormBrief.design(p,ctx.StormNative.defaults),look=design.looks.find(l=>l[0]==='Speeches');
 const definition={channels:[['Dimmer',0,0],['Red',0x2000,16],['Green',0x2000,17],['Blue',0x2000,18]],locate:[],colors:[],ranges:[]};
 const head=(id,start,role,x)=>({id,start,role,geometry:{x,depth:0},personality:{definition}});
 const values=ctx.MagicQRigCompiler.staticValues([head(1,1,'stage',0),head(2,5,'decorative',10),head(3,9,'decorative',-10)],look);
 assert.equal(values.get(2),255);assert.equal(values.get(3),255);assert.equal(values.get(4),255);
 assert.equal(values.get(6),0);assert.equal(values.get(8),255);
 assert.equal(values.get(10),255);assert.equal(values.get(12),0);
 assert.equal(look[4],'Red / Blue');
});
test('summit native export includes its two-color looks and decorative chase',async()=>{
 const ctx=setup(),p=project();p.brief='Corporate summit red and blue stagewash dim chase';p.brand='auto';
 const result=await ctx.StormBrief.compile(p,ctx.Catalog,seed),text=Buffer.from(result.show).toString('latin1');
 assert.match(text,/"Speeches"/);assert.match(text,/"Brand Red"/);assert.match(text,/"Brand Blue"/);assert.match(text,/"All Dim Chase"/);
 assert.equal(result.design.circle,false);
});
