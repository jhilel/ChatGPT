"""Check every indexed source personality against the provided bundle/catalog."""
import argparse,collections,hashlib,json,sqlite3
from pathlib import Path

def audit(database,catalog,output):
 lib=json.loads(catalog.read_text());by_id={f['id']:f for f in lib['fixtures']};db=sqlite3.connect(database);results=[];counts=collections.Counter()
 for pid,filename,metadata,attributes,body in db.execute('select id,filename,metadata,attributes,body from profiles order by id'):
  f=by_id.get(pid);attrs=json.loads(attributes);original=json.loads(metadata);errors=[]
  if not f:errors.append('source_not_in_catalog')
  else:
   if hashlib.sha256(body).hexdigest()!=f['profileSha256']:errors.append('source_sha256_mismatch')
   for key in ['nativePersonality','manufacturer','mode','logicalChannels','definitionKind','embeddedProfiles','sourceFile']:
    if f[key]!=original[key]:errors.append('catalog_metadata_mismatch:'+key)
   if len(attrs)!=f['logicalChannels']:errors.append('source_channel_count_mismatch')
   if [a['offset'] for a in attrs]!=list(range(len(attrs))):errors.append('source_channel_offsets_not_contiguous')
   if filename!=f['sourceFile']:errors.append('source_filename_mismatch')
  counts['checked']+=1;counts['failed' if errors else 'passed']+=1
  results.append({'id':pid,'errors':errors})
 missing=sorted(set(by_id)-{r['id'] for r in results});db.close();result={'counts':dict(counts),'missingSourceIds':missing,'modes':results};output.write_text(json.dumps(result,separators=(',',':')));print(json.dumps({'counts':dict(counts),'missingSourceIds':len(missing)}));return result
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--database',type=Path,required=True);p.add_argument('--catalog',type=Path,default=Path('public/fixture-library.json'));p.add_argument('--output',type=Path,default=Path('/tmp/fixture-source-audit.json'));a=p.parse_args();audit(a.database,a.catalog,a.output)
