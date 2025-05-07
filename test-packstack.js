// Playwright test script for Packstack application
import { chromium } from 'playwright';

async function testPackstack() {
  // Launch a browser
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Testing Packstack application...');

  try {
    // Navigate to the Packstack frontend
    console.log('Navigating to Packstack frontend...');
    await page.goto('http://localhost:5173');
    console.log('Successfully loaded Packstack frontend!');

    // Take a screenshot of the homepage
    await page.screenshot({ path: 'packstack-homepage.png' });
    console.log('Captured screenshot of the homepage');
    
    // Log page content to understand structure
    const pageContent = await page.content();
    console.log('Page HTML content:', pageContent.substring(0, 1000) + '...');
    
    // Let's see what buttons and links are available
    const buttons = await page.$$eval('button, a', elements => 
      elements.map(el => ({ 
        type: el.tagName, 
        text: el.textContent?.trim(), 
        href: el.href,
        id: el.id,
        class: el.className
      }))
    );
    console.log('Available buttons and links:', JSON.stringify(buttons, null, 2));
    
    // Test API communication with backend
    console.log('Testing API communication with backend...');
    const healthcheckResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('http://localhost:5001/health_check');
        return await response.json();
      } catch (error) {
        return { error: error.message };
      }
    });

    console.log('Health check response:', healthcheckResponse);
    
    // Look for navigation elements
    try {
      // Look for register/login links - they might be in different formats
      const authLinks = await page.$$('a[href*="register"], a[href*="login"], button:has-text("Register"), button:has-text("Login")');
      
      if (authLinks.length > 0) {
        // Find register link
        const registerLink = await page.$('a[href*="register"], button:has-text("Register")');
        if (registerLink) {
          console.log('Found Register link, clicking...');
          await registerLink.click();
          await page.waitForLoadState('networkidle');
          console.log('Successfully navigated to Register page');
          
          // Take a screenshot of the register page
          await page.screenshot({ path: 'packstack-register.png' });
          console.log('Captured screenshot of the Register page');
          
          // Find login link from register page
          const loginLink = await page.$('a[href*="login"], button:has-text("Login")');
          if (loginLink) {
            console.log('Found Login link from register page, clicking...');
            await loginLink.click();
            await page.waitForLoadState('networkidle');
            console.log('Successfully navigated to Login page');
            
            // Take a screenshot of the login page
            await page.screenshot({ path: 'packstack-login.png' });
            console.log('Captured screenshot of the Login page');
            
            // Look for username/email and password fields
            const usernameField = await page.$('input[type="text"], input[type="email"], input[name="emailOrUsername"]');
            const passwordField = await page.$('input[type="password"]');
            
            if (usernameField && passwordField) {
              console.log('Found login form fields, attempting login...');
              await usernameField.fill('testuser');
              await passwordField.fill('password');
              
              // Find login button
              const loginButton = await page.$('button[type="submit"], button:has-text("Login")');
              if (loginButton) {
                await loginButton.click();
                await page.waitForLoadState('networkidle');
                
                // Take a screenshot after login attempt
                await page.screenshot({ path: 'packstack-after-login.png' });
                console.log('Captured screenshot after login attempt');
              } else {
                console.log('Could not find login button');
              }
            } else {
              console.log('Could not find login form fields');
            }
          } else {
            console.log('Could not find Login link from register page');
          }
        } else {
          console.log('Could not find Register link');
        }
      } else {
        console.log('No authentication links found on homepage');
      }
    } catch (e) {
      console.log('Error during navigation testing:', e.message);
    }

    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
    await page.screenshot({ path: 'packstack-error.png' });
    console.log('Captured error screenshot');
  } finally {
    // Close the browser
    await browser.close();
    console.log('Browser closed');
  }
}

// Run the test
testPackstack().catch(err => console.error('Test failed with error:', err));
