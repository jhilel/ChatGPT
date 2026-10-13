import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {setup,project,library,root} from './compiler-context.mjs';
const report=JSON.parse(fs.readFileSync(new URL('public/fixture-verification.json',root))),byId=new Map(report.modes.map(r=>[r.id,r]));
test('audit covers every supplied mode once and distinguishes structural, runtime and physical evidence',()=>{
 assert.equal(byId.size,library.fixtures.length);assert.equal(report.sourceCounts.checked,69583);assert.equal(report.sourceCounts.passed,69583);assert.equal(report.counts.structuralPass+report.counts.failed+report.counts.unsupported,69583);assert.equal(report.focusedExportChecks.passed,8282);assert.equal(report.focusedExportChecks.failed,0);
 for(const f of library.fixtures){const r=byId.get(f.id);assert.ok(r);assert.equal(f.auditStatus,r.status);assert.equal(r.physical,'not-verified');if(r.magicVis==='user-confirmed-reference-rig')assert.equal(f.id,'storm2-profile-32');if(r.aiming?.status==='math-pass')assert.equal(r.focusedExport,'passed');}assert.equal(library.auditSummary.physicalVerifiedModes,0);
});
test('failed personalities and oversized modes cannot enter the normal exporter',()=>{
 const ctx=setup(),failed=library.fixtures.find(f=>f.auditStatus==='failed'),oversized=library.fixtures.find(f=>f.nativePack&&f.logicalChannels>512);assert.ok(failed&&oversized);assert.equal(ctx.StormLibrary.byId.get(failed.id).exportSupported,false);assert.equal(ctx.StormLibrary.byId.get(oversized.id).exportSupported,false);assert.ok(ctx.StormBrief.validateProject(project([{profileId:failed.id,quantity:1}]),ctx.Catalog).some(s=>/absent channel|audit failed/.test(s)));
});
test('incomplete aiming data blocks targeting while retaining checked static export',()=>{
 const ctx=setup(),f=library.fixtures.find(f=>f.auditStatus==='structural-pass'&&f.aimingIssue),p=project([{profileId:f.id,quantity:1}]);p.layout=[{x:0,depth:0,height:6,rx:0,ry:0,rz:0,target:{x:0,depth:3,height:1}}];p.aimTargets=true;assert.ok(ctx.StormBrief.validateProject(p,ctx.Catalog).some(s=>/Target aiming is unavailable/.test(s)));p.aimTargets=false;assert.equal(ctx.StormBrief.validateProject(p,ctx.Catalog).length,0);assert.equal(ctx.StormLibrary.byId.get(f.id).exportSupported,true);
});
