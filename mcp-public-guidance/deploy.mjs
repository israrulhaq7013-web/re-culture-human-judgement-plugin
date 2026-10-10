import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

// Configure This Only After Confirming An Unused Namespace In The Hosting Account.
const namespace = process.env.PUBLIC_GUIDANCE_RATE_NAMESPACE_ID;
if (!namespace || !/^[1-9][0-9]*$/.test(namespace)) {
  console.error('Deployment Blocked: Set PUBLIC_GUIDANCE_RATE_NAMESPACE_ID To An Account-Verified Unused Positive Integer.');
  process.exit(1);
}
const config = JSON.parse(readFileSync('wrangler.jsonc', 'utf8'));
config.ratelimits = [{ name: 'PUBLIC_GUIDANCE_RATE_LIMITER', namespace_id: namespace, simple: { limit: 600, period: 60 } }];
writeFileSync('wrangler.deploy.json', JSON.stringify(config, null, 2) + '\n');
const dryRun = process.argv.includes('--dry-run');
const result = spawnSync('npx', ['--no-install', 'wrangler', 'deploy', '--config', 'wrangler.deploy.json', ...(dryRun ? ['--dry-run'] : [])], { stdio: 'inherit' });
process.exit(result.status ?? 1);
