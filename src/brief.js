(()=>{
const catalogCache=new WeakMap();
function catalogIndex(catalog){if(!catalogCache.has(catalog))catalogCache.set(catalog,{byId:new Map(catalog.fixtures.map(f=>[f.id,f])),verified:catalog.fixtures.filter(f=>Number.isInteger(f.verifiedQuantity))});return catalogCache.get(catalog);}
const colors=['White','Red','Amber','Yellow','Green','Cyan','Blue','Pink','UV','Magenta'];
function inferEvent(brief,explicit='auto'){
 if(['corporate','gala','expo','band'].includes(explicit))return explicit;
 if(explicit!=='auto')throw Error('Unknown event type.');
 if(/\b(gala|awards?|dinner|banquet|fundraiser)\b/i.test(brief))return 'gala';
 if(/\b(expo|exhibition|trade\s*show|booth)\b/i.test(brief))return 'expo';
 if(/\b(band|dj|concert|dance|party)\b/i.test(brief))return 'band';
 return 'corporate';
}
function validateProject(project,catalog){
 const errors=[];const quantities=new Map(),index=catalogIndex(catalog);
 if(!project||!Array.isArray(project.rig))return ['Enter your fixture rig.'];
 for(const row of project.rig){
  const fixture=index.byId.get(row.profileId);
  if(!fixture){errors.push('A fixture/mode is outside the verified catalog.');continue;}
  if(!Number.isInteger(fixture.verifiedQuantity)){errors.push(fixture.model+' ('+fixture.mode+') is selectable from the library, but native export is not yet verified for this mode.');continue;}
  if(!Number.isInteger(row.quantity)||row.quantity<1||row.quantity>512){errors.push('Fixture quantities must be whole numbers from 1 to 512.');continue;}
  quantities.set(fixture.id,(quantities.get(fixture.id)||0)+row.quantity);
 }
 for(const fixture of index.verified)if(quantities.get(fixture.id)!==fixture.verifiedQuantity)errors.push('Native export currently requires '+fixture.verifiedQuantity+' × '+fixture.model+' ('+fixture.mode+'). Other quantities need a verified patch compiler.');
 const room=project.room;
 if(!room||!['ft','m'].includes(room.unit))errors.push('Choose feet or metres.');
 if(room){for(const key of ['width','depth','stageWidth','stageDepth','trussHeight'])if(!Number.isFinite(room[key])||room[key]<=0||room[key]>1000)errors.push('Room and stage dimensions must be greater than zero and at most 1000.');if(room.stageWidth>room.width||room.stageDepth>room.depth)errors.push('The stage must fit inside the room.');}
 if(typeof project.brief!=='string'||project.brief.length>5000)errors.push('Keep the event brief under 5000 characters.');
 if(!['auto','corporate','gala','expo','band'].includes(project.event))errors.push('Choose a supported event type.');
 if(project.brand!=='auto'&&!colors.includes(project.brand))errors.push('Choose a supported brand color.');
 if(!Array.isArray(project.places)||project.places.length!==12||project.places.some(p=>!['Truss','Floor'].includes(p)))errors.push('Set a location for each of the twelve verified heads.');
 return [...new Set(errors)];
}
function design(project,defaults){
 const event=inferEvent(project.brief,project.event),looks=JSON.parse(JSON.stringify(defaults[event]));
 let brand=project.brand;
 if(brand==='auto')brand=colors.find(c=>new RegExp('\\b'+c+'\\b','i').test(project.brief))||'Blue';
 for(const look of looks){if(/^Brand /i.test(look[0])){look[0]='Brand '+brand;look[4]=brand;}else if(/Walk In|Arrival|Ambient|Break/.test(look[0]))look[4]=brand;}
 const circle=project.movement&&!/\b(no movement|static only|no moving lights)\b/i.test(project.brief);
 const chase=project.chase&&!/\b(no chase|no flashing|static only)\b/i.test(project.brief);
 return {event,brand,looks,circle,chase,decisions:['Event template: '+event,'Decorative color: '+brand,'Movement effects: '+(circle?'included':'omitted'),'Intensity chases: '+(chase?'included':'omitted')],limitations:['Room dimensions inform the layout preview; native focus positions are not generated.','Export is limited to the two verified fixture modes and quantities.','The generator uses local rules, not a trained lighting designer or photometric simulation.','Check focus, exposure, fixture behavior and playback on site.']};
}
function cleanFactoryProgramming(bytes){
 const native=globalThis.StormNative,text=native.byteText(bytes),changes=[];
 for(const type of ['S','C'])for(const id of [1,2,3,4]){const rec=native.record(text,type,id);changes.push({start:rec.start,end:rec.end,text:''});}
 const oldPage=native.record(text,'B',1),looksPage=native.record(text,'B',3);
 changes.push({start:oldPage.start,end:oldPage.end,text:''});
 changes.push({start:looksPage.start,end:looksPage.end,text:looksPage.text.replace(/^B,0003,"[^"]*",/,'B,0001,"Event Looks",')});
 return Uint8Array.from(native.edit(text,changes),c=>c.charCodeAt(0));
}
async function compile(project,catalog,seed){
 const errors=validateProject(project,catalog);if(errors.length)throw Error(errors.join('\n'));
 const native=globalThis.StormNative,result=design(project,native.defaults);
 native.config.looks[result.event]=result.looks;native.config.places=project.places.slice();native.config.fx={chase:result.chase,circle:result.circle};
 const bytes=Uint8Array.from(atob(seed.base64),c=>c.charCodeAt(0));
 const show=cleanFactoryProgramming(await native.build(bytes,result.event));
 return {show,design:result};
}
globalThis.StormBrief={inferEvent,validateProject,design,compile,cleanFactoryProgramming};
})();
