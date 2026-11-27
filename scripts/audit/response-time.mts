import { chromium } from '@playwright/test';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { execFileSync } from 'node:child_process';

// Serial QA traffic only. Credentials and response bodies never enter the report.
const base = process.env.RTG_PERF_URL ?? 'https://rtgfootball.vercel.app';
if (!['https://rtgfootball.vercel.app', 'https://localhost:3108'].includes(base)) throw new Error('Unapproved performance target');
const isLocal = new URL(base).hostname === 'localhost';
const quickOnly = process.env.RTG_PERF_QUICK_ONLY === '1';
const output = `output/playwright/response-time-${isLocal ? 'local' : 'production'}${quickOnly ? '-quick' : ''}.json`;
const account = JSON.parse(await readFile('output/playwright/live-account.private.json', 'utf8')) as {email: string; password: string};
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, ignoreHTTPSErrors: isLocal });
const page = await context.newPage();
page.setDefaultTimeout(30_000);
const routes: object[] = [], interactions: object[] = [], requests: {stage: string; path: string; method: string; type: string; status: number; durationMs: number; ttfbMs: number}[] = [];
const errors: object[] = [], failures: object[] = [];
let stage = 'initial';
const safePath = (value: string) => new URL(value).pathname.replace(/[a-f0-9]{8}-[a-f0-9-]{27,}/gi, ':id');
const tasks: Promise<void>[] = [];
page.on('requestfinished', request => {
  const label = stage;
  tasks.push((async () => {
    if (!request.url().startsWith(base)) return;
    const timing = request.timing(), response = await request.response();
    requests.push({stage: label, path: safePath(request.url()), method: request.method(), type: request.resourceType(), status: response?.status() ?? 0,
      durationMs: Math.round(timing.responseEnd), ttfbMs: Math.round(timing.responseStart)});
  })());
});
page.on('requestfailed', request => failures.push({stage, path: safePath(request.url()), aborted: request.failure()?.errorText.includes('ABORTED')}));
page.on('pageerror', error => errors.push({stage, kind: 'runtime', message: error.name}));
page.on('console', message => { if (message.type() === 'error') errors.push({stage, kind: 'console'}); });
await context.addInitScript({content: `(() => {
  const metrics = window.__rtgPerf = {lcp:0, cls:0, longTasks:[], events:[]};
  for (const [type, handler] of [
    ['largest-contentful-paint', e => { metrics.lcp=e.startTime; }],
    ['layout-shift', e => { if(!e.hadRecentInput) metrics.cls+=e.value; }],
    ['longtask', e => { metrics.longTasks.push(e.duration); }],
    ['event', e => { if(e.interactionId) metrics.events.push(e.duration); }]
  ]) { try {new PerformanceObserver(list => list.getEntries().forEach(handler)).observe({type,buffered:true,durationThreshold:16});}catch{} }
  for(const id of ['home','classic','squad','profileSetup','draft','retirement','transfer','negotiation','shop','quickSetup','quickPlay','quickSummary','pve','tournament'])localStorage.setItem('football-life:guide:'+id+':v1','seen');
  localStorage.setItem('football-life:guide:career:v2','seen');
  localStorage.setItem('football-life:guide:settings:v3','seen');
})()`});

async function paint() { await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))); }
async function metrics() {
  return page.evaluate(`(() => {
    const n=performance.getEntriesByType('navigation')[0], p=window.__rtgPerf;
    const resources=performance.getEntriesByType('resource');
    return {ttfbMs:Math.round(n.responseStart),domContentLoadedMs:Math.round(n.domContentLoadedEventEnd),
      fcpMs:Math.round(performance.getEntriesByName('first-contentful-paint')[0]?.startTime||0),
      lcpMs:Math.round(p.lcp),cls:Math.round(p.cls*10000)/10000,
      longTaskCount:p.longTasks.length,longTaskTotalMs:Math.round(p.longTasks.reduce((a,b)=>a+b,0)),
      maxLongTaskMs:Math.round(Math.max(0,...p.longTasks)),maxEventDurationMs:Math.max(0,...p.events),
      transferredBytes:resources.reduce((s,e)=>s+e.transferSize,0),resourceCount:resources.length,
      largestResources:resources.filter(e=>e.transferSize>50000).map(e=>({path:new URL(e.name).pathname,bytes:e.transferSize,durationMs:Math.round(e.duration)})).sort((a,b)=>b.bytes-a.bytes).slice(0,6)};
  })()`);
}
async function ready(selector: string) {
  await page.locator(selector).first().waitFor({state:'visible'});
  await page.locator('.football-landing-startup, .football-branded-splash').first().waitFor({state:'hidden'});
  await paint();
}
async function visit(label: string, path: string, selector: string, sample = 'first') {
  stage = `${label}:${sample}`;
  const start = performance.now();
  const response = await page.goto(base + path, {waitUntil:'domcontentloaded'});
  await ready(selector);
  const usefulMs = Math.round(performance.now()-start);
  await page.waitForTimeout(350);
  routes.push({label,sample,status:response?.status(),usefulMs,...await metrics()});
  console.log(JSON.stringify({label,sample,usefulMs,status:response?.status()}));
}
async function click(label: string, action: () => Promise<unknown>, visible: () => Promise<unknown>) {
  stage = label;
  const start = performance.now();
  await action(); await visible(); await paint();
  const durationMs = Math.round(performance.now()-start);
  interactions.push({label,durationMs});
  console.log(JSON.stringify({label,durationMs}));
}
const waitPanel = (id: string) => page.locator(`#settings-panel-${id}`).waitFor({state:'visible'});
async function quickSpin(sample: string) {
  const button = page.locator('.football-quick-mode__action > button');
  await button.waitFor({state:'visible'});
  await page.waitForFunction(() => !document.querySelector<HTMLButtonElement>('.football-quick-mode__action > button')?.disabled);
  stage = `quick-spin:${sample}`;
  const before = await page.evaluate(() => sessionStorage.getItem('football-life:quick-mode:v5'));
  const start=performance.now();
  const actionResponse = isLocal ? page.waitForResponse(r=>r.request().method()==='POST' && !!r.request().headers()['next-action']) : null;
  await button.click();
  const actualResponse = actionResponse ? await actionResponse : null;
  if(actualResponse) await page.waitForFunction(()=>document.querySelector('.football-quick-mode__action > button')?.getAttribute('aria-busy')==='true');
  const observedResponseMs = actualResponse ? Math.round(performance.now()-start) : null;
  await page.waitForFunction(before => sessionStorage.getItem('football-life:quick-mode:v5')!==before,before);
  const totalMs = Math.round(performance.now()-start);
  await Promise.allSettled(tasks);
  const response = requests.findLast(r=>r.stage===stage && r.method==='POST' && r.type==='fetch');
  const actionResponseMs = observedResponseMs ?? response?.durationMs ?? null;
  interactions.push({label:'quick-spin',sample,actionResponseMs,totalMs,animationAndHandoffMs:actionResponseMs===null?null:totalMs-actionResponseMs,status:actualResponse?.status() ?? response?.status,transport:actualResponse||response?'server':isLocal?'unobserved':'client-legacy'});
  console.log(JSON.stringify({label:'quick-spin',sample,actionResponseMs,totalMs}));
}
let completed=false;
try {
  if(!quickOnly) {
  for (const [label,path,selector] of [
    ['landing','/','.football-guest-landing__hero'], ['english','/en','.football-guest-landing__hero'],
    ['privacy','/privacy','main h1'], ['terms','/terms','main h1'], ['not-found','/performance-missing-route','h1'],
    ['quick-setup','/quick','input'], ['login','/login','input[type=email]'],
  ]) await visit(label,path,selector);
  for(let i=1;i<=2;i++) await visit('landing','/','.football-guest-landing__hero',`warm-${i}`);
  await visit('login','/login?next=/classic','input[type=email]','warm');
  await page.getByLabel('Email',{exact:true}).fill(account.email);
  await page.getByLabel('Mật khẩu',{exact:true}).fill(account.password);
  await click('login-to-classic',()=>page.getByRole('button',{name:'Đăng nhập',exact:true}).click(),()=>page.locator('.football-classic-lobby h1').waitFor());
  const squadHref = await page.locator('a[href^="/classic/"]').first().getAttribute('href');
  for(let i=0;i<3;i++) {
    await visit('home','/','[data-guide=home-modes]',i?'warm-'+i:'first');
    await visit('classic','/classic','.football-classic-lobby h1',i?'warm-'+i:'first');
    await visit('settings','/settings','.football-settings-page h1',i?'warm-'+i:'first');
    if(squadHref) await visit('squad',squadHref,'.football-squad-board-shell h1',i?'warm-'+i:'first');
  }
  if(squadHref) {
    const resume=page.locator('.football-squad-summary > button').first();
    if(await resume.count()) {
      await click('squad-to-draft',()=>resume.click(),async()=>{await page.waitForURL(/\/draft\/\d+/);await ready('.football-wheel-shell h1');});
      const href=new URL(page.url()).pathname;
      await visit('classic-draft',href,'.football-wheel-shell h1');
      await page.waitForTimeout(800);
      const transfer=await page.locator('a[href*="/transfer/"]').first().getAttribute('href').catch(()=>null);
      if(transfer) await visit('transfer',transfer,'main h1');
    }
  }
  await visit('settings','/settings','.football-settings-page h1','interactions');
  for(let sample=0;sample<3;sample++) for(const id of ['audio','language','security','profile']) {
    await click('settings-tab-'+id,()=>page.locator('#settings-tab-'+id).click(),()=>waitPanel(id));
  }
  const help=page.getByRole('button',{name:'Hướng dẫn trang này',exact:true});
  await click('help-open',()=>help.click(),()=>page.getByRole('dialog').waitFor());
  await page.keyboard.press('Escape');
  const sound=page.getByRole('button',{name:'Âm thanh',exact:true});
  await click('audio-popover',()=>sound.click(),()=>page.locator('input[type=range]').filter({visible:true}).first().waitFor());
  await page.keyboard.press('Escape');
  await visit('pve','/pve','main h1');
  await visit('quick-setup','/quick','input','authenticated');
  } else await visit('quick-setup','/quick','input','guest');
  await page.getByLabel('Tên cầu thủ',{exact:true}).fill('Response QA');
  await click('quick-start',()=>page.locator('.football-quick-setup__footer button').click(),()=>page.locator('.football-quick-mode__action > button:enabled').waitFor());
  for(let i=0;i<3;i++) await quickSpin(String(i+1));
  await visit('quick-resume','/quick/play','.football-quick-mode__action > button:enabled');
  if(!quickOnly) {
  await visit('home','/','[data-guide=home-modes]','logout');
  await click('logout',()=>page.getByRole('button',{name:'Đăng xuất',exact:true}).click(),()=>page.getByLabel('Email',{exact:true}).waitFor());
  // One constrained-network sample, serially, with no backend mutations.
  const cdp=await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:80,downloadThroughput:500_000,uploadThroughput:125_000});
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
  await visit('landing','/','.football-guest-landing__hero','4Mbps-80ms-CPU4x');
  await cdp.detach();
  }
  completed=true;
} catch(error) {
  errors.push({stage,kind:'harness',message:error instanceof Error?error.message.replace(/[a-f0-9]{8}-[a-f0-9-]{27,}/gi,':id').slice(0,500):'unknown'});
  console.log(JSON.stringify({failedStage:stage,error:error instanceof Error?error.message.slice(0,300):'unknown'}));
} finally {
  await Promise.allSettled(tasks);
  await mkdir('output/playwright',{recursive:true});
  await writeFile(output,JSON.stringify({at:new Date().toISOString(),base,completed,concurrency:1,head:execFileSync('git',['rev-parse','--short','HEAD']).toString().trim(),buildMode:'production',note:'Local source has uncommitted changes; first browser visit is not proof of serverless cold start. Timings include real QA network. No request bodies/headers/storage values saved.',routes,interactions,requests,errors,failures},null,2));
  account.password='';await context.close();await browser.close();
}
if(!completed)process.exitCode=1;

