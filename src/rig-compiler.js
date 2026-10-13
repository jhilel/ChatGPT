(()=>{
const hex=(n,width=0)=>n.toString(16).padStart(width,'0');
const quote=s=>'"'+String(s).replace(/[\r\n]/g,' ').replace(/"/g,'""')+'"';
const colorCodes={White:0x26,Red:0x20,Amber:1,Yellow:0x27,Green:0x11,Cyan:8,Blue:2,Pink:0x15,UV:0xf,Magenta:0x17};
const rgb={White:[255,255,255],Red:[255,0,0],Amber:[255,128,0],Yellow:[255,255,0],Green:[0,255,0],Cyan:[0,255,255],Blue:[0,0,255],Pink:[255,64,160],UV:[128,0,255],Magenta:[255,0,255]};
const factoryCache=new WeakMap();
function factoryRecords(seed){let cached=factoryCache.get(seed);if(!cached||cached.base64!==seed.base64){cached={base64:seed.base64,records:records(StormNative.byteText(Uint8Array.from(atob(seed.base64),c=>c.charCodeAt(0))).replace(/\r\n/g,'\n'))};factoryCache.set(seed,cached);}return cached.records;}
function records(text){let quoted=false,start=0,out=[];for(let i=0;i<text.length;i++){if(text[i]==='"')quoted=!quoted;if(text[i]===';'&&!quoted){const chunk=text.slice(start,i+1);start=i+1;const m=chunk.match(/(?:^|\n)([A-Za-z][0-9]?),/);if(!m)throw Error('Invalid factory record.');out.push({type:m[1],text:chunk.slice(m.index).trimStart()+'\n'});}}if(text.slice(start).trim())throw Error('Unterminated factory record.');return out;}
function numericPrefix(text,skip,count){let start=0;for(let i=0;i<skip;i++)start=text.indexOf('\n',start)+1;const re=/[0-9a-f]+/gi;re.lastIndex=start;let end=start;for(let i=0;i<count;i++){const m=re.exec(text);if(!m||!/^[,\s]*$/.test(text.slice(end,m.index)))throw Error('Unsupported native template.');end=m.index+m[0].length;}while(text[end]===','||text[end]==='\r'||text[end]==='\n')end++;return {start,end};}
function allocate(project,catalog,definitions){
 const byId=new Map(catalog.fixtures.map(f=>[f.id,f])),personalities=new Map(),heads=[];let slot=1;
 for(const row of project.rig){const fixture=byId.get(row.profileId),definition=definitions.get(row.profileId);if(!definition||definition.channels.length!==fixture.logicalChannels)throw Error('Native channel count mismatch: '+fixture.model);const count=definition.channels.length;if(count>512)throw Error(fixture.model+' exceeds one DMX universe; this mode needs module expansion.');if(!personalities.has(row.profileId))personalities.set(row.profileId,{id:personalities.size+2,fixture,definition});const personality=personalities.get(row.profileId);
  for(let i=0;i<row.quantity;i++){if((slot-1)%512+count>512)slot=Math.ceil(slot/512)*512+1;if(slot+count-1>48*512)throw Error('This rig exceeds the 48-universe MQ70 export capacity.');const id=heads.length+1;heads.push({id,start:slot,universe:Math.floor((slot-1)/512)+1,address:(slot-1)%512+1,count,personality,role:row.role||(/profile|spot|dimmer|fresnel/i.test(fixture.model)?'stage':'decorative'),place:project.places[id-1],geometry:project.layout?.[id-1]?{...project.layout[id-1],target:project.layout[id-1].targetId?project.targets?.find(t=>t.id===project.layout[id-1].targetId):project.layout[id-1].target}:undefined});slot+=count;}
 }
 return {personalities,heads};
}
function colorValues(def,color){const out=new Map(),code=colorCodes[color];const palette=def.colors.find(p=>p[1]===code)||def.colors.find(p=>p[0].toLowerCase()===color.toLowerCase());if(palette)for(const pair of palette[2])out.set(...pair);
 def.channels.forEach(([name,flags,attr],offset)=>{if(out.has(offset))return;const additive=Boolean(flags&0x2000),fine=Boolean(flags&8),base=rgb[color];if([16,17,18].includes(attr))out.set(offset,fine?0:(additive?base[attr-16]:255-base[attr-16]));else if([19,27,31].includes(attr)&&additive)out.set(offset,fine?0:(attr===19&&color==='White'?255:attr===27&&color==='Amber'?255:attr===31&&color==='UV'?255:0));else if(attr===6){const range=def.ranges.find(r=>r[0]===offset&&(r[5]&255)===code&&(r[4]&0xf000)===0x1000);if(range)out.set(offset,Math.floor((range[2]+range[3])/2));}});return out;}
function dimValue(flags,pct){const value=Math.floor(pct*65535/100);return flags&8?value&255:value>>>8;}
function staticValues(heads,look){const out=new Map();for(const h of heads){const def=h.personality.definition,pct=h.role==='stage'?look[1]:look[2],color=h.role==='stage'?look[3]:look[4],colors=colorValues(def,color),hasDim=def.channels.some(([,flags,attr])=>attr===0&&!(flags&8)),additiveRGB=def.channels.some(([,flags,attr])=>[16,17,18].includes(attr)&&Boolean(flags&0x2000));const locate=new Map(def.locate);
  def.channels.forEach(([name,flags,attr],offset)=>{if(attr===20)return;let value=locate.get(offset)??0;if(colors.has(offset))value=colors.get(offset);if(attr===0)value=dimValue(flags,pct);else if(!hasDim&&((flags&0x2000)||(additiveRGB&&[19,27,31].includes(attr)))&&[16,17,18,19,27,31].includes(attr))value=Math.floor(value*pct/100);if([2,3].includes(attr)&&pct>0){const open=def.ranges.find(r=>r[0]===offset&&/^open$|no strobe/i.test(r[1]));if(open)value=open[2];}if([2,3].includes(attr)&&pct===0){const closed=def.ranges.find(r=>r[0]===offset&&/^(?:closed|shutter closed|blackout)$/i.test(r[1]));if(closed)value=closed[2];}if(h.focus?.values.has(offset))value=h.focus.values.get(offset);out.set(h.start+offset,Math.max(0,Math.min(255,value)));});
 }return out;}
function pairs(values){return [...values].flatMap(([channel,value])=>[hex(channel),hex(value)]).join(',')+(values.size?',':'');}
function compile(project,catalog,definitions,seed,design){
 const source=factoryRecords(seed),get=(type,id)=>source.find(r=>r.type===type&&parseInt(r.text.split(',')[1],16)===id)?.text;
 const rig=allocate(project,catalog,definitions),generated=new Map(),warnings=[];const add=(type,text)=>generated.set(type,(generated.get(type)||'')+text+'\n');
 for(const p of rig.personalities.values())add('P',p.definition.record.replace(/^P,[^,]+,/,`P,${hex(p.id,4)},`));
 if(project.aimTargets){for(const h of rig.heads)if(h.personality.definition.channels.some(([,f,a])=>a===4&&!(f&8)))try{h.focus=MagicVisGeometry.aim(h.geometry,h.personality.definition);}catch(e){throw Error('Head '+h.id+': '+e.message);}}
 const hTemplate=source.find(r=>r.type==='H').text;
 for(const h of rig.heads){const p=h.personality;for(const [offset,[name,flags]] of p.definition.channels.entries())add('L',`L,${hex(h.start+offset)},${quote(p.fixture.shortName)},${hex(flags)},${hex(p.id)},${hex(offset)},0,ffff,0,0,${hex(h.id)},2,;`);let headRecord=hTemplate.replace(/^H,[^,]+,/,`H,${hex(h.id,8)},`).replace(/\n[0-9a-f]+,[0-9a-f]+,[0-9a-f]+,0,0,;\n$/i,`\n${hex(h.start)},${hex(h.id)},${hex(p.id)},0,0,;\n`);if(h.geometry)headRecord=MagicVisGeometry.transform(headRecord,h.geometry);add('H',headRecord);}
 const groupTemplate=get('G',101),groupTail=groupTemplate.slice(groupTemplate.indexOf('\n'));let groupId=1;
 const group=(name,heads)=>{if(heads.length)add('G',`G,${hex(groupId++,4)},${quote(name)},${hex(heads.length)},${heads.map(h=>hex(h.start)).join(',')},21000024,${groupTail}`);};
 group('All Rig',rig.heads);for(const place of ['Truss','Floor'])group(place,rig.heads.filter(h=>h.place===place));for(const role of ['stage','decorative'])group(role==='stage'?'Stage':'Decorative',rig.heads.filter(h=>h.role===role));for(const p of rig.personalities.values())group(p.fixture.model+' '+p.fixture.mode,rig.heads.filter(h=>h.personality===p));
 for(const target of project.targets||[])group('Target '+target.name,rig.heads.filter(h=>h.geometry?.targetId===target.id));
 const paletteTemplate=get('F',0xb001),paletteCount=parseInt(paletteTemplate.split(',')[3],16),paletteEnd=numericPrefix(paletteTemplate,1,paletteCount*3),paletteTail=paletteTemplate.slice(paletteEnd.end);let paletteId=0xb000;
 for(const [color,code] of Object.entries(colorCodes)){const values=new Map();for(const h of rig.heads)for(const [offset,value] of colorValues(h.personality.definition,color))values.set(h.start+offset,value);if(values.size)add('F',`F,${hex(paletteId++,4)},${quote(color)},${hex(values.size)},\n${[...values].flatMap(([c,v])=>[hex(c),hex(v),'0']).join(',')},${paletteTail.replace(/^06000020,/,hex(0x06000000+code,8)+',')}`);}
 const staticTemplate=get('S',1),staticCount=parseInt(staticTemplate.split(',')[3],16),staticEnd=numericPrefix(staticTemplate,2,staticCount*2),staticTail=staticTemplate.slice(staticEnd.end),timing=staticTemplate.split('\n')[1];
 const stack=(id,name,sourceId=1)=>add('C',get('C',sourceId).replace(/^C,[^,]+,"[^"]*",/,`C,${hex(id,4)},${quote(name)},`).replace(/^0000,0000,[0-9a-f]+,/m,`0000,0000,${hex(id,4)},`));
 const page=(id,name,cues)=>{let template=get('B',1),end=numericPrefix(template,1,404);const values=Array.from({length:202},(_,i)=>hex(cues[i]||0,4)+',00000000,').join('');add('B',template.slice(0,end.start).replace(/^B,[^,]+,"[^"]*",/,`B,${hex(id,4)},${quote(name)},`)+values+'\n'+template.slice(end.end));};
 let cueId=1;const looks=[];design.looks.forEach(look=>{const id=cueId++,values=staticValues(rig.heads,look);add('S',`S,${hex(id,4)},${quote(look[0])},${hex(values.size)},0,0,\n${timing}\n${pairs(values)}\n\n${staticTail}`);stack(id,look[0]);looks.push(id);});page(1,'Event Looks',looks);
 const effects=[];
 for(const kind of ['chase','circle']){if(!design[kind])continue;for(const place of ['All','Truss','Floor']){const eligible=rig.heads.filter(h=>(place==='All'||h.place===place)&&(kind==='chase'?h.personality.definition.channels.some(([,f,a])=>a===0&&!(f&8)):h.personality.definition.channels.some(([,f,a])=>a===4&&!(f&8))&&h.personality.definition.channels.some(([,f,a])=>a===5&&!(f&8))));if(!eligible.length)continue;
   eligible.sort((a,b)=>(a.geometry?.x??a.id)-(b.geometry?.x??b.id)||(a.geometry?.depth??0)-(b.geometry?.depth??0));
   const entries=[];eligible.forEach((h,i)=>h.personality.definition.channels.forEach(([,flags,attr],offset)=>{if(flags&8)return;if(kind==='chase'?attr===0:[4,5].includes(attr))entries.push({channel:h.start+offset,attr,head:h,offset,phase:Math.floor(i*1000/eligible.length)});}));
   const sourceId=kind==='chase'?3:4,lines=get('S',sourceId).split('\n'),oldCount=parseInt(lines[3].split(',')[1],16),timingIndex=lines.findIndex(l=>l==='00000000,00000000,00000000,00000000,00000961,000003e8,000003e8,0000,'),id=cueId++,name=place+' '+(kind==='chase'?'Dim Chase':'Circle'),values=kind==='circle'?staticValues(eligible,['',50,50,'White','White']):new Map();
   const header=lines[3].split(',');header[1]=hex(entries.length);const requested=Math.round((project.circleSize??10)*255/100);if(kind==='circle')header[7]=hex(requested,4);const rows=entries.map(e=>{const center=e.head.focus?.values.get(e.offset)??128,size=kind==='chase'?256:Math.min(requested,center,255-center);return `${hex(e.channel)},50,0,${hex(size)},0,${hex(Math.floor(e.phase*80/1000))},${kind==='circle'&&e.attr===5?'2':'8002'},`;});const timings=entries.map(e=>`961,3e8,${hex(e.phase)},`);
   add('S',[`S,${hex(id,4)},${quote(name)},${hex(values.size)},1,0,`,lines[1],pairs(values),header.join(','),...rows,...lines.slice(4+oldCount,timingIndex+1),...timings,...lines.slice(timingIndex+1+oldCount)].join('\n'));stack(id,name,sourceId);effects.push(id);
  }}
 if(effects.length){for(const r of source.filter(r=>r.type==='W'))add('W',r.text);page(2,'Effects',effects);}
 const replace=new Set(['P','L','H','G','F','R','W','S','C','B']),emitted=new Set();let output='';for(const r of source){if(replace.has(r.type)){if(!emitted.has(r.type)){output+=generated.get(r.type)||'';emitted.add(r.type);}}else output+=r.text+'\n';}
 for(const [type,value] of generated)if(!emitted.has(type))output+=value;
 for(const p of rig.personalities.values())if(!p.definition.colors.length&&!p.definition.channels.some(([,f,a])=>[16,17,18].includes(a)))warnings.push(p.fixture.model+': requested colors use available wheel ranges; unsupported colors retain locate color.');
 const patch=rig.heads.map(h=>({head:h.id,fixture:h.personality.fixture.model,mode:h.personality.fixture.mode,universe:h.universe,address:h.address,channels:h.count,role:h.role,location:h.place}));
 return {show:new TextEncoder().encode(output),patch,warnings,layoutApplied:rig.heads.every(h=>Boolean(h.geometry)),focusApplied:Boolean(project.aimTargets),focus:rig.heads.filter(h=>h.focus).map(h=>({head:h.id,pan:h.focus.pan,tilt:h.focus.tilt,targetId:h.geometry.targetId,target:h.geometry.target}))};
}
function calibrate(project,catalog,definitions,text,cueName='Correct Aim'){
 const source=records(text.replace(/\r\n/g,'\n')),label=r=>r.text.match(/^[A-Za-z][0-9]?,[^,]+,"([^"]*)",/)?.[1].trim(),matches=source.filter(r=>r.type==='S'&&label(r).toLowerCase()===cueName.trim().toLowerCase());
 if(matches.length!==1)throw Error('Find exactly one saved cue named '+cueName+'.');
 const cue=matches[0].text.split('\n');if(parseInt(cue[0].split(',')[4],16)!==0)throw Error('Use a static calibration cue without movement effects.');
 const tokens=cue[2].split(',').filter(Boolean);if(tokens.length!==parseInt(cue[0].split(',')[3],16)*2||tokens.some(v=>!/^[0-9a-f]+$/i.test(v)))throw Error('Unsupported calibration cue values.');
 const values=new Map();for(let i=0;i<tokens.length;i+=2)values.set(parseInt(tokens[i],16),parseInt(tokens[i+1],16));
 const rig=allocate(project,catalog,definitions),updates=[];
 for(const head of rig.heads){
  const saved=source.find(r=>r.type==='H'&&parseInt(r.text.split(',')[1],16)===head.id);if(!saved)throw Error('Calibration show is missing head '+head.id+'.');
  const refs=saved.text.trim().split('\n').at(-1).split(',').map(v=>parseInt(v,16)),start=refs[0],personality=source.find(r=>r.type==='P'&&parseInt(r.text.split(',')[1],16)===refs[2]);
  if(label(personality||{text:''})!==head.personality.fixture.nativePersonality)throw Error('Head '+head.id+': calibration personality does not match the rig.');
  const def=head.personality.definition,coarse=attr=>def.channels.findIndex(([,f,a])=>a===attr&&!(f&8)),fine=attr=>def.channels.findIndex(([,f,a])=>a===attr&&Boolean(f&8));
  if(coarse(4)<0||coarse(5)<0)continue;
  const present=[4,5].map(attr=>values.has(start+coarse(attr)));if(!present.some(Boolean))continue;if(!present.every(Boolean))throw Error('Head '+head.id+': record both pan and tilt in the calibration cue.');
  const fields=[...saved.text.slice(saved.text.indexOf('\n')).matchAll(/"([^"\n]*)"/g)].slice(0,6).map(m=>MagicVisGeometry.decode(m[1]));
  if(!head.geometry||fields.length!==6||['x','height','depth','rx','ry','rz'].some((key,i)=>Math.abs(fields[i]-Number(MagicVisGeometry.decimal(head.geometry[key])))>.001))throw Error('Head '+head.id+': position or rotation differs. Load the matching rig project first.');
  const raw=attr=>{const c=values.get(start+coarse(attr)),f=fine(attr),v=f>=0?values.get(start+f):0;if(!Number.isInteger(c)||c>255||!Number.isInteger(v)||v>255)throw Error('Head '+head.id+': record raw pan/tilt including fine channels.');return c*256+v;};
  const baseline=MagicVisGeometry.aim({...head.geometry,focusCalibration:undefined},def),calibration={modelVersion:2,panOffset:raw(4)-baseline.pan,tiltOffset:raw(5)-baseline.tilt,sign:baseline.sign,cue:cueName.trim(),target:{x:head.geometry.target.x,depth:head.geometry.target.depth,height:head.geometry.target.height}};
  const check=MagicVisGeometry.aim({...head.geometry,focusCalibration:calibration},def);if(check.pan!==raw(4)||check.tilt!==raw(5))throw Error('Head '+head.id+': calibration cannot preserve the recorded aim.');
  updates.push({index:head.id-1,calibration});
 }
 if(!updates.length)throw Error('The calibration cue has no matching pan/tilt values.');return updates;
}
globalThis.MagicQRigCompiler={compile,allocate,colorValues,records,staticValues,calibrate};
})();
