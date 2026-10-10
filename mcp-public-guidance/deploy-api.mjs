import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
export async function deploy(env=process.env, request=fetch) {
  const name='re-culture-public-guidance-mcp';
  const account='8c79cffffe7ba4997f6430f75af114eb';
  if(env.CLOUDFLARE_ACCOUNT_ID!==account || !env.CLOUDFLARE_API_TOKEN) throw new Error('Deployment credential guard failed');
  const ns=env.PUBLIC_GUIDANCE_RATE_NAMESPACE_ID;
  if(!/^[1-9][0-9]*$/.test(ns||'')) throw new Error('Rate namespace guard failed');
  const config=JSON.parse(readFileSync('wrangler.jsonc','utf8'));
  if(config.name!==name || config.observability?.enabled!==false) throw new Error('Target guard failed');
  const base='https://api.cloudflare.com/client/v4/accounts/'+account+'/workers/workers/'+name;
  async function api(url,method='GET',body) {
    let response;
    try { response=await request(url,{method,redirect:'error',signal:AbortSignal.timeout(60000),
      headers:{Authorization:'Bearer '+env.CLOUDFLARE_API_TOKEN,'Content-Type':'application/json'},
      ...(body?{body:JSON.stringify(body)}:{})}); }
    catch {throw new Error('Cloudflare request failed; credential values withheld');}
    const data=await response.json().catch(()=>null);
    if(!response.ok || data?.success!==true) {
      const codes=(data?.errors||[]).map(e=>e.code).filter(Number.isInteger).join(',');
      throw new Error('Cloudflare '+method+' failed: HTTP '+response.status+' codes '+codes);
    }
    return data.result;
  }
  const worker=await api(base);
  if(worker.name!==name) throw new Error('Existing Worker identity mismatch');
  const obs={enabled:false,logs:{enabled:false,invocation_logs:false,persist:false,destinations:[]},traces:{enabled:false,persist:false,destinations:[]},issues:{enabled:false}};
  await api(base,'PATCH',{logpush:false,observability:obs});
  const checked=await api(base);
  if(checked.observability?.enabled!==false || checked.logpush!==false) throw new Error('Logging disablement not verified');
  const version=await api(base+'/versions?deploy=true','POST',{
    compatibility_date:config.compatibility_date,
    main_module:'worker.js',
    modules:[{name:'worker.js',content_type:'application/javascript+module',content_base64:readFileSync('dist/worker.js').toString('base64')}],
    bindings:[{name:'PUBLIC_GUIDANCE_RATE_LIMITER',type:'ratelimit',namespace_id:ns,simple:{limit:600,period:60}}],
    annotations:{'workers/message':'Reviewed Public Guidance MCP; No Private Data Bindings'}
  });
  if(!version.id) throw new Error('No deployment version returned');
  console.log('Public Guidance MCP Deployment Version: '+version.id);
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  deploy().catch(error=>{console.error(error.message);process.exitCode=1;});
}
