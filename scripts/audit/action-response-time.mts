import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';

// Read-only calculation actions against the local production build; never mutate a career.
const base = 'https://localhost:3108';
const manifest = JSON.parse(await readFile('.next/server/server-reference-manifest.json','utf8')) as {
  node: Record<string,{exportedName: string; workers: Record<string,unknown>}>;
};
const account = JSON.parse(await readFile('output/playwright/live-account.private.json','utf8')) as {email:string;password:string};
const browser = await chromium.launch();
const context = await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:1440,height:1000}});
const page = await context.newPage();
const samples:object[]=[];
try {
  await page.goto(base+'/login?next=/classic');
  await page.getByLabel('Email',{exact:true}).fill(account.email);
  await page.getByLabel('Mật khẩu',{exact:true}).fill(account.password);
  await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();
  await page.waitForURL(base+'/classic');
  const squad=await page.locator('a[href^="/classic/"]').first().getAttribute('href');
  if(!squad)throw new Error('QA squad required');
  const fixture={
    careerSubStep:'dir_increase',isMounted:true,mode:'career',currentContinentalCup:'Champions League',
    currentAge:24,playerDebutAge:18,playerCareerLength:18,playerNationality:'England',currentClub:{prestige:4},
    currentOvr:82,leagueSize:20,priorClubStanding:3,standingResult:2,selectedStatsList:['sho','pas'],position:'ST',
    yearSimResult:{matchRating:7.4,apps:42,goals:22,assists:8,cleanSheets:0},selectorIndex:0,
    yearEvolutionDirection:'increase',currentStats:{pac:80,sho:84,pas:75,dri:82,def:40,phy:78},
    ballonDorNominationWeight:30,ballonDorRankWeights:[10,9,8,7,6,5,4,3,2,1],luckRating:10,
  };
  const cases:[string,unknown][]=[
    ['getSetupWheelPreviewAction',{step:1,position:'ST',draft:{nationality:'England'}}],
    ...['dir_increase','count','standing','ballon_dor_nomination'].map(step=>['getCareerWheelPreviewAction',{...fixture,careerSubStep:step}] as [string,unknown]),
    ['getQualificationPreviewAction',{leagueId:'eng-premier-league',standing:2,result:'Winner',cup:'Champions League'}],
    ['getApproachPreviewAction',{chance:65,option:'standard',position:'ST',stats:fixture.currentStats,ovr:82}],
    ['getTransferDisplayBatchAction',Array.from({length:20},(_,i)=>i%2?{kind:'wage',wage:1_000_000+i*1000,prestige:4,tier:1,apps:40}:{kind:'fee',baseFee:30_000_000+i*1000,buyout:25_000_000,prestige:4,tier:1})],
  ];
  for(const [name,input] of cases) {
    const entry=Object.entries(manifest.node).find(([,value])=>value.exportedName===name);
    if(!entry)throw new Error('Missing calculation action: '+name);
    const transfer=name==='getTransferDisplayBatchAction';
    const route=squad+(transfer?'/transfer/0':'/draft/0');
    for(let sample=0;sample<3;sample++) {
      const start=performance.now();
      const response=await context.request.post(base+route,{headers:{Origin:base,'Next-Action':entry[0],'Content-Type':'text/plain;charset=UTF-8',Accept:'text/x-component'},data:JSON.stringify([input])});
      const body=await response.body();
      const durationMs=Math.round(performance.now()-start);
      const valid=!(name==='getCareerWheelPreviewAction' && /(?:^|\n)[\da-f]+:\[\]/.test(body.toString())) && response.status()===200 && !/(?:^|\n)[\da-f]+:E\{/.test(body.toString()) && response.headers()['content-type']?.includes('text/x-component');
      samples.push({name,scenario:typeof input==='object'&&input!==null&&'careerSubStep' in input?input.careerSubStep:transfer?'20-cards':'default',sample:sample===0?'first':'warm-'+sample,status:response.status(),durationMs,responseBytes:body.length,valid});
      console.log(JSON.stringify(samples.at(-1)));
      if(!valid)throw new Error('Calculation action failed (body intentionally not logged): '+name);
    }
  }
  await context.request.post(base+'/auth/session',{headers:{Origin:base},data:{operation:'logout'}});
} finally {
  account.password='';await context.close();await browser.close();
  await writeFile('output/playwright/action-response-time-local.json',JSON.stringify({at:new Date().toISOString(),base,concurrency:1,mutatesCareer:false,samples},null,2));
}
