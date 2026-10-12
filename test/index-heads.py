import importlib.util, pathlib, unittest
root=pathlib.Path(__file__).resolve().parent.parent
spec=importlib.util.spec_from_file_location('index_heads',root/'tools/index_heads.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class IndexTests(unittest.TestCase):
 def test_channel_flags_and_ids_are_preserved(self):
  data=b'V,009a,"MagicQ 1";\nP,0000,"Example_2ch","Example","2ch","Spot",\n0002,0000,0000,\n"Dimmer",00000001,00000000,\n"Pan",00000036,00000004,\n"Fixture Name",\n;\n'
  item,attrs=module.parse_personality('Example_2ch.hed',data)
  self.assertEqual(item['manufacturer'],'Example');self.assertEqual(item['model'],'Fixture Name');self.assertEqual(item['logicalChannels'],2);self.assertEqual(attrs[1],{'offset':1,'name':'Pan','flags':0x36,'attributeId':4})
 def test_parent_is_indexed_without_inventing_a_footprint(self):
  data=b'P,0000,"Server","Media","Parent","Server",\n0000,0000,\n"Server",\n;\n'
  item,attrs=module.parse_personality('Server.hed',data)
  self.assertEqual(item['definitionKind'],'parent');self.assertEqual(attrs,[]);self.assertNotIn('footprint',item)
 def test_compound_keeps_root_identity(self):
  data=b'P,0000,"Parent","Brand","Mode","Root",\n0001,0000,\n"Dim",1,0,\n"Root Model",\n;\nP,0001,"Child","Brand","Child","Child",\n0000,\n"Child Model",\n;\n'
  item,attrs=module.parse_personality('Parent.hed',data)
  self.assertEqual(item['definitionKind'],'compound');self.assertEqual(item['embeddedProfiles'],2);self.assertEqual(item['model'],'Root Model')
 def test_truncated_or_malformed_channel_rows_fail(self):
  with self.assertRaises(ValueError):module.parse_personality('Bad.hed',b'P,0,"Bad","Brand","Mode","Bad",\n0001,\nnot-a-channel\n')
if __name__=='__main__':unittest.main()
