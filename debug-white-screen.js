// Debug script to identify white screen issue
import { chromium } from 'playwright';

async function debugWhiteScreen() {
  // Launch a browser
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  
  // Create a page and capture console logs
  const page = await context.newPage();
  page.on('console', msg => console.log(`BROWSER CONSOLE: ${msg.type()}: ${msg.text()}`));
  page.on('pageerror', err => console.error(`BROWSER ERROR: ${err.message}`));
  
  console.log('Navigating to Packstack frontend...');
  await page.goto('http://localhost:5173');
  console.log('Page loaded, checking for errors...');
  
  // Wait for any possible delayed errors
  await page.waitForTimeout(5000);
  
  // Get the page HTML
  const html = await page.content();
  console.log('Page HTML length:', html.length);
  console.log('HTML snippet:', html.substring(0, 500) + '...');
  
  // Check if there's actual content in the page body
  const bodyContent = await page.evaluate(() => document.body.innerText);
  console.log('Body content length:', bodyContent.length);
  if (bodyContent.length < 10) {
    console.log('Body appears empty, likely a white screen issue');
  }

  // Check if main React mounting element exists
  const rootElement = await page.evaluate(() => {
    const root = document.getElementById('root');
    return root ? { exists: true, hasChildren: root.hasChildNodes() } : { exists: false };
  });
  console.log('Root element status:', rootElement);
  
  // Check all network requests
  console.log('Checking network requests...');
  const requests = await page.evaluate(() => {
    return performance.getEntriesByType('resource').map(entry => ({
      name: entry.name,
      duration: entry.duration,
      type: entry.initiatorType
    }));
  });
  console.log('Network requests:', JSON.stringify(requests, null, 2).substring(0, 1000) + '...');
  
  // Check if the application is trying to reach the backend
  console.log('Testing backend connection...');
  const backendStatus = await page.evaluate(async () => {
    try {
      const response = await fetch('http://localhost:5001/health_check');
      return {
        status: response.status,
        ok: response.ok,
        data: await response.json()
      };
    } catch (error) {
      return { error: error.message };
    }
  });
  console.log('Backend connection status:', backendStatus);
  
  // Take a screenshot for reference
  await page.screenshot({ path: 'white-screen-debug.png' });
  
  await browser.close();
  console.log('Debug completed');
}

debugWhiteScreen().catch(console.error);
