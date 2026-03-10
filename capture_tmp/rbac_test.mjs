import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1536, height: 776 });
  
  // Test HKADMIN (Admin Role)
  console.log('--- ADMIN TEST (hkadmin) ---');
  await page.goto('http://localhost:5173/auth');
  await page.type('input[type="email"]', 'hkadmin@example.com');
  await page.type('input[type="password"]', 'password123');
  
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text.includes('LOG IN')) { await btn.click(); break; }
  }
  
  await new Promise(r => setTimeout(r, 6000));
  
  // Navigate to Channels Hub
  console.log('Navigating to Channels...');
  await page.goto('http://localhost:5173/channels');
  await new Promise(r => setTimeout(r, 4000));
  
  // Check if Admin link exists in sidebar
  const adminLink = await page.$('a[href="/admin"]');
  if (adminLink) {
    console.log('SUCCESS: Admin Dashboard link is visible to hkadmin.');
  } else {
    console.log('WARNING: Admin Dashboard link not found for hkadmin.');
  }
  
  // Logout
  const logoutBtn = await page.$('.logout-btn') || await page.$('a[href="/auth"]'); // Try find logout
  if(logoutBtn) {
       await logoutBtn.click();
       await new Promise(r => setTimeout(r, 2000));
  }
  
  // Test TESTUSER123 (User Role)
  console.log('--- USER TEST (testuser123) ---');
  await page.goto('http://localhost:5173/auth');
  await page.type('input[type="email"]', 'testuser123@example.com');
  await page.type('input[type="password"]', 'password123');
  
  const buttons2 = await page.$$('button');
  for (const btn of buttons2) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text.includes('LOG IN')) { await btn.click(); break; }
  }
  
  await new Promise(r => setTimeout(r, 6000));
  
  // Navigate to Channels Hub
  console.log('Navigating to Channels...');
  await page.goto('http://localhost:5173/channels');
  await new Promise(r => setTimeout(r, 4000));
  
  // Check if Admin link exists in sidebar
  const adminLink2 = await page.$('a[href="/admin"]');
  if (adminLink2) {
    console.log('WARNING: Admin Dashboard link is visible to a regular user!');
  } else {
    console.log('SUCCESS: Admin Dashboard link is hidden from testuser123.');
  }
  
  console.log('All tests finished successfully.');
  await browser.close();
})();
