import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync(new URL('../public/magicq-test.html',import.meta.url),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const elements=new Map();
const document={getElementById(id){if(!elements.has(id))elements.set(id,{});return elements.get(id)}};
const context=vm.createContext({document,TextEncoder,Uint8Array});
vm.runInContext(script,context);
const {scanGroups,renameGroup}=context;
const fixture=Buffer.from('\\ MagicQ Show File. Chamsys Ltd.\r\nG,0001,"All FOH",2,1,2,;\r\nG,0002,"Profiles",1,3,;\r\n');
test('reads group labels and preserves every byte outside a renamed label',()=>{
 const groups=scanGroups(fixture);assert.equal(groups.length,2);
 const output=Buffer.from(renameGroup(fixture,groups[0],'GENERATOR TEST'));
 const expected=Buffer.from(fixture.toString().replace('"All FOH"','"GENERATOR TEST"'));
 assert.deepEqual(output,expected);
 assert.equal(scanGroups(output)[1].name,'Profiles');
});
test('unchanged label yields identical file',()=>{
 const g=scanGroups(fixture)[0];assert.deepEqual(Buffer.from(renameGroup(fixture,g,g.name)),fixture);
});
test('rejects text that could alter the record structure',()=>{
 const g=scanGroups(fixture)[0];
 for(const bad of ['','a"b','a,b','a\nb','x'.repeat(25)])assert.throws(()=>renameGroup(fixture,g,bad));
});
test('rejects unsupported files and mismatched group offsets',()=>{
 assert.throws(()=>scanGroups(Buffer.from('not a show')));
 const g=scanGroups(fixture)[0];assert.throws(()=>renameGroup(fixture,{...g,start:1},'Test'));
});
