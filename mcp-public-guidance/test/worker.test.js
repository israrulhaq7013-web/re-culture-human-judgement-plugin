import test from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import worker from '../src/worker.js';

const environment = { PUBLIC_GUIDANCE_RATE_LIMITER: { limit: async () => ({ success: true }) } };
const headers = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' };
const rpc = (name, args) => ({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } });
const request = (message, extra = {}) => new Request('https://guidance.test/mcp', { method: 'POST', headers: { ...headers, ...extra }, body: JSON.stringify(message) });

test('Official MCP Client Initializes And Reads All Six Bilingual Records', async () => {
  const client = new Client({ name: 'synthetic-test', version: '1.0.0' });
  const transport = new StreamableHTTPClientTransport(new URL('https://guidance.test/mcp'), {
    fetch: async (input, init) => worker.fetch(new Request(input, init), environment)
  });
  await client.connect(transport);
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map(t => t.name).sort(), ['get_public_guidance', 'list_public_guidance']);
  for (const tool of tools) {
    assert.equal(tool.annotations.readOnlyHint, true);
    assert.equal(tool.annotations.destructiveHint, false);
    assert.equal(tool.inputSchema.additionalProperties, false);
  }
  for (const language of ['en', 'ar']) {
    const list = await client.callTool({ name: 'list_public_guidance', arguments: { language } });
    assert.equal(list.structuredContent.records.length, 3);
    for (const topic of ['foundation', 'examples', 'workflow']) {
      const result = await client.callTool({ name: 'get_public_guidance', arguments: { topic, language } });
      assert.equal(result.structuredContent.language, language);
      assert.equal(result.structuredContent.topic, topic);
      assert.match(result.structuredContent.source_url, /^https:\/\/github\.com\//);
      assert.equal(result.structuredContent.content_sha256.length, 64);
      if (language === 'ar') assert.equal(result.structuredContent.arabic_semantic_review, 'open');
    }
  }
  await client.close();
});

test('Rejects Scenarios, Unknown Topics, URLs, And Unknown Tools Without Echoing Input', async () => {
  for (const [name, args] of [
    ['get_public_guidance', { topic: 'foundation', language: 'en', conversation: 'synthetic-sensitive-marker' }],
    ['get_public_guidance', { topic: '../../private', language: 'en' }],
    ['get_public_guidance', { topic: 'https://internal.test', language: 'en' }],
    ['get_public_guidance', { topic: 'foundation', language: 'fr' }],
    ['list_public_guidance', { language: 'en', url: 'https://internal.test' }],
    ['approve_decision', { language: 'en' }]
  ]) {
    const result = await worker.fetch(request(rpc(name, args)), environment);
    assert.equal(result.status, 400);
    assert.equal(await result.text(), 'Unsupported Tool Or Parameters.');
  }
});

test('Blocks Foreign Origins, Query Parameters, Unsupported Methods, And Content Types', async () => {
  assert.equal((await worker.fetch(request(rpc('list_public_guidance', { language: 'en' }), { Origin: 'https://evil.test' }), environment)).status, 403);
  assert.equal((await worker.fetch(new Request('https://guidance.test/mcp?secret=synthetic'), environment)).status, 400);
  assert.equal((await worker.fetch(new Request('https://guidance.test/mcp'), environment)).status, 405);
  assert.equal((await worker.fetch(new Request('https://guidance.test/mcp', { method: 'POST', body: '{}' }), environment)).status, 415);
});

test('Caps Actual Body Bytes, Rejects Malformed JSON And Batches', async () => {
  for (const [body, status] of [['x'.repeat(8193), 413], ['{', 400], ['[]', 400], ['null', 400]]) {
    const result = await worker.fetch(new Request('https://guidance.test/mcp', { method: 'POST', headers, body }), environment);
    assert.equal(result.status, status);
  }
});

test('Fails Closed Without Rate Limiter And Enforces Its Result', async () => {
  const input = rpc('list_public_guidance', { language: 'en' });
  assert.equal((await worker.fetch(request(input))).status, 503);
  const result = await worker.fetch(request(input), { PUBLIC_GUIDANCE_RATE_LIMITER: { limit: async () => ({ success: false }) } });
  assert.equal(result.status, 429);
  assert.equal(result.headers.get('Retry-After'), '60');
  const unavailable = await worker.fetch(request(input), { PUBLIC_GUIDANCE_RATE_LIMITER: { limit: async () => { throw new Error('synthetic-private-provider-detail'); } } });
  assert.equal(unavailable.status, 503);
  assert.equal(await unavailable.text(), 'Service Temporarily Unavailable.');
});

test('Independent Calls Do Not Retain Scenario State Or Sessions', async () => {
  const input = rpc('get_public_guidance', { topic: 'foundation', language: 'en' });
  const first = await worker.fetch(request(input), environment);
  const second = await worker.fetch(request(input), environment);
  assert.equal(first.headers.get('Mcp-Session-Id'), null);
  assert.equal(await first.text(), await second.text());
});
