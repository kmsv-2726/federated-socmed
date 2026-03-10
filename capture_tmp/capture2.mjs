import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1536, height: 776 });
  
  console.log('Navigating to auth...');
  await page.goto('http://localhost:5173/auth');
  
  console.log('Logging in...');
  await page.type('input[type="email"]', 'testuser123@example.com'); 
  await page.type('input[type="password"]', 'password123');
  
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text.includes('LOG IN')) {
       await btn.click();
       break;
    }
  }
  
  await new Promise(r => setTimeout(r, 6000));
  
  console.log('Navigating to Support/Report...');
  await page.goto('http://localhost:5173/help-center/contact');
  await new Promise(r => setTimeout(r, 4000));
  
  console.log('Filling out report form...');
  const emailInput = await page.$('input[name="email"]');
  if (emailInput) await emailInput.type('testuser123@example.com');
  
  const select = await page.$('select[name="category"]');
  if (select) await select.select('bug');
  
  const subjectInput = await page.$('input[name="subject"]');
  if (subjectInput) await subjectInput.type('Spam content found in federated channel');
  
  const descInput = await page.$('textarea[name="description"]');
  if (descInput) await descInput.type('There are several posts containing spam links in the public feed that bypass content moderation.');
  
  console.log('Capturing Report Form...');
  await page.screenshot({ path: 'C:\\Users\\heman\\OneDrive\\Documents\\SWE\\Poster_Screenshots\\4_Report_Function.png' });
  
  console.log('Done!');
  await browser.close();
})();
