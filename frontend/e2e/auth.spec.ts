import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing session
    await page.context().clearCookies()
  })

  test('shows login page for unauthenticated users', async ({ page }) => {
    await page.goto('/')
    
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/)
    await expect(page.locator('text=Sign in')).toBeVisible()
  })

  test('login form has required fields', async ({ page }) => {
    await page.goto('/login')
    
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('input[name="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('shows validation errors for empty form', async ({ page }) => {
    await page.goto('/login')
    
    await page.click('button[type="submit"]')
    
    // Should show validation errors
    await expect(page.locator('text=required')).toBeVisible()
  })

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/login')
    
    await page.fill('input[name="email"]', 'wrong@example.com')
    await page.fill('input[name="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')
    
    // Should show error message (toast or inline)
    await expect(page.locator('[data-sonner-toast], .toast-error, [role="alert"]')).toBeVisible({ timeout: 10000 })
  })

  test('can navigate to registration page', async ({ page }) => {
    await page.goto('/login')
    
    await page.click('text=Sign up')
    
    await expect(page).toHaveURL(/\/register/)
  })

  test('registration page has required fields', async ({ page }) => {
    await page.goto('/register')
    
    await expect(page.locator('input[name="name"]')).toBeVisible()
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('input[name="password"]')).toBeVisible()
    await expect(page.locator('input[name="password_confirmation"], input[name="confirmPassword"]')).toBeVisible()
  })

  test('successful login redirects to dashboard', async ({ page }) => {
    // This test requires a running backend with valid credentials
    // Skip if no backend is available
    test.skip(process.env.CI === 'true', 'Requires live backend')
    
    await page.goto('/login')
    
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'password')
    await page.click('button[type="submit"]')
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
  })

  test('theme toggle works on login page', async ({ page }) => {
    await page.goto('/login')
    
    // Find and click theme toggle
    const darkButton = page.locator('button[name="Dark"], button:has-text("Dark")')
    if (await darkButton.isVisible()) {
      await darkButton.click()
      
      // Page should have dark class or dark mode styles
      await expect(page.locator('html')).toHaveClass(/dark/)
    }
  })
})

test.describe('Authenticated User', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Login before each test
    // This could use a storage state or API login
    test.skip(process.env.CI === 'true', 'Requires live backend')
    
    await page.goto('/login')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'password')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/dashboard/)
  })

  test('can access dashboard', async ({ page }) => {
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible()
  })

  test('can logout', async ({ page }) => {
    // Find logout button in sidebar or menu
    await page.click('button:has-text("Logout"), a:has-text("Logout")')
    
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/)
  })
})
