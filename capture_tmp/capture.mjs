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
  
  // Click LOG IN button
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text.includes('LOG IN')) {
       await btn.click();
       break;
    }
  }
  
  await new Promise(r => setTimeout(r, 6000));
  
  // POST CREATOR SCREENSHOT
  console.log('Preparing Post Creator...');
  const textarea = await page.$('textarea');
  if (textarea) {
    await textarea.type('Testing out the new federated social features! Lets build something cool together.');
  }
  
  const fileInput = await page.$('input[type="file"]');
  if (fileInput) {
    await fileInput.uploadFile('C:\\Users\\heman\\.gemini\\antigravity\\brain\\62fba1a6-064c-4b40-af5f-4a4c164d0dbc\\federated_network_demo_1773042878280.png');
    await new Promise(r => setTimeout(r, 1000));
  }
  
  console.log('Capturing Post Creator...');
  await page.screenshot({ path: 'C:\\Users\\heman\\OneDrive\\Documents\\SWE\\Poster_Screenshots\\4_Post_Creator.png' });
  
  console.log('Done!');
  await browser.close();
})();
