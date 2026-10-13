from pathlib import Path
import html
import json
root = Path(__file__).resolve().parent.parent
shell = (root / 'src/app-shell.html').read_text(encoding='utf-8')
library = json.loads((root / 'public/fixture-library.json').read_text())
manufacturers = sorted({f['manufacturer'] for f in library['fixtures']})
options = ''.join('<option value="'+html.escape(name, quote=True)+'">'+html.escape(name or '(unspecified)')+'</option>' for name in manufacturers)
shell = shell.replace('<!-- MANUFACTURERS -->', options)
shell = shell.replace('/* DATA */', 'const Catalog=' + (root / 'src/catalog.json').read_text() + ';\nconst FixtureLibrary=' + (root / 'public/fixture-library.json').read_text().replace('<', r'\u003c') + ';\nconst FactorySeed=' + (root / 'src/factory-seed.json').read_text() + ';')
for placeholder, name in [('LIBRARY', 'library-runtime.js'), ('NATIVE', 'native-runtime.js'), ('PROFILES', 'profile-loader.js'), ('GEOMETRY', 'magicvis-geometry.js'), ('PLANNER', 'show-planner.js'), ('COMPILER', 'rig-compiler.js'), ('BRIEF', 'brief.js'), ('LAYOUT', 'room-layout.js'), ('SCENE', 'scene-export.js'), ('UI', 'app-ui.js')]:
    shell = shell.replace('/* '+placeholder+' */', (root / 'src' / name).read_text())
(root / 'public/rig-to-show.html').write_text(shell)
print('Built standalone no-upload app: public/rig-to-show.html')
