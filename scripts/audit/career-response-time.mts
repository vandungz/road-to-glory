import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
const base='https://localhost:3108';
const account=JSON.parse(await readFile('output/playwright/live-account.private.json','utf8')) as {email:string;password:string};
const manifest=JSON.parse(await readFile('.next/server/server-reference-manifest.json','utf8')) as {node:Record<string,{exportedName:string}>};
const browser=await chromium.launch();
const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:1440,height:1000}});
await context.addInitScript({content:`for(const id of ['classic','squad','draft','profileSetup','shop','transfer'])localStorage.setItem('football-life:guide:'+id+':v1','seen');localStorage.setItem('football-life:guide:career:v2','seen');`});
const page=await context.newPage();page.setDefaultTimeout(45_000);
const samples:object[]=[],requests:object[]=[],errors:object[]=[];
let fixtureId:string|null=null,deleted=false,stage='login',completed=false;
const pending:Promise<void>[]=[];
page.on('response',response=>{const request=response.request();if(request.method()!=='POST')return;const label=stage;
 pending.push((async()=>{const timing=request.timing();const id=request.headers()['next-action'];requests.push({stage:label,action:id?manifest.node[id]?.exportedName??'action':'auth',status:response.status(),responseHeadersMs:Math.round(timing.responseStart)});})());});
page.on('pageerror',error=>errors.push({stage,name:error.name}));
async function measure(label:string,action:()=>Promise<unknown>,until:()=>Promise<unknown>){stage=label;const start=performance.now();await action();await until();const durationMs=Math.round(performance.now()-start);samples.push({label,durationMs});console.log(JSON.stringify({label,durationMs}));}
try{
 await page.goto(base+'/login?next=/classic');
 await page.getByLabel('Email',{exact:true}).fill(account.email);await page.getByLabel('Mật khẩu',{exact:true}).fill(account.password);
 await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await page.waitForURL(base+'/classic');
 await page.getByRole('button',{name:'Tạo đội hình',exact:true}).click();
 await page.locator('#squad-name').fill('Response QA '+Date.now());
 await measure('create-squad',()=>page.locator('#btn-submit-squad').click(),()=>page.waitForURL(/\/(?:classic\/)?[\da-f-]{36}$/));
 const match=new URL(page.url()).pathname.match(/^\/(?:classic\/)?([\da-f-]{36})$/);if(!match)throw new Error('Missing created fixture identity');fixtureId=match[1];
 await page.locator('.football-squad-summary > button').click();await page.waitForURL(/\/draft\/\d+$/);
 await page.locator('#classic-player-name').fill('Response Fixture');
 await page.getByRole('combobox',{name:'Quốc gia',exact:true}).click();await page.getByRole('textbox',{name:'Tìm trong quốc gia',exact:true}).fill('England');await page.getByRole('option',{name:'England',exact:true}).click();
 await measure('identity-to-draft',()=>page.locator('.football-profile-setup button[type=submit]').click(),()=>page.locator('.football-draft-setup__action button:enabled').waitFor());
 for(let step=1;step<=12;step++){
   const heading=await page.locator('.football-draft-setup h1').innerText();
   await measure('draft-spin-'+step,()=>page.locator('.football-draft-setup__action button:enabled').last().click(),()=>page.waitForFunction(previous=>document.querySelector('.football-draft-setup h1')?.textContent!==previous,heading));
   await page.waitForFunction(()=>!!document.querySelector('.football-draft-setup__action button:enabled'));
 }
 await measure('create-player-and-open-career',()=>page.locator('.football-draft-setup__action button:enabled').last().click(),()=>page.locator('.football-career-shell').waitFor());
 await page.waitForTimeout(1200);
 await measure('saved-career-reload',()=>page.reload(),()=>page.getByText('Response Fixture',{exact:true}).first().waitFor());
 await page.waitForLoadState('networkidle');
 // Only read a shop route if the actual workflow offers it; do not force an invalid checkpoint.
 const shop=await page.locator('a[href*="/shop/"]').first().getAttribute('href',{timeout:800}).catch(()=>null);
 if(shop)await measure('shop-open',()=>page.goto(base+shop),()=>page.locator('main h1').waitFor());

 completed=true;
}catch(error){errors.push({stage,message:error instanceof Error?error.message.replace(/[a-f0-9]{8}-[a-f0-9-]{27,}/gi,':id').slice(0,400):'unknown'});console.log(JSON.stringify({stage,failed:true}));}
finally{
 stage='cleanup';
 if(fixtureId){
  await page.goto(base+'/classic');
  await page.waitForLoadState('networkidle');
  const entry=Object.entries(manifest.node).find(([,value])=>value.exportedName==='deleteSquadAction');
  if(entry){const response=await context.request.post(base+'/classic/'+fixtureId,{headers:{Origin:base,'Next-Action':entry[0],'Content-Type':'text/plain;charset=UTF-8',Accept:'text/x-component'},data:JSON.stringify([{gameId:fixtureId,confirmation:'DELETE'}])});const text=await response.text();deleted=response.status()===200&&text.includes('"success":true');}
 }
 await context.request.post(base+'/auth/session',{headers:{Origin:base},data:{operation:'logout'}});
 await context.close();
 await Promise.allSettled(pending);
 await writeFile('output/playwright/career-response-time-local.json',JSON.stringify({at:new Date().toISOString(),base,completed,fixtureDeleted:deleted,samples,requests,errors},null,2));
 account.password='';await browser.close();
}
if(!completed||!deleted)process.exitCode=1;
