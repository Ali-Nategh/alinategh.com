/* README screenshots.  Serve the site first (python3 -m http.server 8000), then:
     npm i -D playwright && npx playwright install chromium
     node tools/screenshots.js http://localhost:8000/
   Writes docs/*.png at 2x. */
const { chromium, devices } = require('playwright');
const U = process.argv[2] || 'http://localhost:8000/';
const OUT = __dirname + '/../docs/';
(async () => {
  const b = await chromium.launch();
  let ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  let p = await ctx.newPage();
  const shot = async (name, wait = 1500) => { await p.waitForTimeout(wait); await p.screenshot({ path: OUT + name + '.png' }); };
  await p.goto(U, { waitUntil: 'networkidle' }); await shot('home', 4500);
  await p.evaluate(() => document.getElementById('music').scrollIntoView()); await shot('music', 1200);
  await p.evaluate(() => scrollTo(0, 0)); await p.click('[data-open-tty]');
  for (const c of ['whoami', 'help']) { await p.fill('#ttyIn', c); await p.press('#ttyIn', 'Enter'); }
  await shot('terminal', 600); await p.keyboard.press('Escape');
  await p.evaluate(() => localStorage.setItem('an.theme', '"light"')); await p.reload({ waitUntil: 'networkidle' }); await shot('light', 3500);
  await p.evaluate(() => localStorage.removeItem('an.theme'));
  await p.goto(U + '#studio'); await p.reload({ waitUntil: 'networkidle' }); await shot('studio');
  await p.goto(U + '#admin'); await p.reload({ waitUntil: 'networkidle' }); await shot('editor');
  await ctx.close();
  ctx = await b.newContext({ ...devices['iPhone 13'] }); p = await ctx.newPage();
  await p.goto(U, { waitUntil: 'networkidle' }); await shot('phone', 4000);
  await b.close();
})();
