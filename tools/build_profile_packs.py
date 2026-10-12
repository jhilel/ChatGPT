"""Package native personality data for lazy local-browser loading."""
import argparse,base64,csv,gzip,json,re,sqlite3
from pathlib import Path

def native_records(body):
 text=body.decode('utf-8');start=None;quoted=False;out=[];record_start=0
 for i,c in enumerate(text):
  if c=='"':quoted=not quoted
  if c==';' and not quoted:
   part=text[record_start:i+1].strip();record_start=i+1
   match=re.search(r'(?m)^P,',part)
   if match:out.append(part[match.start():]+'\n')
 return out

def upgrade_record(record,count,version,start):
 """Fill older personality tails to the user-tested 0099 show schema.

 Older .hed bodies end before modern geometry/emitter/module fields. Copying
 them verbatim into a 0099 .shw loses that version context. Keep existing
 fields and append defaults only at complete field-block boundaries.
 """
 if version>=0x99:return record
 lines=record.removesuffix('\n').removesuffix(';').splitlines()
 graphic=None
 for i in range(start,len(lines)-count):
  if lines[i].startswith('"') and len(next(csv.reader([lines[i]])))==8 and all(re.fullmatch(r'(?:[0-9a-f]+,){4}',l,re.I) for l in lines[i+1:i+1+count]):
   graphic=i;break
 if graphic is None:raise ValueError('Unsupported legacy channel graphics table')
 end=graphic+1+count+6
 if end>len(lines):raise ValueError('Incomplete legacy personality metadata')
 # These fields already existed in the oldest bundled profiles.
 expected=[1,10,1,3,6,2]
 for line,n in zip(lines[graphic+1+count:end],expected):
  fields=next(csv.reader([line]));fields=fields[:-1] if fields and fields[-1]=='' else fields
  if len(fields)!=n:raise ValueError('Unsupported legacy personality metadata')
 tokens=[]
 for line in lines[end:]:
  row=next(csv.reader([line]));tokens.extend(row[:-1] if row and row[-1]=='' else row)
 pos=0;output=[];blocks=[]
 def block(defaults):
  nonlocal pos
  n=len(defaults)
  begin=len(output)
  if pos==len(tokens):output.extend(defaults);blocks.append((begin,len(output)));return defaults
  # Older versions sometimes end partway through a block whose trailing
  # fields were added later (for example the author/date block).
  values=tokens[pos:pos+n];pos+=len(values);values+=defaults[len(values):];output.extend(values);blocks.append((begin,len(output)));return values
 block(['0']*8+['0.000000']) # body dimensions/model
 block(['0']*11);block(['0']*3);block(['0'])
 block(['00000000','00000000']+['0000']*(count+1)) # cell map
 block(['0000','0000','0000','00000000','00000000','0'])
 block(['']);emitters=block(['0']);n=int(emitters[0],16)
 if n>512:raise ValueError('Legacy cell geometry needs normalization')
 for _ in range(n):block(['0000','','0.000000','0.000000','0.000000'])
 block(['{00000000-0000-0000-0000-000000000000}'])
 block(['1.000000','0000','0000']);modules=block(['0000']);module_strings=[]
 module_count=int(modules[0],16)
 if module_count>512:raise ValueError('Legacy module table needs normalization')
 for _ in range(module_count):
  module_strings.append(len(output));values=block(['','00000000','00000000','00000000','00000000','00000000','0'])
  if int(values[-1],16):raise ValueError('Legacy module membership needs normalization')
 block(['0.850000','0.850000','0.000000','0.000000'])
 block(['0.000000']*4+['0','0']);block(['0'])
 if pos!=len(tokens):raise ValueError('Unrecognized legacy personality extension')
 # Serialize quoted string fields without relying on CSV's numeric quoting.
 string_indexes=set();cursor=9+11+3+1+(count+3)+6
 string_indexes.add(cursor);cursor+=1+1
 for _ in range(n):string_indexes.add(cursor+1);cursor+=5
 string_indexes.add(cursor)
 string_indexes.update(module_strings)
 values=[('"'+v.replace('"','""')+'"') if i in string_indexes else v for i,v in enumerate(output)]
 prefix='\n'.join(lines[:end]).rstrip().rstrip(',')+',\n'
 return prefix+''.join(','.join(values[a:b])+',\n' for a,b in blocks)+';\n'

def definition(body,attrs):
 records=native_records(body)
 if len(records)!=1:raise ValueError('Compound personality requires module expansion')
 record=records[0];lines=record.splitlines();meta=next(csv.reader([lines[1]]));count=int(meta[0],16);ranges=int(meta[1],16);palettes=int(meta[2],16)
 pos=2+count;values=[]
 locate_count=int(lines[pos].split(",")[0],16)
 while pos<len(lines) and len(values)<1+2*locate_count:
  values.extend(int(v,16) for v in lines[pos].split(',') if v.strip());pos+=1
 if values[0]!=locate_count or len(values)!=1+2*locate_count:raise ValueError('Unsupported locate-value table')
 locate=[[values[i],values[i+1]] for i in range(1,len(values),2)]
 parsed_ranges=[]
 for line in lines[pos:pos+ranges]:
  row=next(csv.reader([line]));parsed_ranges.append([int(row[0],16),row[1],int(row[2],16),int(row[3],16),int(row[4],16),int(row[5],16)])
 pos+=ranges;color=[]
 for line in lines[pos:pos+palettes]:
  row=next(csv.reader([line]));n=int(row[1],16)
  pairs=[[int(row[i],16),int(row[i+1],16)] for i in range(4,4+n*2,2)]
  if any(offset>=count for offset,_ in pairs):raise ValueError('Palette offset outside channels')
  color.append([row[0],int(row[3],16),pairs])
 version_match=re.search(rb'(?m)^V,([0-9a-f]+),',body,re.I)
 version=int(version_match[1],16) if version_match else 0
 record=upgrade_record(record,count,version,pos+palettes)
 return {'record':record,'sourceFormat':version,'channels':[[a['name'],a['flags'],a['attributeId']] for a in attrs],'locate':locate,'colors':color,'ranges':parsed_ranges}

def main():
 parser=argparse.ArgumentParser();parser.add_argument('database',type=Path);parser.add_argument('--catalog',type=Path,required=True);parser.add_argument('--output',type=Path,required=True);args=parser.parse_args()
 lib=json.loads(args.catalog.read_text());db=sqlite3.connect(args.database);args.output.mkdir(parents=True,exist_ok=True)
 pack={};pack_ids=[];number=0;accepted=0;unsupported=[]
 def flush():
  nonlocal pack,pack_ids,number
  if not pack:return
  name=f'profiles-{number:03d}.js';raw=json.dumps(pack,separators=(',',':')).encode();data=base64.b64encode(gzip.compress(raw,compresslevel=6,mtime=0)).decode()
  (args.output/name).write_text('globalThis.MagicQProfilePacks=globalThis.MagicQProfilePacks||{};globalThis.MagicQProfilePacks["'+name+'"]="'+data+'";\n')
  for f in pack_ids:f['nativePack']=name
  number+=1;pack={};pack_ids=[]
 for f in lib['fixtures']:
  f.pop('nativePack',None);f.pop('compilerIssue',None)
  if f['definitionKind']!='single' or not f['logicalChannels']:
   f['compilerIssue']='Parent or compound definition needs module expansion';continue
  row=db.execute('select attributes,body from profiles where id=?',(f['id'],)).fetchone()
  try:
   value=definition(row[1],json.loads(row[0]));pack[f['id']]=value;pack_ids.append(f);accepted+=1
  except (ValueError,IndexError,TypeError) as e:
   reason=str(e)
   f['compilerIssue']='Legacy cell/geometry data needs normalization' if reason.startswith('invalid literal for int()') else reason
   unsupported.append({'id':f['id'],'reason':reason})
  if len(pack)>=1500:flush()
 flush()
 for path in args.output.glob('profiles-*.js'):
  if re.fullmatch(r'profiles-\d{3}\.js',path.name) and int(path.stem.split('-')[1])>=number:path.unlink()
 lib['nativeCompilerModes']=accepted;lib['compilerUnsupported']=len(lib['fixtures'])-accepted;args.catalog.write_text(json.dumps(lib,ensure_ascii=True,separators=(',',':')))
 (args.output/'report.json').write_text(json.dumps({'compiledDefinitions':accepted,'packs':number,'parserIssues':unsupported},indent=2))
 print(json.dumps({'compiledDefinitions':accepted,'packs':number,'parserIssues':len(unsupported)}))

if __name__=='__main__':main()
