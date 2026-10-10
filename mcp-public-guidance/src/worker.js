import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { z } from 'zod';
import catalogue from './catalogue.json' with { type: 'json' };

const topic = z.enum(['foundation', 'examples', 'workflow']);
const language = z.enum(['en', 'ar']);
const annotations = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const MAX_BYTES = 8192;

function server() {
  const mcp = new McpServer({ name: 're-culture-public-guidance', version: '0.1.0' }, {
    instructions: 'Retrieve Only Public Guidance By Topic And Language. Never Send Conversation Text, Personal Records, Or Secrets. Results Are Versioned Source Snapshots, Not Live Verification Or Certification. Preserve Arabic Review Status. Human Judgement Remains With People.'
  });
  mcp.registerTool('list_public_guidance', {
    title: 'List Public Guidance', description: 'List Available Re Culture™ Public Guidance For A Selected Language. Accepts Only en Or ar; Do Not Send Review Scenarios.',
    inputSchema: z.object({ language }).strict(), annotations
  }, async ({ language }) => {
    const result = { records: catalogue.filter(r => r.language === language).map(({ text, ...record }) => record) };
    return { content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result };
  });
  mcp.registerTool('get_public_guidance', {
    title: 'Retrieve Public Guidance', description: 'Retrieve A Versioned Re Culture™ Public Foundation, Example Set, Or Review Workflow In English Or Arabic With Source And Review Status. Use Only Topic And Language Selections.',
    inputSchema: z.object({ topic, language }).strict(), annotations
  }, async ({ topic, language }) => {
    const result = catalogue.find(r => r.topic === topic && r.language === language);
    return { content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result };
  });
  return mcp;
}

function response(status, body, extra = {}) {
  return new Response(body, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extra } });
}

async function boundedBody(request) {
  if (!request.body) throw new Error('invalid');
  const reader = request.body.getReader();
  let size = 0;
  const chunks = [];
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_BYTES) { await reader.cancel(); throw new Error('oversize'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return bytes;
}

export default {
  async fetch(request, env = {}) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');
    const permitted = new Set([url.origin, 'https://chatgpt.com']);
    if (origin && !permitted.has(origin)) return response(403, 'Origin Not Allowed.');
    if (url.pathname === '/health' && request.method === 'GET') return response(200, 'Re Culture™ Public Guidance 0.1.0');
    if (url.pathname !== '/mcp') return response(404, 'Not Found.');
    if (url.search) return response(400, 'Query Parameters Are Not Accepted.');
    if (request.method !== 'POST') return response(405, 'Method Not Allowed.', { Allow: 'POST' });
    if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) return response(415, 'JSON Required.');
    if (Number(request.headers.get('Content-Length')) > MAX_BYTES) return response(413, 'Request Too Large.');
    // Fail closed until the dedicated public-service rate limiter is configured.
    if (!env.PUBLIC_GUIDANCE_RATE_LIMITER) return response(503, 'Service Configuration Required.');
    try {
      const { success } = await env.PUBLIC_GUIDANCE_RATE_LIMITER.limit({ key: 'public-guidance' });
      if (!success) return response(429, 'Request Limit Reached.', { 'Retry-After': '60' });
    } catch { return response(503, 'Service Temporarily Unavailable.'); }
    let bytes;
    let message;
    try {
      bytes = await boundedBody(request);
      message = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    } catch (error) { return response(error.message === 'oversize' ? 413 : 400, 'Invalid Request.'); }
    if (!message || typeof message !== 'object' || Array.isArray(message)) return response(400, 'A Single Request Is Required.');
    if (message.method === 'tools/call') {
      const args = message.params?.arguments;
      const schema = message.params?.name === 'list_public_guidance' ? z.object({ language }).strict() :
        message.params?.name === 'get_public_guidance' ? z.object({ topic, language }).strict() : null;
      // Reject extra fields before the SDK, without echoing attacker-controlled data.
      if (!schema || !schema.safeParse(args).success) return response(400, 'Unsupported Tool Or Parameters.');
    }
    const mcp = server();
    const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    try {
      await mcp.connect(transport);
      const replay = new Request(request.url, { method: 'POST', headers: request.headers, body: bytes });
      const result = await transport.handleRequest(replay);
      const body = await result.arrayBuffer();
      const headers = new Headers(result.headers);
      headers.set('Cache-Control', 'no-store');
      headers.set('X-Content-Type-Options', 'nosniff');
      return new Response(body.byteLength ? body : null, { status: result.status, headers });
    } catch {
      // No request bodies, arguments, headers, or identifiers are logged.
      return response(500, 'Request Could Not Be Completed.');
    } finally { await mcp.close(); }
  }
};
