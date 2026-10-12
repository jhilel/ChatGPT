import csv,importlib.util,json,pathlib,re,unittest
root=pathlib.Path(__file__).resolve().parent.parent
spec=importlib.util.spec_from_file_location('packs',root/'tools/build_profile_packs.py');packs=importlib.util.module_from_spec(spec);spec.loader.exec_module(packs)
def tokens(record):
 values=[]
 for line in record.replace(';','').splitlines():
  row=next(csv.reader([line]));values.extend(row[:-1] if row and row[-1]=='' else row)
 return values
class PackTests(unittest.TestCase):
 def test_legacy_dimmer_upgrades_to_console_saved_field_layout(self):
  body=(root/'test/fixtures/generic-dimmer-legacy.hed').read_bytes()
  value=packs.definition(body,[{'name':'Dimmer','flags':1,'attributeId':0}])
  native=(root/'test/fixtures/generic-dimmer-native.txt').read_text()
  actual=tokens(value['record']);expected=tokens(native)
  self.assertEqual(len(actual),len(expected))
  self.assertEqual(actual[-17:],expected[-17:])
  self.assertEqual(value['locate'],[[0,255]])
  self.assertEqual(value['channels'],[['Dimmer',1,0]])
 def test_counted_locate_table_can_cover_only_some_attributes(self):
  record='P,0000,"Test","Test","2ch","Test",\n0002,0000,0000,0000,0000,0000,0001,0000,0000,00000000,\n"Dimmer",1,0,\n"Reserved",12,3f,\n0001,0000,00ff,\n;\n'
  value=packs.definition(b'V,0099,"MagicQ 1";\n'+record.encode(),[{'name':'Dimmer','flags':1,'attributeId':0},{'name':'Reserved','flags':18,'attributeId':63}])
  self.assertEqual(value['locate'],[[0,255]])
 def test_palette_outside_fixture_is_rejected(self):
  record='P,0000,"Test","Test","1ch","Test",\n0001,0000,0001,0000,0000,0000,0001,0000,0000,00000000,\n"Red",2022,10,\n0001,0000,00ff,\n"Red",0001,0020,06000020,0002,00ff,\n;\n'
  with self.assertRaisesRegex(ValueError,'Palette offset outside channels'):packs.definition(record.encode(),[{'name':'Red','flags':0x2022,'attributeId':16}])
 def test_legacy_module_counts_are_bounded(self):
  body=(root/'test/fixtures/generic-dimmer-legacy.hed').read_bytes().replace(b'\n0000,\n0.850000',b'\nffffffff,\n0.850000')
  with self.assertRaisesRegex(ValueError,'Legacy module table needs normalization'):packs.definition(body,[{'name':'Dimmer','flags':1,'attributeId':0}])
if __name__=='__main__':unittest.main()
