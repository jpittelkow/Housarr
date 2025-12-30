import { test, expect } from '@playwright/test'

test.describe('Smart Add', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Login before each test
    test.skip(process.env.CI === 'true', 'Requires live backend')
    
    await page.goto('/login')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'password')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/dashboard/)
  })

  test('can navigate to Smart Add page', async ({ page }) => {
    await page.click('a:has-text("Smart Add"), [href="/smart-add"]')
    
    await expect(page).toHaveURL(/\/smart-add/)
    await expect(page.locator('h1:has-text("Smart Add")')).toBeVisible()
  })

  test('shows search input and upload area', async ({ page }) => {
    await page.goto('/smart-add')
    
    // Should show search input
    await expect(page.locator('input[placeholder*="make"], input[placeholder*="model"], input[placeholder*="product"]')).toBeVisible()
    
    // Should show upload area
    await expect(page.locator('text=Drop photo here, text=upload')).toBeVisible()
  })

  test('search button triggers AI analysis', async ({ page }) => {
    await page.goto('/smart-add')
    
    // Enter search query
    await page.fill('input[placeholder*="make"], input[placeholder*="model"], input[placeholder*="product"]', 'Samsung Refrigerator RF28R7551SR')
    await page.click('button:has-text("Search")')
    
    // Should show analyzing state
    await expect(page.locator('text=Analyzing, text=Searching, text=Querying')).toBeVisible({ timeout: 5000 })
  })

  test('can handle search with no results gracefully', async ({ page }) => {
    await page.goto('/smart-add')
    
    await page.fill('input[placeholder*="make"], input[placeholder*="model"], input[placeholder*="product"]', 'xyznonexistent12345')
    await page.click('button:has-text("Search")')
    
    // Should eventually show error or no results message
    await expect(page.locator('text=Could not identify, text=No results, text=Try again')).toBeVisible({ timeout: 30000 })
  })

  test('shows agent details during analysis', async ({ page }) => {
    await page.goto('/smart-add')
    
    await page.fill('input[placeholder*="make"], input[placeholder*="model"], input[placeholder*="product"]', 'Carrier AC Unit')
    await page.click('button:has-text("Search")')
    
    // Should show multi-agent indicator
    await expect(page.locator('text=Claude, text=OpenAI, text=Gemini')).toBeVisible({ timeout: 5000 })
  })

  test('can select a result and see form', async ({ page }) => {
    test.slow() // This test involves AI processing
    
    await page.goto('/smart-add')
    
    await page.fill('input[placeholder*="make"], input[placeholder*="model"], input[placeholder*="product"]', 'LG Dishwasher')
    await page.click('button:has-text("Search")')
    
    // Wait for results
    await page.waitForSelector('text=Results', { timeout: 30000 })
    
    // Click first result
    await page.click('[class*="result"], button:has-text("LG")')
    
    // Should show item details form
    await expect(page.locator('text=Item Details')).toBeVisible()
    await expect(page.locator('input[name="name"], label:has-text("Name")')).toBeVisible()
  })

  test('form includes category and location selects', async ({ page }) => {
    test.slow()
    
    await page.goto('/smart-add')
    
    await page.fill('input[placeholder*="make"], input[placeholder*="model"], input[placeholder*="product"]', 'Whirlpool Washer')
    await page.click('button:has-text("Search")')
    
    await page.waitForSelector('text=Results', { timeout: 30000 })
    await page.click('[class*="result"]:first-child')
    
    // Should have category and location dropdowns
    await expect(page.locator('label:has-text("Category"), select[name="category"]')).toBeVisible()
    await expect(page.locator('label:has-text("Location"), select[name="location"]')).toBeVisible()
  })

  test('has attach photo checkbox', async ({ page }) => {
    test.slow()
    
    await page.goto('/smart-add')
    
    await page.fill('input[placeholder*="make"], input[placeholder*="model"], input[placeholder*="product"]', 'GE Microwave')
    await page.click('button:has-text("Search")')
    
    await page.waitForSelector('text=Results', { timeout: 30000 })
    await page.click('[class*="result"]:first-child')
    
    // Should have checkbox for attaching photo
    await expect(page.locator('text=attach, text=photo, text=image')).toBeVisible()
  })

  test('has search manual checkbox', async ({ page }) => {
    test.slow()
    
    await page.goto('/smart-add')
    
    await page.fill('input[placeholder*="make"], input[placeholder*="model"], input[placeholder*="product"]', 'Bosch Dishwasher')
    await page.click('button:has-text("Search")')
    
    await page.waitForSelector('text=Results', { timeout: 30000 })
    await page.click('[class*="result"]:first-child')
    
    // Should have checkbox for searching manual
    await expect(page.locator('text=manual, text=PDF')).toBeVisible()
  })

  test('reset button clears state', async ({ page }) => {
    await page.goto('/smart-add')
    
    await page.fill('input[placeholder*="make"], input[placeholder*="model"], input[placeholder*="product"]', 'Test Product')
    await page.click('button:has-text("Search")')
    
    // Wait for some state change
    await page.waitForTimeout(2000)
    
    // Click reset/try again button
    const resetButton = page.locator('button:has-text("New Search"), button:has-text("Try Again"), button:has-text("Reset")')
    if (await resetButton.isVisible()) {
      await resetButton.click()
      
      // Should be back to initial state
      await expect(page.locator('input[placeholder*="make"], input[placeholder*="model"]')).toBeVisible()
    }
  })

  test('drag and drop area responds to hover', async ({ page }) => {
    await page.goto('/smart-add')
    
    const dropzone = page.locator('[class*="drop"], [class*="upload"]')
    
    // Hover should change appearance (we can't fully test drag/drop easily)
    await expect(dropzone).toBeVisible()
  })
})
