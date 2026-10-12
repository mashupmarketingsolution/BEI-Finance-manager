import test from 'node:test';
import assert from 'node:assert/strict';
import {pageWindow} from './pagination.js';

test('pagination covers each record exactly once and supports All', () => {
  const records = Array.from({length: 26}, (_, i) => i);
  const result = [1,2,3].flatMap(page => {const r=pageWindow(records.length,'10',page);return records.slice(r.start,r.end);});
  assert.deepEqual(result,records);
  assert.deepEqual(pageWindow(26,'all',5),{page:1,pages:1,start:0,end:26});
  assert.deepEqual(pageWindow(26,'25',2),{page:2,pages:2,start:25,end:26});
  assert.deepEqual(pageWindow(0,'all',3),{page:1,pages:1,start:0,end:0});
  assert.deepEqual(pageWindow(9,'10',3),{page:1,pages:1,start:0,end:9});
});
