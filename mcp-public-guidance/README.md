# Re Culture™ Public Guidance MCP

Implementation Prepared: 10 October 2026. Not Deployed Or Submitted.

## What Is Implemented

Two Read-Only Tools Serve Six Versioned Public-Source Records: Foundation, Examples, And Workflow In English And Arabic. Inputs Are Fixed Topic And Language Selections. Results Include Pinned Public Source URLs, Source Commit, Content Hash, And Review Status. No Runtime Outbound Fetch, Database, Account, Conversation Storage, Upload, Or Decision Action Exists. The Corpus Is A Public Plugin Snapshot, Not A Claim Of Current Live-Site Verification. Arabic Human Semantic Review Remains Open.

The Source Is Pinned To Public Repository Commit 50e0a4eb9a79a3cb1ce43e43b2b29242d5e18f9b. Existing Public Guidance Was Copied Without Text Changes. Private Governance Records Are Excluded.

## Local Verification

Run `npm ci --ignore-scripts`, `npm test`, And `npm run build`. The Official MCP Client Passed Initialization, Tool Discovery, And All Six Retrieval Combinations. Tests Also Cover Extra Fields, Unsupported Languages And Topics, Arbitrary URLs, Foreign Origins, Malformed And Oversized Requests, Methods, Rate Limiting, And Repeat Calls Without Session State. Runtime Dependency Audit Reported Zero Known Vulnerabilities. This Is Not A Blanket Security Guarantee.

The Cloudflare Deployment Dry Run Passed. Production Runtime, Domain Verification, Intended-Host Behaviour, Reviewer Demo, And Provider Settings Are Not Yet Verified.

## Hosting And Privacy Boundary

Deploy As A Separate Worker Named `re-culture-public-guidance-mcp`. Do Not Replace The Human Experience Worker Or The Existing Pages Deployment. No Account ID, Token, Or Invented Endpoint Is Included. Cloudflare Authentication Is Unavailable In This Session; No Deployment Was Attempted. Do Not Use A Temporary Preview Account Or Tunnel For Submission.

Configure A Dedicated `PUBLIC_GUIDANCE_RATE_LIMITER` Binding Before Public Release. Use An Unused Namespace In The Actual Account, With An Initial Service-Class Limit Of 600 Calls Per 60 Seconds. The Key Is The Fixed Class `public-guidance`, Not An IP Address Or User Identifier. This Limit Is Per Cloudflare Location, Not A Global Cost Cap; Monitor Aggregate Service Load And Tune After Intended-Host Testing. Without The Binding, MCP Requests Return 503.

The Wrangler Binding Shape Is `ratelimits: [{ name: "PUBLIC_GUIDANCE_RATE_LIMITER", namespace_id: "<Account-Verified-Unused-Positive-Integer>", simple: { limit: 600, period: 60 } }]`. Replace That Explanatory Placeholder In Configuration Before Deployment; It Is Not A Credential.

Only Same-Origin And `https://chatgpt.com` Browser Origins Are Allowed. Server-To-Server Calls With No Origin Are Supported. No Wildcard CORS Is Enabled. Additional Intended-Host Origins Require Evidence And A Targeted Update. SDK Transport Is Stateless Streamable HTTP With JSON Responses. GET Streaming Is Not Offered.

Application Code Does Not Log Requests Or Store Tool Arguments. The Hosting Provider Still Receives Technical Request Metadata And The Request Body. Schema Validation Does Not Prevent An Erroneous Client From Transmitting Extra Content Before Rejection. Never Promise Zero Data Collection Or Automatic Transcript Redaction. Verify Provider Logging, Retention, Security, And Aggregate Failure Metrics Before Publishing The Connected Privacy Notice. Public Data Access Requires No User Account Or OAuth.

## Submission Completion Gates

Preserve The Existing Skills-Only Draft. OpenAI Currently Requires MCP In The Initial Upload And Does Not Support Adding It To An Existing Skills-Only Plugin. Prepare A Separate Public Plugin Submission After Hosting.

1. Configure And Verify The Dedicated Worker And Rate Limiter. Record The Actual Stable HTTPS `/mcp` Endpoint.
2. Run The Official MCP Client Against That Endpoint And Verify Domain Ownership In The Portal.
3. Confirm Corpus Provenance, Arabic Review Status, Provider Retention, And Connected Privacy Disclosures. Publish Separate Connected Overview And Privacy Pages; Do Not Replace The Current Skills-Only Notice With Inaccurate Claims.
4. Test The Five Positive And Three Negative Review Cases In ChatGPT. Cases In `review/cases.json` Are Drafted; Intended-Host Execution Is Not Run. Local Protocol Tests Are Separate Evidence.
5. Record A Real Reviewer-Accessible Demo: English Catalogue, English Foundation, Arabic Examples With Review Status, And A Refused Private-Records Request. No Credentials Or Unrelated Conversation Should Appear. Verify Playback And Permissions.
6. Assemble The New Plugin With Actual Endpoint, Connected Listing URLs, Review Cases, And Verified Demo URL. Preserve The Existing Skill Source And Official Icon. Do Not Upload This Implementation Archive To The Plugin Portal Or Cloudflare Pages.

## Recovery

Keep The Existing Draft And Pages Deployment. For The New Worker, Record Its First Successful Version ID And Export Configuration Before Any Update. Revert Only This Worker If Live Validation Fails. Do Not Change Domain DNS, Existing App Bindings, Or Mailbox Settings.

## Documentation

- https://developers.openai.com/plugins/build/mcp-server
- https://developers.openai.com/plugins/deploy/submission
- https://modelcontextprotocol.io/specification/2025-11-25/basic/transports
- https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/


## Phone Deployment Through Cloudflare Builds

This Deployment Branch Keeps The Existing Skills-Only Plugin Unchanged. Select The Existing Worker `re-culture-public-guidance-mcp`, Then Settings → Builds → Connect. Connect Only This Public Plugin Repository.

- Repository: `israrulhaq7013-web/re-culture-human-judgement-plugin`
- Production Branch: `mcp/cloudflare-deployment-2026-10-10`
- Root Directory: `mcp-public-guidance`
- Build Command: `npm ci --ignore-scripts && npm test && npm run build`
- Deploy Command: `npm run deploy`
- Required Build Variable: `PUBLIC_GUIDANCE_RATE_NAMESPACE_ID`

The Namespace Must Be An Unused Positive Integer Confirmed Against The Hosting Account's Existing Rate-Limit Bindings. Do Not Copy A Namespace From The Human Experience App. This Identifier Is Not A Secret. Deployment Stops Before Upload If It Is Missing Or Malformed. The Deploy Script Generates A Dedicated 600-Request-Per-Minute Binding; The Limit Applies Per Cloudflare Location And Is Not A Global Budget Cap.

The Local Dry Run Uses A Synthetic Namespace Only. It Does Not Establish An Unused Production Namespace Or Deploy Anything.

The Source Configuration Disables Worker Observability. Confirm The Actual Dashboard Logging Settings After Deployment; Provider Technical Processing And Retention Still Require Verification. Public Submission, Connected Privacy Publication, Intended-Host Testing, Arabic Semantic Review, And Demo Recording Remain Pending.

### العربية

يتيح الربط بين المستودع وعامل كلاودفلير نشر الخادم من الهاتف دون لصق ملف الشيفرة الكبير في المحرر. استخدم فرع النشر والمجلد وأوامر البناء المحددة أعلاه، واربط هذا المستودع العام وحده. تبقى ملفات المهارة الحالية محفوظة دون تعديل.

قبل النشر، تحقق من أن رقم نطاق عداد الطلبات غير مستخدم في الحساب، ثم أدخله في متغير البناء المذكور. لا تنسخ رقم تطبيق التجربة الإنسانية. يتوقف النشر إذا غاب الرقم أو كان تنسيقه غير صالح. يجب بعد النشر التحقق من إعدادات السجلات وبيان الخصوصية واختبارات الاستخدام وتسجيل العرض. وتظل المراجعة البشرية لدلالة النصوص العربية مفتوحة.
