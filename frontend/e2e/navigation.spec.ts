import { test, expect } from '@playwright/test'

test.describe('Navigation', () => {
  // These tests check that all sidebar links work
  // They require authentication, so skip on CI without backend
  
  test.beforeEach(async ({ page }) => {
    test.skip(process.env.CI === 'true', 'Requires live backend')
    
    // Login first
    await page.goto('/login')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'password')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/dashboard/)
  })

  test('sidebar navigation links work', async ({ page }) => {
    // Dashboard
    await page.click('a[href="/dashboard"], nav >> text=Dashboard')
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.locator('h1')).toContainText(/dashboard/i)

    // Items
    await page.click('a[href="/items"], nav >> text=Items')
    await expect(page).toHaveURL(/\/items/)
    await expect(page.locator('h1')).toContainText(/items/i)

    // Smart Add
    await page.click('a[href="/smart-add"], nav >> text=Smart Add')
    await expect(page).toHaveURL(/\/smart-add/)
    await expect(page.locator('h1')).toContainText(/smart add/i)

    // Reminders
    await page.click('a[href="/reminders"], nav >> text=Reminders')
    await expect(page).toHaveURL(/\/reminders/)
    await expect(page.locator('h1')).toContainText(/reminders/i)

    // Todos
    await page.click('a[href="/todos"], nav >> text=Todos')
    await expect(page).toHaveURL(/\/todos/)
    await expect(page.locator('h1')).toContainText(/todos/i)

    // Vendors
    await page.click('a[href="/vendors"], nav >> text=Vendors')
    await expect(page).toHaveURL(/\/vendors/)
    await expect(page.locator('h1')).toContainText(/vendors/i)

    // Settings
    await page.click('a[href="/settings"], nav >> text=Settings')
    await expect(page).toHaveURL(/\/settings/)
    await expect(page.locator('h1')).toContainText(/settings/i)

    // Help
    await page.click('a[href="/help"], nav >> text=Help')
    await expect(page).toHaveURL(/\/help/)
    await expect(page.locator('h1')).toContainText(/help/i)
  })

  test('breadcrumbs show current location', async ({ page }) => {
    await page.goto('/items')
    
    // Should show breadcrumb with "Items"
    await expect(page.locator('nav[aria-label="breadcrumb"], .breadcrumb')).toContainText(/items/i)
  })

  test('back button navigates correctly', async ({ page }) => {
    // Go to items list
    await page.goto('/items')
    
    // Click on first item (if exists)
    const firstItem = page.locator('[data-testid="item-card"], .item-card, a[href^="/items/"]').first()
    if (await firstItem.isVisible()) {
      await firstItem.click()
      
      // Should be on item detail page
      await expect(page).toHaveURL(/\/items\/\d+/)
      
      // Click back button
      await page.click('button:has-text("Back"), [aria-label="Go back"]')
      
      // Should be back on items list
      await expect(page).toHaveURL(/\/items$/)
    }
  })

  test('404 page for invalid routes', async ({ page }) => {
    await page.goto('/nonexistent-page-12345')
    
    // Should show 404 or redirect to dashboard/login
    await expect(page.locator('text=not found, text=404')).toBeVisible().catch(() => {
      // Or redirected
      expect(page.url()).toMatch(/\/(dashboard|login)/)
    })
  })

  test('mobile menu toggle works', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/dashboard')
    
    // Find and click mobile menu button
    const menuButton = page.locator('button[aria-label="Menu"], button:has-text("Menu"), [data-testid="mobile-menu"]')
    if (await menuButton.isVisible()) {
      await menuButton.click()
      
      // Sidebar should be visible
      await expect(page.locator('nav, aside')).toBeVisible()
    }
  })
})

test.describe('Page Loading', () => {
  test('all pages load without errors', async ({ page }) => {
    // Listen for console errors
    const errors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    const publicPages = ['/login', '/register']
    
    for (const path of publicPages) {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      
      // Check for critical errors (filter out common non-critical ones)
      const criticalErrors = errors.filter(e => 
        !e.includes('favicon') && 
        !e.includes('404') &&
        !e.includes('Failed to load resource')
      )
      
      expect(criticalErrors).toHaveLength(0)
    }
  })

  test('login page loads quickly', async ({ page }) => {
    const startTime = Date.now()
    
    await page.goto('/login')
    await page.waitForLoadState('domcontentloaded')
    
    const loadTime = Date.now() - startTime
    
    // Should load in under 3 seconds
    expect(loadTime).toBeLessThan(3000)
  })
})
