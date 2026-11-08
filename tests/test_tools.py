import importlib.util
from pathlib import Path
import unittest
path=Path(__file__).resolve().parents[1]/'tools/analyze.py'
spec=importlib.util.spec_from_file_location('analyze',path)
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class AnalysisTests(unittest.TestCase):
 def test_collision_checks_full_width_not_only_apex(self):
  self.assertTrue(module.clears(40,14,70))
  self.assertFalse(module.clears(69,96,70))
  self.assertFalse(module.clears(500,14,170,True))
 def test_sample_deduplicates_and_reports_censoring(self):
  report=module.analyze({'source':'synthetic test','synthetic':True,'transactions':[{'txid':'a'*64,'value':'0'},{'txid':'a'*64,'value':'0'}]},seeds=3)
  self.assertEqual(report['uniqueTransactions'],1)
  self.assertTrue(report['synthetic'])
  self.assertEqual(report['references']['beginner']['runsByRescueBudget']['0']['datasetExhaustedWithoutDeath'],3)
