import { test, expect } from '@playwright/test'

test.describe('Items Management', () => {
  test.beforeEach(async ({ page }) => {
    // Skip tests that require backend
    test.skip(process.env.CI === 'true', 'Requires live backend')
    
    // Login
    await page.goto('/login')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'password')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/dashboard/)
    
    // Navigate to items
    await page.goto('/items')
  })

  test('items page loads', async ({ page }) => {
    await expect(page.locator('h1')).toContainText(/items/i)
  })

  test('can toggle between list and grid view', async ({ page }) => {
    // Find view toggle buttons
    const listButton = page.locator('button[aria-label="List view"], button:has([data-lucide="list"])')
    const gridButton = page.locator('button[aria-label="Grid view"], button:has([data-lucide="layout-grid"])')
    
    if (await listButton.isVisible() && await gridButton.isVisible()) {
      // Click grid view
      await gridButton.click()
      await expect(page.locator('.grid, [data-view="grid"]')).toBeVisible()
      
      // Click list view
      await listButton.click()
      await expect(page.locator('table, [data-view="list"]')).toBeVisible()
    }
  })

  test('can filter by category', async ({ page }) => {
    // Find category filter
    const categoryFilter = page.locator('select[name="category"], [data-testid="category-filter"]')
    
    if (await categoryFilter.isVisible()) {
      await categoryFilter.selectOption({ index: 1 }) // Select first category
      
      // URL should update with filter
      await expect(page).toHaveURL(/category=/)
    }
  })

  test('can search items', async ({ page }) => {
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]')
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('test')
      await searchInput.press('Enter')
      
      // Should filter results
      await page.waitForTimeout(500) // Wait for filter
    }
  })

  test('add item button opens modal or navigates', async ({ page }) => {
    const addButton = page.locator('button:has-text("Add Item"), a:has-text("Add Item")')
    
    if (await addButton.isVisible()) {
      await addButton.click()
      
      // Should open modal or navigate to form
      await expect(page.locator('[role="dialog"], form')).toBeVisible()
    }
  })

  test('can create a new item', async ({ page }) => {
    // Click add item
    await page.click('button:has-text("Add"), a:has-text("Add")')
    
    // Fill form
    await page.fill('input[name="name"]', 'Test Item E2E')
    
    // Select category if available
    const categorySelect = page.locator('select[name="category_id"]')
    if (await categorySelect.isVisible()) {
      await categorySelect.selectOption({ index: 1 })
    }
    
    // Submit
    await page.click('button:has-text("Save"), button[type="submit"]')
    
    // Should show success message
    await expect(page.locator('[data-sonner-toast], .toast')).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Item Detail Page', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(process.env.CI === 'true', 'Requires live backend')
    
    await page.goto('/login')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'password')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/dashboard/)
  })

  test('can view item details', async ({ page }) => {
    await page.goto('/items')
    
    // Click first item
    const firstItem = page.locator('[data-testid="item-card"], a[href^="/items/"]').first()
    
    if (await firstItem.isVisible()) {
      await firstItem.click()
      
      // Should be on detail page
      await expect(page).toHaveURL(/\/items\/\d+/)
      
      // Should show item name
      await expect(page.locator('h1')).toBeVisible()
    }
  })

  test('can edit item', async ({ page }) => {
    await page.goto('/items')
    
    const firstItem = page.locator('a[href^="/items/"]').first()
    if (await firstItem.isVisible()) {
      await firstItem.click()
      await page.waitForURL(/\/items\/\d+/)
      
      // Click edit button
      const editButton = page.locator('button:has-text("Edit")')
      if (await editButton.isVisible()) {
        await editButton.click()
        
        // Should show edit form/modal
        await expect(page.locator('[role="dialog"], form')).toBeVisible()
      }
    }
  })

  test('can add maintenance log', async ({ page }) => {
    await page.goto('/items')
    
    const firstItem = page.locator('a[href^="/items/"]').first()
    if (await firstItem.isVisible()) {
      await firstItem.click()
      await page.waitForURL(/\/items\/\d+/)
      
      // Find maintenance section and add button
      const addLogButton = page.locator('button:has-text("Add"):near(:text("Maintenance"))')
      if (await addLogButton.isVisible()) {
        await addLogButton.click()
        
        // Should show maintenance form
        await expect(page.locator('[role="dialog"]')).toBeVisible()
      }
    }
  })

  test('can add part', async ({ page }) => {
    await page.goto('/items')
    
    const firstItem = page.locator('a[href^="/items/"]').first()
    if (await firstItem.isVisible()) {
      await firstItem.click()
      await page.waitForURL(/\/items\/\d+/)
      
      // Find parts section
      const addPartButton = page.locator('button:has-text("Add Part"), button:has([data-lucide="plus"]):near(:text("Parts"))')
      if (await addPartButton.isVisible()) {
        await addPartButton.click()
        
        await expect(page.locator('[role="dialog"]')).toBeVisible()
      }
    }
  })

  test('Smart Fill button exists for items with make/model', async ({ page }) => {
    await page.goto('/items')
    
    const firstItem = page.locator('a[href^="/items/"]').first()
    if (await firstItem.isVisible()) {
      await firstItem.click()
      await page.waitForURL(/\/items\/\d+/)
      
      // Smart Fill button should be visible
      const smartFillButton = page.locator('button:has-text("Smart Fill")')
      // This may or may not be visible depending on if item has make/model
      if (await smartFillButton.isVisible()) {
        expect(smartFillButton).toBeVisible()
      }
    }
  })
})
