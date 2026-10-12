"""Index a decoded MagicQ bundle as data, never as executable instructions."""
import argparse, csv, hashlib, json, re, sqlite3
from pathlib import Path

def parse_personality(filename, data):
    text = data.decode('utf-8')
    lines = text.splitlines()
    positions = [i for i, line in enumerate(lines) if line.startswith('P,')]
    if not positions:
        raise ValueError('Missing P record')
    i = positions[0]
    profile_end = positions[1] if len(positions) > 1 else len(lines)
    header = next(csv.reader([lines[i]]))
    if len(header) < 7:
        raise ValueError('Incomplete personality header')
    meta = next(csv.reader([lines[i+1]]))
    count = int(meta[0], 16)
    if not 0 <= count <= 32768:
        raise ValueError(f'Unsupported logical-channel count {count}')
    attrs = []
    for offset, line in enumerate(lines[i+2:i+2+count]):
        row = next(csv.reader([line]))
        if len(row) != 4 or row[-1] != '':
            raise ValueError('Unsupported channel declaration')
        attrs.append({'offset': offset, 'name': row[0], 'flags': int(row[1], 16), 'attributeId': int(row[2], 16)})
    if len(attrs) != count:
        raise ValueError('Truncated channel declarations')
    desc = [m[1] for line in lines[i+2+count:profile_end] if (m := re.fullmatch(r'"([^"{}]+)",', line))]
    model = desc[-1] if desc else header[5]
    name = header[2]
    key = hashlib.sha256(filename.encode()).hexdigest()[:20]
    aliases = {'Chauvet Pro_MaverickStorm2P_32ch': 'storm2-profile-32', 'Chauvet Pro_MavStorm2BW_Single Basic1': 'storm2-beamwash-basic1'}
    item = {'id': aliases.get(name, 'mq-'+key), 'manufacturer': header[3], 'model': model, 'shortName': header[5], 'mode': header[4] or '(default)', 'nativePersonality': name, 'logicalChannels': count, 'definitionKind': 'compound' if len(positions)>1 else ('parent' if count==0 else 'single'), 'embeddedProfiles': len(positions), 'sourceFile': filename, 'profileSha256': hashlib.sha256(data).hexdigest()}
    return item, attrs

def blocks(path):
    filename = None
    chunks = []
    with path.open('rb') as stream:
        for line in stream:
            if line.startswith(b'PP,'):
                if filename is not None:
                    yield filename, b''.join(chunks)
                row = next(csv.reader([line.decode('utf-8')]))
                filename = row[1]
                chunks = []
            else:
                chunks.append(line)
        if filename is not None:
            yield filename, b''.join(chunks)

def index(decoded, output, database, report):
    database.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(database)
    db.execute('CREATE TABLE IF NOT EXISTS profiles (id TEXT PRIMARY KEY, filename TEXT UNIQUE, metadata TEXT NOT NULL, attributes TEXT NOT NULL, body BLOB NOT NULL)')
    db.execute('DELETE FROM profiles')
    fixtures = []
    skipped = []
    other = 0
    headers = 0
    ids = set()
    for filename, data in blocks(decoded):
        headers += 1
        if not filename.lower().endswith('.hed'):
            other += 1
            continue
        try:
            item, attrs = parse_personality(filename, data)
            if item['id'] in ids:
                raise ValueError('Duplicate profile identity')
            ids.add(item['id'])
            fixtures.append(item)
            db.execute('INSERT INTO profiles VALUES (?,?,?,?,?)', (item['id'], filename, json.dumps(item), json.dumps(attrs), data))
        except (ValueError, IndexError, UnicodeError, sqlite3.IntegrityError) as e:
            skipped.append({'filename': filename, 'reason': str(e)})
    db.commit()
    db.close()
    fixtures.sort(key=lambda f: (f['manufacturer'].casefold(), f['model'].casefold(), f['mode'].casefold()))
    result = {'version': 1, 'source': 'User-supplied MagicQ heads.all', 'fixtures': fixtures, 'bundleFiles': headers, 'nonPersonalityFiles': other, 'unparsedPersonalities': len(skipped), 'note': 'logicalChannels counts native channel declarations, not a universally verified physical DMX footprint. Catalog presence does not establish native export support.'}
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, ensure_ascii=True, separators=(',', ':')))
    summary = {'bundleFiles': headers, 'indexedModes': len(fixtures), 'manufacturers': len({f['manufacturer'] for f in fixtures}), 'models': len({(f['manufacturer'], f['model']) for f in fixtures}), 'nonPersonalityFiles': other, 'unparsedPersonalities': skipped}
    report.write_text(json.dumps(summary, indent=2))
    print(json.dumps({k: v for k, v in summary.items() if k != 'unparsedPersonalities'}))
    print('Unparsed personalities:', len(skipped), 'Metadata JSON bytes:', output.stat().st_size)

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('decoded', type=Path)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--database', type=Path, required=True)
    parser.add_argument('--report', type=Path, required=True)
    args = parser.parse_args()
    index(args.decoded, args.output, args.database, args.report)
