import fs from 'node:fs';
import vm from 'node:vm';
import {gunzipSync} from 'node:zlib';
import {webcrypto} from 'node:crypto';
export const root=new URL('../',import.meta.url);
export const seed=JSON.parse(fs.readFileSync(new URL('src/factory-seed.json',root)));
export const library=JSON.parse(fs.readFileSync(new URL('public/fixture-library.json',root)));
const packs=new Map();
export async function definitions(fixtures){const result=new Map();for(const f of fixtures){if(!packs.has(f.nativePack)){const ctx=vm.createContext({});vm.runInContext(fs.readFileSync(new URL('public/profiles/'+f.nativePack,root),'utf8'),ctx);packs.set(f.nativePack,JSON.parse(gunzipSync(Buffer.from(ctx.MagicQProfilePacks[f.nativePack],'base64'))));}result.set(f.id,packs.get(f.nativePack)[f.id]);}return result;}
export function setup(){const ctx=vm.createContext({Catalog:JSON.parse(fs.readFileSync(new URL('src/catalog.json',root))),FixtureLibrary:library,crypto:webcrypto,Uint8Array,TextEncoder,atob,MagicQProfiles:{load:definitions}});for(const file of ['library-runtime.js','native-runtime.js','magicvis-geometry.js','show-planner.js','rig-compiler.js','brief.js'])vm.runInContext(fs.readFileSync(new URL('src/'+file,root),'utf8'),ctx);return ctx;}
export function project(rows){rows||=[{profileId:'storm2-profile-32',quantity:4,role:'stage'},{profileId:'storm2-beamwash-basic1',quantity:8,role:'decorative'}];return {name:'Test',rig:rows,brief:'Corporate summit blue branding',event:'auto',brand:'auto',movement:true,chase:true,room:{unit:'ft',width:60,depth:40,stageWidth:24,stageDepth:10,trussHeight:16},places:Array.from({length:rows.reduce((n,r)=>n+r.quantity,0)},(_,i)=>i%2?'Floor':'Truss')};}
