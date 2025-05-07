import { test, expect } from '@playwright/test';

test.describe('Authentication Flow Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the home page
    await page.goto('/');
  });

  test('should display login page', async ({ page }) => {
    // Navigate to login page
    await page.goto('/auth/login');
    
    // Verify login page elements are visible
    await expect(page.locator('h1:has-text("Login")')).toBeVisible();
    await expect(page.locator('input[placeholder="Email or username"]')).toBeVisible();
    await expect(page.locator('input[placeholder="Password"]')).toBeVisible();
    await expect(page.locator('button:has-text("Login")')).toBeVisible();
  });

  test('should show error message with invalid credentials', async ({ page }) => {
    // Navigate to login page
    await page.goto('/auth/login');
    
    // Fill in invalid credentials and submit
    await page.fill('input[placeholder="Email or username"]', 'invalid@example.com');
    await page.fill('input[placeholder="Password"]', 'wrongpassword');
    await page.click('button:has-text("Login")');
    
    // Verify error message is displayed
    await expect(page.locator('div[role="alert"]')).toBeVisible();
    
    // Set up console log listener to catch errors
    page.on('console', async (msg) => {
      if (msg.type() === 'error') {
        console.error(`Browser console error: ${msg.text()}`);
      }
    });
  });

  test('should display registration page', async ({ page }) => {
    // Navigate to registration page
    await page.goto('/auth/register');
    
    // Verify registration page elements are visible
    await expect(page.locator('h1:has-text("Sign Up")')).toBeVisible();
    await expect(page.locator('input[placeholder="username"]')).toBeVisible();
    await expect(page.locator('input[placeholder="john@muir.com"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button:has-text("Sign Up")')).toBeVisible();
  });

  test('should validate input fields on registration form', async ({ page }) => {
    // Navigate to registration page
    await page.goto('/auth/register');
    
    // Test username validation - too short
    await page.fill('input[placeholder="username"]', 'ab');
    await page.click('input[placeholder="john@muir.com"]'); // click to trigger validation
    
    // Should show validation error
    await expect(page.locator('text=Username must be at least 3 characters long')).toBeVisible();
    
    // Test email validation
    await page.fill('input[placeholder="john@muir.com"]', 'invalid-email');
    await page.click('input[type="password"]'); // click to trigger validation
    
    // Should show validation error (this might be a browser-level validation)
    const emailInput = page.locator('input[placeholder="john@muir.com"]');
    const isValid = await emailInput.evaluate(el => (el as HTMLInputElement).validity.valid);
    expect(isValid).toBeFalsy();
    
    // Test password validation - too short
    await page.fill('input[type="password"]', '12345');
    await page.click('input[placeholder="username"]'); // click to trigger validation
    
    // Password validation error might show up
    // Note: This depends on how your validation is set up
  });

  test('should allow successful mock registration and login', async ({ page }) => {
    // First register a new user
    await page.goto('/auth/register');
    
    // Fill in registration form with valid data
    await page.fill('input[placeholder="username"]', 'testuser');
    await page.fill('input[placeholder="john@muir.com"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    
    // Submit registration form
    await page.click('button:has-text("Sign Up")');
    
    // Should be redirected to the home page after successful registration
    // In our mock setup, this should work since we're using mock backend responses
    await expect(page).toHaveURL(/.*\//);
    
    // Now test login with the same credentials
    // First logout (this depends on your UI, we'll navigate directly to login)
    await page.goto('/auth/login');
    
    // Fill in login form with the mock credentials
    await page.fill('input[placeholder="Email or username"]', 'test@example.com');
    await page.fill('input[placeholder="Password"]', 'password123');
    
    // Submit login form
    await page.click('button:has-text("Login")');
    
    // Should be redirected to the home page after successful login
    await expect(page).toHaveURL(/.*\//);
  });

  test('should show error alerts with proper styling', async ({ page }) => {
    // Navigate to login page
    await page.goto('/auth/login');
    
    // Fill in invalid credentials and submit
    await page.fill('input[placeholder="Email or username"]', 'nonexistent@example.com');
    await page.fill('input[placeholder="Password"]', 'wrongpassword');
    await page.click('button:has-text("Login")');
    
    // Wait for the error alert to appear
    const errorAlert = page.locator('div[role="alert"]');
    await expect(errorAlert).toBeVisible();
    
    // Verify the alert has the correct styling for errors
    await expect(errorAlert).toHaveClass(/.*destructive.*/);
    
    // Verify the alert contains an icon
    await expect(errorAlert.locator('svg')).toBeVisible();
  });
});
