import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';
import assets from '../src/policy-assets.json' with { type: 'json' };
import { createHash } from 'node:crypto';
test('Policy routes return exact reviewed bytes with no scripts or indexing', async () => {
 for (const [path, asset] of Object.entries(assets)) {
  const r = await worker.fetch(new Request('https://example.test'+path));
  assert.equal(r.status,200);
  assert.equal(createHash('sha256').update(Buffer.from(await r.arrayBuffer())).digest('hex'),asset.sha256);
  assert.equal(r.headers.get('X-Robots-Tag'),'noindex, nofollow');
  assert.match(r.headers.get('Content-Security-Policy'),/default-src 'none'/);
 }
});
test('Policy routes accept only exact static paths and retrieval methods', async () => {
 for (const [path,method,status] of [
  ['/public-guidance/privacy.en.html','HEAD',200],
  ['/public-guidance/privacy.en.html','POST',405],
  ['/public-guidance/private.json','GET',404],
  ['/public-guidance/privacy.en.html?conversation=secret','GET',400]]) {
  const r=await worker.fetch(new Request('https://example.test'+path,{method}));
  assert.equal(r.status,status);
 }
});
