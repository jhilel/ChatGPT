(()=>{
// MagicQ saves these transform strings as two-decimal, float32 values.
// Verified against the user's MagicQ-saved VIS POSITION TEST.shw.
function decimal(value){if(!Number.isFinite(value)||Math.abs(value)>10000)throw Error('Invalid MagicVis transform.');const n=Math.fround(value),scaled=Math.abs(n)*100,whole=Math.floor(scaled),fraction=scaled-whole;const rounded=fraction>.5?whole+1:fraction<.5?whole:whole%2?whole+1:whole;return (n<0?'-':'')+(rounded/100).toFixed(2);}
function encode(value){return [...decimal(value)].map((c,i)=>String.fromCharCode((c.charCodeAt(0)+i+3)^107)).join('');}
function decode(text){const plain=[...text].map((c,i)=>String.fromCharCode((c.charCodeAt(0)^107)-i-3)).join('');if(!/^-?\d+\.\d{2}$/.test(plain))throw Error('Invalid MagicVis coordinate encoding.');return Number(plain);}
function transform(record,point){const values=[point.x,point.depth,point.height,point.rx,point.ry,point.rz];let i=0;return record.replace(/"[^"\n]*"/g,(match,offset)=>{if(offset<record.indexOf('\n')||i>=6)return match;return '"'+encode(values[i++])+'"';});}
const radians=d=>d*Math.PI/180,degrees=r=>r*180/Math.PI;
function inverseRotation(v,p){let [x,y,z]=v;for(const [axis,angle] of [['z',-p.rz],['y',-p.ry],['x',-p.rx]]){const c=Math.cos(radians(angle)),s=Math.sin(radians(angle));if(axis==='z')[x,y]=[c*x-s*y,s*x+c*y];if(axis==='y')[x,z]=[c*x+s*z,-s*x+c*z];if(axis==='x')[y,z]=[c*y-s*z,s*y+c*z];}return [x,y,z];}
function aim(point,definition){point={...point};for(const key of ['x','depth','height','rx','ry','rz'])point[key]=Number(decimal(point[key]));const target=point.target;if(!target)throw Error('Set a focus target for every moving fixture.');const vector=inverseRotation([target.x-point.x,target.depth-point.depth,target.height-point.height-(point.beamHeightOffset||0)],point),distance=Math.hypot(...vector);if(distance<.01)throw Error('Focus target must be away from the fixture.');
 const meta=definition.record.split(/\r?\n/)[1].split(',').map(v=>parseInt(v,16)),panRange=meta[4],tiltRange=meta[5];if(!panRange||!tiltRange)throw Error('This personality has no usable pan/tilt travel data.');
 const locate=new Map(definition.locate),coarse=attr=>definition.channels.findIndex(([,f,a])=>a===attr&&!(f&8)),fine=attr=>definition.channels.findIndex(([,f,a])=>a===attr&&Boolean(f&8)),pan=coarse(4),tilt=coarse(5);if(pan<0||tilt<0)return null;
 const zero=attr=>{const c=coarse(attr),f=fine(attr);return ((locate.get(c)??128)*256)+(f>=0?(locate.get(f)??0):0);};
 const panZero=zero(4),tiltZero=zero(5),heading=degrees(Math.atan2(vector[0],vector[1]))-(point.panHeading||0),polar=degrees(Math.acos(Math.max(-1,Math.min(1,(point.neutralBeam==='up'?vector[2]:-vector[2])/distance))));const candidates=[];
 const calibration=point.focusCalibration;if(calibration&&(![1,-1].includes(calibration.sign)||['panOffset','tiltOffset'].some(k=>!Number.isFinite(calibration[k])||Math.abs(calibration[k])>65535)))throw Error('Invalid imported aiming calibration.');
 for(const sign of [1,-1])for(let turn=-2;turn<=2;turn++){if(calibration&&sign!==calibration.sign)continue;const pa=heading+(sign<0?180:0)+turn*360,ta=sign*polar,pv=panZero+(pa+(point.panTrim||0))/panRange*65535*(point.panInvert?-1:1)+(calibration?.panOffset||0),tv=tiltZero+(ta+(point.tiltTrim||0))/tiltRange*65535*(point.tiltInvert?-1:1)+(calibration?.tiltOffset||0);if(pv>=0&&pv<=65535&&tv>=0&&tv<=65535)candidates.push({pan:Math.round(pv),tilt:Math.round(tv),sign,cost:Math.abs(pa)+Math.abs(ta),distance});}
 candidates.sort((a,b)=>a.cost-b.cost);if(!candidates.length)throw Error('Focus target is outside this fixture’s pan/tilt travel.');const result=candidates[0],values=new Map();for(const [attr,value] of [[4,result.pan],[5,result.tilt]]){values.set(coarse(attr),value>>>8);const f=fine(attr);if(f>=0)values.set(f,value&255);}return {...result,values};
}
globalThis.MagicVisGeometry={encode,decode,decimal,transform,aim,inverseRotation};
})();
