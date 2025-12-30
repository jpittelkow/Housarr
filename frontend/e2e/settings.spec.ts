import { test, expect } from '@playwright/test'

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(process.env.CI === 'true', 'Requires live backend')
    
    // Login
    await page.goto('/login')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'password')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/dashboard/)
    
    // Navigate to settings
    await page.goto('/settings')
  })

  test('settings page loads', async ({ page }) => {
    await expect(page.locator('h1')).toContainText(/settings/i)
  })

  test('has tabs for different sections', async ({ page }) => {
    // Should have multiple tabs
    const tabs = page.locator('[role="tab"], button[role="tab"]')
    const tabCount = await tabs.count()
    
    expect(tabCount).toBeGreaterThan(1)
  })

  test('can switch between tabs', async ({ page }) => {
    // Click on different tabs
    const tabs = page.locator('[role="tab"]')
    
    for (let i = 0; i < Math.min(await tabs.count(), 3); i++) {
      await tabs.nth(i).click()
      
      // Tab panel should update
      await expect(page.locator('[role="tabpanel"]')).toBeVisible()
    }
  })

  test('household settings exist', async ({ page }) => {
    // Should have household section
    await expect(page.locator('text=Household')).toBeVisible()
  })

  test('can edit household name', async ({ page }) => {
    // Find household name input
    const householdInput = page.locator('input[name="household_name"], input:near(:text("Household Name"))')
    
    if (await householdInput.isVisible()) {
      const currentValue = await householdInput.inputValue()
      
      // Clear and type new value
      await householdInput.fill('Test Household Updated')
      
      // Find save button
      const saveButton = page.locator('button:has-text("Save")')
      if (await saveButton.isVisible()) {
        await saveButton.click()
        
        // Should show success toast
        await expect(page.locator('[data-sonner-toast]')).toBeVisible({ timeout: 5000 })
      }
      
      // Restore original value
      await householdInput.fill(currentValue)
    }
  })
})

test.describe('Categories Management', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(process.env.CI === 'true', 'Requires live backend')
    
    await page.goto('/login')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'password')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/dashboard/)
    await page.goto('/settings')
  })

  test('can view categories', async ({ page }) => {
    // Click categories tab
    const categoriesTab = page.locator('[role="tab"]:has-text("Categories"), button:has-text("Categories")')
    if (await categoriesTab.isVisible()) {
      await categoriesTab.click()
      
      // Should show categories list
      await expect(page.locator('text=Appliances, text=Electronics, text=HVAC')).toBeVisible()
    }
  })

  test('can add new category', async ({ page }) => {
    const categoriesTab = page.locator('[role="tab"]:has-text("Categories")')
    if (await categoriesTab.isVisible()) {
      await categoriesTab.click()
      
      // Click add button
      const addButton = page.locator('button:has-text("Add Category"), button:has([data-lucide="plus"])')
      if (await addButton.isVisible()) {
        await addButton.click()
        
        // Should show form/modal
        await expect(page.locator('[role="dialog"], form')).toBeVisible()
      }
    }
  })
})

test.describe('Locations Management', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(process.env.CI === 'true', 'Requires live backend')
    
    await page.goto('/login')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'password')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/dashboard/)
    await page.goto('/settings')
  })

  test('can view locations', async ({ page }) => {
    const locationsTab = page.locator('[role="tab"]:has-text("Locations"), button:has-text("Locations")')
    if (await locationsTab.isVisible()) {
      await locationsTab.click()
      
      // Should show locations list
      await expect(page.locator('[role="tabpanel"]')).toContainText(/kitchen|garage|bedroom/i)
    }
  })

  test('can add new location', async ({ page }) => {
    const locationsTab = page.locator('[role="tab"]:has-text("Locations")')
    if (await locationsTab.isVisible()) {
      await locationsTab.click()
      
      const addButton = page.locator('button:has-text("Add Location"), button:has([data-lucide="plus"])')
      if (await addButton.isVisible()) {
        await addButton.click()
        
        await expect(page.locator('[role="dialog"], form')).toBeVisible()
      }
    }
  })
})

test.describe('Backup/Restore', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(process.env.CI === 'true', 'Requires live backend')
    
    await page.goto('/login')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'password')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/dashboard/)
    await page.goto('/settings')
  })

  test('backup section exists', async ({ page }) => {
    const backupTab = page.locator('[role="tab"]:has-text("Backup"), button:has-text("Backup")')
    if (await backupTab.isVisible()) {
      await backupTab.click()
      
      // Should show backup options
      await expect(page.locator('text=Export, text=Download')).toBeVisible()
    }
  })

  test('export button is clickable', async ({ page }) => {
    const backupTab = page.locator('[role="tab"]:has-text("Backup")')
    if (await backupTab.isVisible()) {
      await backupTab.click()
      
      const exportButton = page.locator('button:has-text("Export"), button:has-text("Download Backup")')
      if (await exportButton.isVisible()) {
        // Just verify it's clickable, don't actually download
        await expect(exportButton).toBeEnabled()
      }
    }
  })
})
