(()=>{
const cache=new Map();
async function loadPack(name){
 if(!/^profiles-\d{3}\.js$/.test(name))throw Error('Invalid native personality pack.');
 if(!cache.has(name))cache.set(name,(async()=>{
  if(!globalThis.DecompressionStream)throw Error('Open the app in a current version of Chrome, Edge or Safari.');
  if(!globalThis.MagicQProfilePacks?.[name])await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=new URL('profiles/'+name,document.baseURI);s.onload=resolve;s.onerror=()=>reject(Error('Cannot load fixture definitions. Extract the entire ZIP and keep the profiles folder beside rig-to-show.html.'));document.head.append(s);});
  const encoded=globalThis.MagicQProfilePacks?.[name];if(!encoded)throw Error('Missing native personality pack.');
  const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));
  const result=JSON.parse(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text());
  delete globalThis.MagicQProfilePacks[name];return result;
 })().catch(e=>{cache.delete(name);throw e;}));
 return cache.get(name);
}
async function load(fixtures){const result=new Map();for(const f of fixtures){if(!f.nativePack)throw Error(f.model+': '+(f.compilerIssue||'Native definition unavailable'));const pack=await loadPack(f.nativePack);if(!pack[f.id])throw Error('Fixture definition does not match the catalog.');result.set(f.id,pack[f.id]);}return result;}
globalThis.MagicQProfiles={load};
})();
