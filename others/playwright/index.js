// const { chromium } = require('playwright');

// (async () => {
//   const browser = await chromium.launch({ headless: false });
//   const context = await browser.newContext({
//     acceptDownloads: true
//   });
//   const page = await context.newPage();

//   // Step 1: Start from your link
//   // await page.goto('https://jubaget.com/ads/NTU2ODYwOQ==');

//   // await page.locator('a.btn.btn-primary[href*="juba.revlink.pro"]').click();

//   await page.goto('https://jubaget.com/ads/NTU2ODYwOQ==', {
//     waitUntil: 'domcontentloaded'
//   });

//   // wait for your button specifically
//   const btn = page.locator('a[href*="juba.revlink.pro"]');

//   await btn.waitFor({ state: 'visible', timeout: 10000 });

//   console.log('✅ Found download button');

//   // click before redirect triggers
//   await btn.click();

//   // Step 2: Wait for redirects to settle
//   // await page.waitForLoadState('domcontentloaded');

//   // Optional: log URL changes
//   page.on('framenavigated', frame => {
//     console.log('Navigated to 1:', frame.url());
//   });
//   await page.waitForLoadState('domcontentloaded');

//   page.on('framenavigated', frame => {
//     console.log('Navigated to 2:', frame.url());
//   });

//   // https://starkroboticsfrc.com/?ssid=7c18221dea49fcefca033f4a124bbfb1

//   //   // Step 3: Wait for "Verify" button (first one)
//   //   const verifyBtn1 = page.locator('#verify-button');

//   //   if (await verifyBtn1.isVisible({ timeout: 15000 })) {
//   //     await verifyBtn1.click();
//   //     console.log('Clicked first verify');
//   //   }

//   //   // Step 4: Wait for second verify button
//   //   const verifyBtn2 = page.locator('.inline-verify-button');

//   //  if (await verifyBtn2.isVisible({ timeout: 20000 })) {
//   //     await verifyBtn2.click();
//   //     console.log('Clicked second verify');
//   //   }

//   //   // Step 5: Continue flow / wait for next page
//   //   await page.waitForLoadState('networkidle');



// })();

const { chromium } = require('playwright');
const path = require('path');

(async () => {
  // const browser = await chromium.launch({ headless: false });
  const browser = await chromium.launch({
    headless: false
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  const START_URL = 'https://jubaget.com/ads/NTU2ODYwOQ==';


  page.on('console', msg => {
    console.log('📦 Browser log:', msg.text());
  });

  // Track navigation (VERY useful)
  page.on('framenavigated', frame => {
    if (frame === page.mainFrame()) {
      console.log('➡️ Navigated to:', frame.url());
    }
  });

  await page.addInitScript({
    path: path.resolve(__dirname, './timer.js')
  });


  await page.goto(START_URL, { waitUntil: 'domcontentloaded' });

  // Step 1: Get direct link
  const link = page.locator('a[href*="juba.revlink.pro"]');
  await link.waitFor();

  const href = await link.getAttribute('href');
  console.log('🔗 Redirect link:', href);

  // Step 2: Go to redirect chain
  await page.goto(href);

  console.log('✅ Reached 1st timer page');

  const MAX_RETRIES = 5;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    console.log(`🔁 Attempt ${attempt}`);

    try {
      // --- 1st button ---
      const firstBtn = page.locator('#verify-button');
      // await firstBtn.waitFor({ state: 'visible', timeout: 10000 });
      await firstBtn.click();
      console.log('✅ Clicked 1st verify');

      // --- 2nd button ---
      const secondBtn = page.getByRole('button', { name: 'Verify reading' });
      // await secondBtn.waitFor({ state: 'visible', timeout: 10000 });
      await secondBtn.click();
      console.log('✅ Clicked 2nd verify');

      // --- Wait for redirect ---
      const navigationHappened = await Promise.race([
        page.waitForNavigation({ timeout: 2000 }).then(() => true),
        page.waitForTimeout(2000).then(() => false)
      ]);

      if (navigationHappened) {
        console.log('🚀 Redirect detected, exiting loop');
        break;
      }

      console.log('⚠️ No redirect, reloading...');
      await page.reload({ waitUntil: 'domcontentloaded' });

    } catch (err) {
      console.log('❌ Error, retrying...', err.message);
      await page.reload({ waitUntil: 'domcontentloaded' });
    }
  }

  // New ad page where need to right click on googleads.g.doubleclick.net

  async function findAdLink(page) {
    const deadline = Date.now() + 15000;

    while (Date.now() < deadline) {
      const frames = page.frames();

      for (const frame of frames) {
        try {
          const links = await frame.$$('a[href*="googleads.g.doubleclick.net"]');

          if (links.length > 0) {
            console.log('✅ Ad found in frame:', frame.url());
            return { frame, element: links[0] };
          }

        } catch (e) {
          // ignore cross-origin errors
        }
      }

      await page.waitForTimeout(500);
    }

    throw new Error('❌ Ad not found');
  }

  const { frame, element } = await findAdLink(page);

  const href1 = await element.getAttribute('href');
  console.log('🔗 Ad link:', href1);

  const [newPage] = await Promise.all([
    context.waitForEvent('page'),
    frame.evaluate((url) => window.open(url, '_blank'), href1)
  ]);

  await newPage.waitForLoadState();

  console.log('✅ Ad opened');

  await page.waitForTimeout(3000); // simulate reading

  await newPage.close();
  await page.bringToFront();

  page.on('response', res => {
    if (res.url().includes('/api/session')) {
      console.log('API:', res.status(), res.url());
    }
  });

  async function simulateMouse(page) {
    // move inside page slowly
    await page.mouse.move(100, 100);
    await page.waitForTimeout(200);

    for (let i = 0; i < 5; i++) {
      await page.mouse.move(100 + i * 50, 100 + i * 30);
      await page.waitForTimeout(150);
    }

    // now leave viewport gradually
    await page.mouse.move(10, 10);
    await page.waitForTimeout(200);

    await page.mouse.move(-50, -50);   // outside
    await page.waitForTimeout(500);

    await page.mouse.move(-200, -200); // far outside
  }

  // trigger timer condition
  // await page.mouse.move(-100, -100);
  // await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.evaluate(() => {
    window.dispatchEvent(new Event('blur'));
    document.dispatchEvent(new Event('visibilitychange'));
  });

})();