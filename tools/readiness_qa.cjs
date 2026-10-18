const {chromium,webkit}=require(process.env.HOME+'/.local/share/package-site/repo/node_modules/@playwright/test');
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(process.argv[2]),out=path.resolve(process.argv[3]),prod=path.resolve(process.argv[4]);
fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.ico':'image/x-icon','.pdf':'application/pdf','.json':'application/json','.xml':'application/xml'};
function inventory(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(x=>x.name==='current-design'||x.name.startsWith('.')?[]:x.isDirectory()?inventory(path.join(dir,x.name)):x.name.endsWith('.html')?[path.join(dir,x.name)]:[])}
async function staticRoute(route,base,prefix=''){
 const u=new URL(route.request().url());let rel=decodeURIComponent(u.pathname);
 if(prefix&&!rel.startsWith(prefix+'/'))return route.fulfill({status:404,body:'not found'});
 rel=rel.slice(prefix.length).replace(/^\/+/,'');let f=path.join(base,rel);
 if(!path.extname(f))f=path.join(f,'index.html');
 else if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');
 if(!f.startsWith(base+path.sep)||!fs.existsSync(f))return route.fulfill({status:404,body:'not found'});
 return route.fulfill({contentType:mime[path.extname(f)]||'application/octet-stream',body:fs.readFileSync(f)});
}
(async()=>{
 const browser=await (process.env.QA_BROWSER==='webkit'?webkit:chromium).launch({headless:true}),rows=[],all=inventory(root),jobs=all.flatMap(file=>[320,390,1440].map(width=>({file,width})));let ix=0;
 await Promise.all(Array.from({length:3},async()=>{
 const ctx=await browser.newContext();await ctx.route('**/*',r=>new URL(r.request().url()).hostname==='preview.audit.invalid'?staticRoute(r,root,'/oecuhobog-prototype'):r.abort());
 while(ix<jobs.length){
  const job=jobs[ix++],page=await ctx.newPage(),errors=[],network=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(new URL(r.url()).hostname!=='preview.audit.invalid')network.push(r.url())});
  await page.setViewportSize({width:job.width,height:950});
  const rel=path.relative(root,job.file),url='https://preview.audit.invalid/oecuhobog-prototype/'+rel;
  let row={file:rel,width:job.width};
  try {
   const res=await page.goto(url);await page.locator('img').evaluateAll(xs=>xs.forEach(x=>x.loading='eager'));
   await page.waitForFunction(()=>[...document.images].every(x=>x.complete));
   await page.evaluate(()=>Promise.all([...document.images].map(x=>x.decode().catch(()=>{}))));
   row={...row,status:res.status(),...await page.evaluate(()=>({
    scrollWidth:document.documentElement.scrollWidth,
    overflow:document.documentElement.scrollWidth>innerWidth+1,
    badImages:[...document.images].filter(x=>!x.naturalWidth).map(x=>x.src),
    enabledFields:[...document.querySelectorAll('.site-form input,.site-form textarea,.site-form button')].filter(x=>!x.disabled).length,
    iframes:document.querySelectorAll('iframe').length,
    unsafeLinks:[...document.querySelectorAll('a[href]')].filter(x=>x.href.includes('www.yudenkai.org')).length,
    formCount:document.querySelectorAll('.site-form').length
   }))};
   if(job.width===390&&['index.html','pages/cookie-policy/index.html','questionary00375/index.html','blog/2019/index.html'].includes(rel)){
    await page.screenshot({path:path.join(out,rel.replaceAll('/','_')+'.png'),fullPage:true});
   }
  }catch(e){row.error=e.message;}
  row.jsErrors=errors;row.externalRequests=network;rows.push(row);await page.close();
  if(rows.length%60===0)console.log('preview browser cases',rows.length+'/'+jobs.length);
 }
 await ctx.close();
 }));
 fs.writeFileSync(path.join(out,'browser.json'),JSON.stringify(rows,null,2));
 const failures=rows.filter(x=>x.error||x.status!==200||x.overflow||x.badImages?.length||x.enabledFields||x.iframes||x.unsafeLinks||x.jsErrors.length||x.externalRequests.length);
 console.log('preview',JSON.stringify({cases:rows.length,failures:failures.length}));
 if(failures.length)console.log(JSON.stringify(failures.slice(0,8)));
 const checks=[];
 async function scenario(name,run,mode='ok'){
  const ctx=await browser.newContext(),posts=[],requests=[],scriptCalls=[];let saveCount=0;
  await ctx.addInitScript(()=>{
   window.__proofs=[];window.__proofFail=false;
   window.turnstile={render:(box,opts)=>{window.__proofs.push({action:opts.action,cData:opts.cData});setTimeout(()=>window.__proofFail?opts['error-callback']():opts.callback('mock-human-proof'),5);return 1;},remove:()=>{}};
  });
  await ctx.route('**/*',async route=>{
   const url=new URL(route.request().url());requests.push(url.origin+url.pathname);
   if(url.hostname==='www.oecuhobog.org')return staticRoute(route,prod);
   if(url.hostname==='script.google.com'){
    if(route.request().method()==='GET')return route.fulfill({json:{comments:[{name:'試験用 <b>名前</b>',text:'<img src=x onerror=alert(1)>検証用'}]}});
    const body=Object.fromEntries(new URLSearchParams(route.request().postData()));posts.push(body);
    if(body.action==='save')saveCount++;
    if(mode==='retry'&&body.action==='save'&&saveCount===1)return route.abort();
    if(mode==='reject')return route.fulfill({json:{saved:false,error:'invalid_proof'}});
    const notify=body.action==='notify';
    const result={saved:true,kind:body.kind||'contact',receipt:mode==='mismatch'?'wrong-id':body.requestId,notified:true,confirmationSent:false,receiptPolicy:'disabled',deliveryPending:mode==='pending'&&!notify};
    if(body.kind==='subscription'){result.subscriptionHandled=true;result.confirmationSent=true;}
    return route.fulfill({json:result});
   }
   if(url.hostname==='www.googletagmanager.com'){scriptCalls.push(url.href);return route.fulfill({contentType:'text/javascript',body:'/* mock analytics, no data leaves browser */'});}
   return route.abort();
  });
  const page=await ctx.newPage();let errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{await page.goto('https://www.oecuhobog.org/');await run({page,posts,requests,scriptCalls});assert.deepEqual(errors,[]);checks.push({name,passed:true});}
  catch(e){checks.push({name,passed:false,error:e.stack});}
  await ctx.close();
 }
 const fill=async(page,kind='contact')=>{
  const f=page.locator('.site-form[data-intake-kind="'+kind+'"]');
  if(kind!=='subscription'){await f.locator('[name=name]').fill('検証用');await f.locator('[name=content]').fill('外部送信を行わない動作確認');}
  await f.locator('[name=email]').fill('test@example.invalid');return f;
 };
 const success=async f=>f.locator('.receiver-status[data-state=success]').waitFor();
 await scenario('contact fields, canonical URL, proof and duplicate suppression',async({page,posts})=>{
  const f=await fill(page);await f.locator('button[type=submit]').click();await success(f);await f.locator('button[type=submit]').click();
  assert.equal(posts.length,1);assert.equal(posts[0].kind,'contact');assert.equal(posts[0].page,'https://www.oecuhobog.org/');assert.equal(posts[0].message,'外部送信を行わない動作確認');assert.equal(posts[0].humanToken,'mock-human-proof');
 });
 await scenario('address change retains its purpose',async({page,posts})=>{
  const f=await fill(page,'address');await f.locator('button[type=submit]').click();await success(f);assert.equal(posts[0].kind,'contact');assert(posts[0].message.startsWith('【住所変更】\n'));
 });
 await scenario('retry after network failure reuses request ID',async({page,posts})=>{
  const f=await fill(page);await f.locator('button[type=submit]').click();await f.locator('.receiver-status[data-state=error]').waitFor();
  await f.locator('button[type=submit]').click();await success(f);assert.equal(posts.length,2);assert.equal(posts[0].requestId,posts[1].requestId);
 },'retry');
 await scenario('failed human verification sends no POST',async({page,posts})=>{
  await page.evaluate(()=>window.__proofFail=true);const f=await fill(page);await f.locator('button[type=submit]').click();await f.locator('.receiver-status[data-state=error]').waitFor();assert.equal(posts.length,0);
 });
 await scenario('backend rejection is not success',async({page})=>{
  const f=await fill(page);await f.locator('button[type=submit]').click();await f.locator('.receiver-status[data-state=error]').waitFor();assert.equal(await f.locator('[name=content]').inputValue(),'外部送信を行わない動作確認');
 },'reject');
 await scenario('mismatched receipt is not success',async({page})=>{
  const f=await fill(page);await f.locator('button[type=submit]').click();await f.locator('.receiver-status[data-state=error]').waitFor();
 },'mismatch');
 await scenario('pending delivery is checked without re-saving',async({page,posts})=>{
  const f=await fill(page);await f.locator('button[type=submit]').click();await page.waitForFunction(()=>document.querySelector('.receiver-status')?.textContent.includes('自動送信を停止'));
  assert.deepEqual(posts.map(x=>x.action),['save','notify']);assert.equal(posts[0].requestId,posts[1].requestId);
 },'pending');
 await scenario('subscription requires explicit consent',async({page,posts})=>{
  await page.goto('https://www.oecuhobog.org/blog/2019/');const f=await fill(page,'subscription');
  await f.evaluate(el=>window.OecuhobogReceiver.submitElement(el));assert.equal(posts.length,0);
  await f.locator('[name=readerConsent]').check();await f.locator('button[type=submit]').click();await success(f);
  assert.equal(posts[0].kind,'subscription');assert.equal(posts[0].consent,'yes');assert((await f.innerText()).includes('48時間'));
 });
 await scenario('comment display is escaped and posts use article canonical',async({page,posts})=>{
  await page.goto('https://www.oecuhobog.org/blog/2019/');
  const comment=page.locator('section[aria-label="新しいコメント"]');await comment.waitFor();assert.equal(await comment.locator('img,b').count(),0);
  const f=await fill(page,'comment');await f.locator('button[type=submit]').click();await success(f);assert.equal(posts[0].kind,'comment');assert(posts[0].page.startsWith('https://www.oecuhobog.org/blog/2019'));
 });
 await scenario('analytics opt-in, withdrawal and reload',async({page,scriptCalls})=>{
  assert.equal(scriptCalls.length,0);await page.getByRole('button',{name:'同意しない',exact:true}).click();await page.reload();assert.equal(scriptCalls.length,0);
  await page.getByRole('button',{name:'アクセス解析の設定',exact:true}).click();await page.getByRole('button',{name:'同意する',exact:true}).click();await page.waitForFunction(()=>document.querySelector('script[src*="googletagmanager"]'));assert.equal(scriptCalls.length,1);
  await page.getByRole('button',{name:'アクセス解析の設定',exact:true}).click();await page.getByRole('button',{name:'同意しない',exact:true}).click();assert(await page.evaluate(()=>window['ga-disable-G-NXBW4Y326R']));await page.reload();assert.equal(scriptCalls.length,1);
 });
 fs.writeFileSync(path.join(out,'form-contract-tests.json'),JSON.stringify(checks,null,2));
 console.log('production mocked checks',JSON.stringify(checks));
 await browser.close();if(failures.length||checks.some(x=>!x.passed))process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1)});
