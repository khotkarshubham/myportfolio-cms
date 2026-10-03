import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveSkillKey } from '../../frontend/src/utils/skillNames.js';
import { countryVisits } from '../../frontend/src/utils/countryVisits.js';

test('skill names resolve exact aliases with spaces, punctuation and case', () => {
  for (const [name, key] of [[' GitHub Actions ', 'githubactions'], ['Node.js','nodejs'], ['Amazon Web Services','aws'], ['Google Cloud Platform','gcp'], ['K8s','kubernetes'], ['Proxmox VE','proxmox'], ['C++','c++'], ['C#','c#']]) assert.equal(resolveSkillKey(name), key);
  assert.notEqual(resolveSkillKey('Java'), resolveSkillKey('JavaScript'));
  assert.notEqual(resolveSkillKey('React Native'), resolveSkillKey('React'));
  assert.equal(resolveSkillKey(null), '');
});
test('country totals normalize codes, combine duplicates and retain unknown locations', () => {
  const rows = countryVisits([{_id:'in',count:3},{_id:' IN ',count:2},{_id:'US',count:4},{_id:null,count:1},{_id:'GB',count:-1},{_id:'DE',count:'bad'}]);
  assert.deepEqual(rows, [{code:'IN',count:5},{code:'US',count:4},{code:'UNKNOWN',count:1}]);
  assert.deepEqual(countryVisits(), []);
});
