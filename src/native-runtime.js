
const sourceHash='caee4e8c606117b4532b4f49653cecdc0188441454075cf82e0e395b91c6f356';
const templates={
 corporate:[['Walk In',30,20,'White','Blue'],['Stage Wash',70,0,'White','White'],['Panel Wash',60,15,'White','Blue'],['Brand Blue',0,40,'White','Blue'],['Break',20,25,'White','Cyan'],['Awards',75,45,'White','Amber'],['Entertainment',45,60,'White','Magenta'],['Blackout',0,0,'White','White']],
 gala:[['Arrival',25,30,'White','Amber'],['Dinner',15,20,'White','Amber'],['Speeches',65,10,'White','Blue'],['Awards',75,45,'White','Amber'],['Reveal',65,60,'White','White'],['Entertainment',40,60,'White','Magenta'],['Walk Out',30,25,'White','Amber'],['Blackout',0,0,'White','White']],
 expo:[['Open',65,35,'White','White'],['Presentation',70,10,'White','Blue'],['Demo Area',60,20,'White','White'],['Brand Blue',0,45,'White','Blue'],['Brand Red',0,45,'White','Red'],['Ambient',20,25,'White','Cyan'],['Close',15,10,'White','Blue'],['Blackout',0,0,'White','White']],
 band:[['Walk In',20,25,'White','Blue'],['Stage White',60,50,'White','White'],['Red',40,65,'Red','Red'],['Blue',40,65,'Blue','Blue'],['Magenta',40,65,'Magenta','Magenta'],['Amber',40,65,'Amber','Amber'],['Cyan',40,65,'Cyan','Cyan'],['Blackout',0,0,'White','White']]
};
function byteText(bytes){let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return s;}
function record(text,type,id){const hex=id.toString(16).padStart(4,'0');const m=text.match(new RegExp('^'+type+','+hex+',[\\s\\S]*?;\\r?\\n','m'));if(!m)throw Error('Missing '+type+' record '+id);return {text:m[0],start:m.index,end:m.index+m[0].length};}
function dataTokens(rec,skip,count){let pos=0;for(let i=0;i<skip;i++){pos=rec.indexOf('\n',pos)+1;if(!pos)throw Error('Invalid record lines.');}const tokens=[];const re=/[0-9a-f]+/gi;re.lastIndex=pos;let cursor=pos;for(let i=0;i<count;i++){const m=re.exec(rec);if(!m||!/^[,\s]*$/.test(rec.slice(cursor,m.index)))throw Error('Invalid numeric record data.');tokens.push({text:m[0],start:m.index,end:m.index+m[0].length});cursor=m.index+m[0].length;}return tokens;}
function edit(text,changes){let last=text.length;for(const c of [...changes].sort((a,b)=>b.start-a.start)){if(c.end>last||c.start>c.end)throw Error('Overlapping edits.');text=text.slice(0,c.start)+c.text+text.slice(c.end);last=c.start;}return text;}
function generateShow(bytes,event){
 if(!Object.hasOwn(templates,event))throw Error('Unknown event template.');
 const text=byteText(bytes),nl=text.includes('\r\n')?'\r\n':'\n';
 const cue=record(text,'S',1),stack=record(text,'C',1),page=record(text,'B',1);
 const cue2=record(text,'S',2),stack2=record(text,'C',2);
 const count=parseInt(cue.text.match(/^S,[^,]+,"[^"]*",([^,]+),/)[1],16);
 if(count!==64)throw Error('Unexpected cue channel count.');
 const fields=dataTokens(cue.text,2,count*2),channels=new Map();
 for(const m of text.matchAll(/^L,([0-9a-f]+),"[^"]*",[^,]*,[^,]*,[^,]*,[^,]*,[^,]*,[^,]*,[^,]*,([0-9a-f]+),/gmi))channels.set(parseInt(m[1],16),parseInt(m[2],16));
 const palettes=new Map();
 for(const color of new Set(templates[event].flatMap(l=>[l[3],l[4]]))){
  const match=text.match(new RegExp('^F,(b[0-9a-f]{3}),"'+color+'",([0-9a-f]+),','mi'));if(!match)throw Error('Missing '+color+' palette.');
  const palette=record(text,'F',parseInt(match[1],16));const n=parseInt(match[2],16);if(n!==44)throw Error('Unexpected color palette size.');
  const values=dataTokens(palette.text,1,n*3),map=new Map();
  for(let i=0;i<values.length;i+=3)map.set(parseInt(values[i].text,16),(parseInt(match[1],16)*256)+parseInt(values[i+1].text,16));
  palettes.set(color,map);
 }
 let newCues='',newStacks='';
 for(const [i,look] of templates[event].entries()){
  const [name,pctProfile,pctWash,colorProfile,colorWash]=look,id=101+i,hex=id.toString(16).padStart(4,'0');
  if(new RegExp('^[SC],'+hex+',','m').test(text))throw Error('Generated record IDs already exist.');
  const changes=[];let intensityCount=0,colorCount=0;
  for(let j=0;j<fields.length;j+=2){
   const channel=parseInt(fields[j].text,16),value=fields[j+1],head=channels.get(channel);if(!head||head>12)throw Error('Unknown fixture reference.');
   const profile=head<=4;let v;
   if(parseInt(value.text,16)<=255){v=Math.floor((profile?pctProfile:pctWash)*255/100);intensityCount++;}
   else{v=palettes.get(profile?colorProfile:colorWash).get(channel);if(v===undefined)throw Error('Palette channel mismatch.');colorCount++;}
   changes.push({start:value.start,end:value.end,text:v.toString(16)});
  }
  if(intensityCount!==20||colorCount!==44)throw Error('Unexpected cue attribute mapping.');
  newCues+=edit(cue.text,changes).replace(/^S,0001,"[^"]*",/,'S,'+hex+',"'+name+'",')+nl;
  newStacks+=stack.text.replace(/^C,0001,"[^"]*",/,'C,'+hex+',"'+name+'",').replace(/^0000,0000,0001,/m,'0000,0000,'+hex+',')+nl;
 }
 if(/^B,0003,/m.test(text))throw Error('Page 3 already exists.');
 const pageTokens=dataTokens(page.text,1,404);
 const pageChanges=pageTokens.map((f,i)=>({start:f.start,end:f.end,text:(i%2===0&&i/2<8?101+i/2:0).toString(16).padStart(i%2===0?4:8,'0')}));
 const newPage=edit(page.text,pageChanges).replace(/^B,0001,"[^"]*",/,'B,0003,"Generated Looks",');
 const insertPage=record(text,'B',2).end;
 const output=edit(text,[{start:cue2.end,end:cue2.end,text:nl+newCues},{start:stack2.end,end:stack2.end,text:nl+newStacks},{start:insertPage,end:insertPage,text:nl+newPage}]);
 return Uint8Array.from(output,c=>c.charCodeAt(0));
}
const plan=[['All BW Chase',3,[5,6,7,8,9,10,11,12]],['Truss BW Chase',3,[5,6,7,8]],['Floor BW Chase',3,[9,10,11,12]],['All BW Circle',4,[5,6,7,8,9,10,11,12]],['Truss BW Circle',4,[5,6,7,8]],['Floor BW Circle',4,[9,10,11,12]]];
function subsetCue(cue,heads,id,name,channelHeads){
 const nl=cue.includes('\r\n')?'\r\n':'\n',lines=cue.split(/\r?\n/);
 const header=lines[0].match(/^S,([0-9a-f]+),"[^"]*",([0-9a-f]+),1,0,$/i);if(!header)throw Error('Unsupported FX cue header.');
 const staticCount=parseInt(header[2],16),fxIndex=lines.findIndex(l=>/^000[12],10,/.test(l));
 if(fxIndex!==3)throw Error('Unsupported FX cue layout.');
 const fxFields=lines[fxIndex].split(','),count=parseInt(fxFields[1],16);if(count!==16)throw Error('Expected sixteen effect channels.');
 const rows=lines.slice(fxIndex+1,fxIndex+1+count);
 const timingIndex=lines.findIndex(l=>l==='00000000,00000000,00000000,00000000,00000961,000003e8,000003e8,0000,');
 if(timingIndex<fxIndex+count+1)throw Error('Unsupported FX timing layout.');
 const timing=lines.slice(timingIndex+1,timingIndex+1+count);
 if(timing.some(l=>!/^([0-9a-f]+,){3}$/i.test(l)))throw Error('Invalid FX timing rows.');
 const selected=[];
 rows.forEach((row,i)=>{if(!/^([0-9a-f]+,){7}$/i.test(row))throw Error('Invalid FX channel row.');const head=channelHeads.get(parseInt(row.split(',')[0],16));if(!head)throw Error('Unknown FX fixture reference.');if(heads.includes(head))selected.push(i);});
 if(selected.length!==heads.length*2)throw Error('Unexpected channels per fixture.');
 const staticFields=staticCount?dataTokens(cue,2,staticCount*2):[],staticValues=[];
 for(let i=0;i<staticFields.length;i+=2){const head=channelHeads.get(parseInt(staticFields[i].text,16));if(!head)throw Error('Unknown intensity fixture reference.');if(heads.includes(head))staticValues.push(staticFields[i].text,staticFields[i+1].text);}
 const prefix=lines.slice(0,fxIndex);
 prefix[0]='S,'+id.toString(16).padStart(4,'0')+',"'+name+'",'+(staticValues.length/2).toString(16)+',1,0,';
 prefix[2]=staticValues.length?staticValues.join(',')+',':'';
 fxFields[1]=selected.length.toString(16);
 return [...prefix,fxFields.join(','),...selected.map(i=>rows[i]),...lines.slice(fxIndex+1+count,timingIndex+1),...selected.map(i=>timing[i]),...lines.slice(timingIndex+1+count)].join(nl);
}
function generateEffects(bytes){
 const text=byteText(bytes),nl=text.includes('\r\n')?'\r\n':'\n';
 if(/^B,0002,/m.test(text))throw Error('Page 2 already exists.');
 const channels=new Map();
 for(const m of text.matchAll(/^L,([0-9a-f]+),"[^"]*",[^,]*,[^,]*,[^,]*,[^,]*,[^,]*,[^,]*,[^,]*,([0-9a-f]+),/gmi))channels.set(parseInt(m[1],16),parseInt(m[2],16));
 const page=record(text,'B',1),pageTokens=dataTokens(page.text,1,404);
 let newCues='',newStacks='';
 plan.forEach(([name,source,heads],i)=>{
  const id=201+i,hex=id.toString(16).padStart(4,'0');if(new RegExp('^[SC],'+hex+',','m').test(text))throw Error('Generated IDs already exist.');
  newCues+=subsetCue(record(text,'S',source).text,heads,id,name,channels)+nl;
  const oldHex=source.toString(16).padStart(4,'0');
  newStacks+=record(text,'C',source).text.replace(/^C,[0-9a-f]+,"[^"]*",/i,'C,'+hex+',"'+name+'",').replace(new RegExp('^0000,0000,'+oldHex+',','m'),'0000,0000,'+hex+',')+nl;
 });
 const changes=pageTokens.map((field,i)=>({start:field.start,end:field.end,text:(i%2===0&&i/2<plan.length?201+i/2:0).toString(16).padStart(i%2===0?4:8,'0')}));
 const newPage=edit(page.text,changes).replace(/^B,0001,"[^"]*",/,'B,0002,"Generated FX",');
 const endCue=record(text,'S',4).end,endStack=record(text,'C',4).end;
 return Uint8Array.from(edit(text,[{start:endCue,end:endCue,text:nl+newCues},{start:endStack,end:endStack,text:nl+newStacks},{start:page.end,end:page.end,text:nl+newPage}]),c=>c.charCodeAt(0));
}
async function build(bytes,event){
 if(!globalThis.crypto?.subtle)throw Error('Use a current version of Edge or Chrome.');
 const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
 if(Array.from(digest,b=>b.toString(16).padStart(2,'0')).join('')!==sourceHash)throw Error('Use the exact original TEST EFFECTS.shw you uploaded, not a re-saved or generated copy.');
 return generateShow(generateEffects(bytes),event);
}

(()=>{
const colors=['White','Red','Amber','Yellow','Green','Cyan','Blue','Pink','UV','Magenta'];
const defaults=JSON.parse(JSON.stringify(templates));
const config={looks:JSON.parse(JSON.stringify(templates)),fx:{chase:true,circle:true},places:Array.from({length:12},(_,i)=>(i<2||(i>=4&&i<8))?'Truss':'Floor')};
const oldShow=generateShow,oldEffects=generateEffects;
function validate(){
 if(config.places.length!==12||config.places.some(p=>!['Truss','Floor'].includes(p)))throw Error('Invalid fixture placement.');
 if(!config.looks||Object.keys(config.looks).length!==4||Object.keys(defaults).some(k=>!Object.hasOwn(config.looks,k)))throw Error('Invalid event settings.');
 for(const looks of Object.values(config.looks)){
  if(!Array.isArray(looks)||looks.length!==8)throw Error('Each event needs eight looks.');
  for(const l of looks)if(l.length!==5||typeof l[0]!=='string'||!/^[-A-Za-z0-9 _]{1,24}$/.test(l[0])||!Number.isInteger(l[1])||l[1]<0||l[1]>100||!Number.isInteger(l[2])||l[2]<0||l[2]>100||!colors.includes(l[3])||!colors.includes(l[4]))throw Error('Use 1–24 plain letters/numbers for names, and whole percentages from 0 to 100.');
 }
}
function remember(){try{localStorage.setItem('storm-editor-v1',JSON.stringify(config));}catch{}}
try{
 const saved=JSON.parse(localStorage.getItem('storm-editor-v1'));
 if(saved){config.looks=saved.looks;config.places=saved.places;validate();}
}catch{config.looks=JSON.parse(JSON.stringify(defaults));config.places=Array.from({length:12},(_,i)=>(i<2||(i>=4&&i<8))?'Truss':'Floor');}
function members(test){return Array.from({length:12},(_,i)=>i+1).filter(test);}
function patchGroups(bytes){
 const text=byteText(bytes),refs=new Map();
 for(const m of text.matchAll(/^L,([0-9a-f]+),"[^"]*",[^,]*,[^,]*,0,[^,]*,[^,]*,[^,]*,[^,]*,([0-9a-f]+),/gmi))refs.set(parseInt(m[2],16),m[1]);
 if(refs.size!==12)throw Error('Could not resolve twelve group references.');
 const selections=[['Truss',members(h=>config.places[h-1]==='Truss')],['Floor',members(h=>config.places[h-1]==='Floor')],['Truss Profiles',members(h=>h<=4&&config.places[h-1]==='Truss')],['Floor Profiles',members(h=>h<=4&&config.places[h-1]==='Floor')],['Truss BeamWash',members(h=>h>4&&config.places[h-1]==='Truss')],['Floor BeamWash',members(h=>h>4&&config.places[h-1]==='Floor')]];
 const changes=[];
 for(const [name,heads] of selections){
  const m=text.match(new RegExp('^G,([0-9a-f]+),"'+name+'",([^\\r\\n]*)','mi'));
  if(!m)throw Error('Missing '+name+' group.');
  const parts=m[2].split(','),count=parseInt(parts[0],16);
  if(parts.length!==count+3)throw Error('Unexpected group selection record.');
  const header='G,'+m[1]+',"'+name+'",'+heads.length.toString(16)+','+(heads.length?heads.map(h=>refs.get(h)).join(',')+',':'')+parts[count+1]+',';
  changes.push({start:m.index,end:m.index+m[0].length,text:header});
 }
 return Uint8Array.from(edit(text,changes),c=>c.charCodeAt(0));
}
generateEffects=function(bytes){
 validate();
 const all=members(h=>h>4),truss=members(h=>h>4&&config.places[h-1]==='Truss'),floor=members(h=>h>4&&config.places[h-1]==='Floor');
 const selections=[['All BW Chase',3,all],['Truss BW Chase',3,truss],['Floor BW Chase',3,floor],['All BW Circle',4,all],['Truss BW Circle',4,truss],['Floor BW Circle',4,floor]].filter(l=>l[2].length&&(l[1]===3?config.fx.chase:config.fx.circle));
 const old=plan.slice();plan.splice(0,plan.length,...selections);
 try{return oldEffects(bytes);}finally{plan.splice(0,plan.length,...old);}
};
generateShow=function(bytes,event){
 validate();const old=templates[event];templates[event]=config.looks[event];
 try{return patchGroups(oldShow(bytes,event));}finally{templates[event]=old;}
};
globalThis.StormNative={build,config,defaults,record,byteText,edit};})();
