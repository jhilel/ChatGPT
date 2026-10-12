(()=>{
const verified=new Map(Catalog.fixtures.map(f=>[f.id,f]));
Catalog.verifiedIds=[...verified.keys()];
Catalog.fixtures=FixtureLibrary.fixtures.map(f=>{
 const match=verified.get(f.id),supported=Boolean(match&&match.libraryProfileSha256===f.profileSha256);
 return {...f,...(supported?{verifiedQuantity:match.verifiedQuantity,footprint:match.footprint}:{}),exportSupported:Boolean(f.nativePack)};
});
const byId=new Map(Catalog.fixtures.map(f=>[f.id,f]));
const normalize=s=>String(s).normalize('NFKD').replace(/[^A-Za-z0-9]/g,'').toLowerCase();
const searchData=Catalog.fixtures.map(f=>({fixture:f,text:normalize([f.manufacturer,f.model,f.shortName,f.mode,f.nativePersonality].join(' '))}));
function search(query,manufacturer='',limit=50){
 const terms=String(query).trim().split(/\s+/).filter(Boolean).map(normalize).filter(Boolean);
 const results=[];let total=0;
 for(const row of searchData){if(manufacturer&&row.fixture.manufacturer!==manufacturer)continue;if(!terms.every(t=>row.text.includes(t)))continue;total++;if(results.length<limit)results.push(row.fixture);}
 return {results,total};
}
globalThis.StormLibrary={search,byId,manufacturers:[...new Set(Catalog.fixtures.map(f=>f.manufacturer))].sort(),stats:{modes:Catalog.fixtures.length,manufacturers:FixtureLibrary.manufacturers||new Set(Catalog.fixtures.map(f=>f.manufacturer)).size}};
})();
