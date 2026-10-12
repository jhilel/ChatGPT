(()=>{
const unitScale=unit=>unit==='ft'?0.3048:1;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function sync(project){
 const scale=unitScale(project.room.unit),existing=new Map((project.layout||[]).map(p=>[p.key,p]));let head=0;
 project.layout=project.rig.flatMap((row,rowIndex)=>{row.layoutKey||=globalThis.crypto?.randomUUID?.()||'row-'+Date.now()+'-'+rowIndex;const result=[];for(let i=0;i<row.quantity&&i<512;i++){const key=row.layoutKey+':'+i,place=project.places[head++]||'Truss';let point=existing.get(key);if(!point)point={key,x:project.room.stageWidth*scale*((i+1)/(row.quantity+1)-.5),depth:place==='Truss'?0:project.room.stageDepth*scale,height:place==='Truss'?project.room.trussHeight*scale:0,rx:0,ry:0,rz:0,custom:false};result.push(point);}return result;});
}
function validate(project){const errors=[];for(const p of project.layout||[])for(const key of ['x','depth','height','rx','ry','rz'])if(!Number.isFinite(p[key])||Math.abs(p[key])>(['rx','ry','rz'].includes(key)?360:1000))errors.push('Layout positions must be finite and within 1000 metres; rotations must be within ±360° .');if((project.layout||[]).some(p=>p.height<0))errors.push('Fixture height cannot be negative.');return [...new Set(errors)];}
function draw(project,element,selected,onSelect,onChange){
 const ns='http://www.w3.org/2000/svg',make=(tag,attrs,text)=>{const e=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);if(text!==undefined)e.textContent=text;return e;};
 element.replaceChildren();const u=unitScale(project.room.unit),width=project.room.width*u,depth=project.room.depth*u;if(![width,depth].every(v=>Number.isFinite(v)&&v>0))return;
 const scale=Math.min(440/width,330/depth),left=(500-width*scale)/2,top=30,stageWidth=Math.min(project.room.stageWidth*u,width),stageDepth=Math.min(project.room.stageDepth*u,depth);
 element.append(make('rect',{x:left,y:top,width:width*scale,height:depth*scale,fill:'#101c2d',stroke:'#456381'}),make('rect',{x:250-stageWidth*scale/2,y:top,width:stageWidth*scale,height:stageDepth*scale,fill:'#2c435c',stroke:'#73e2bc'}),make('text',{x:250,y:top+18,fill:'#e9eff9','text-anchor':'middle'},'STAGE'));
 project.layout.forEach((point,index)=>{const cx=250+point.x*scale,cy=top+point.depth*scale,g=make('g',{class:'fixture','data-head':index+1,tabindex:0,role:'button','aria-label':'Head '+(index+1)+'. Select to edit position.',style:'touch-action:none'}),circle=make('circle',{cx,cy,r:selected===index?14:11,fill:project.places[index]==='Truss'?'#73e2bc':'#f0bc6b',stroke:selected===index?'white':'none','stroke-width':2}),label=make('text',{x:cx,y:cy+4,'text-anchor':'middle',fill:'#0d1422','font-size':11},index+1);g.append(circle,label);element.append(g);
  let moving=false;
  const move=e=>{if(!moving)return;const cursor=element.createSVGPoint();cursor.x=e.clientX;cursor.y=e.clientY;const screen=element.getScreenCTM();if(!screen)return;const p=cursor.matrixTransform(screen.inverse());point.x=Math.round(clamp((p.x-250)/scale,-width/2,width/2)*1000)/1000;point.depth=Math.round(clamp((p.y-top)/scale,0,depth)*1000)/1000;point.custom=true;circle.setAttribute('cx',250+point.x*scale);circle.setAttribute('cy',top+point.depth*scale);label.setAttribute('x',250+point.x*scale);label.setAttribute('y',top+point.depth*scale+4);};
  g.onpointerdown=e=>{e.preventDefault();moving=true;g.setPointerCapture(e.pointerId);};g.onpointermove=move;g.onpointerup=e=>{move(e);moving=false;if(g.hasPointerCapture(e.pointerId))g.releasePointerCapture(e.pointerId);onSelect(index);onChange();};g.onpointercancel=()=>{moving=false;onChange();};g.onkeydown=e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();onSelect(index);onChange();}};
 });
 const active=element.querySelector('[data-head="'+(selected+1)+'"]');if(active)element.append(active);
 element.append(make('text',{x:250,y:390,fill:'#b3c2d7','text-anchor':'middle','font-size':12},'X: left/right · Depth: toward audience · Height: above floor'));
}
globalThis.RoomLayout={sync,validate,draw,unitScale};
})();
