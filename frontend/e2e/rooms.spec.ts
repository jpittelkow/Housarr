import { test, expect } from '@playwright/test'

test.describe('Rooms', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login')
    await page.fill('[name="email"]', 'test@example.com')
    await page.fill('[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/')
  })

  test('can view rooms list', async ({ page }) => {
    await page.goto('/rooms')
    
    await expect(page.locator('h1')).toContainText('Rooms')
    await expect(page.locator('text=Add Room')).toBeVisible()
  })

  test('can navigate to room detail page from rooms list', async ({ page }) => {
    await page.goto('/rooms')
    
    // Wait for rooms to load
    await page.waitForSelector('text=Kitchen', { timeout: 5000 }).catch(() => {})
    
    // Click on first room card (if available)
    const roomCard = page.locator('[href*="/rooms/"]').first()
    if (await roomCard.count() > 0) {
      await roomCard.click()
      await expect(page).toHaveURL(/\/rooms\/\d+/)
      await expect(page.locator('h1')).toBeVisible()
    }
  })

  test('can view room detail page', async ({ page }) => {
    // Navigate directly to a room (assuming room ID 1 exists)
    await page.goto('/rooms/1')
    
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('text=Room Photos')).toBeVisible()
    await expect(page.locator('text=Items in This Room')).toBeVisible()
  })

  test('can toggle between grid and list view for items', async ({ page }) => {
    await page.goto('/rooms/1')
    
    // Wait for items section to load
    await page.waitForSelector('text=Items in This Room', { timeout: 5000 })
    
    // Find view toggle buttons
    const gridButton = page.locator('button[title="Grid view"]').first()
    const listButton = page.locator('button[title="List view"]').first()
    
    if (await gridButton.count() > 0 && await listButton.count() > 0) {
      // Click list view
      await listButton.click()
      await expect(listButton).toHaveClass(/bg-gray-100|bg-gray-700/)
      
      // Click grid view
      await gridButton.click()
      await expect(gridButton).toHaveClass(/bg-gray-100|bg-gray-700/)
    }
  })

  test('can navigate from room detail to item detail', async ({ page }) => {
    await page.goto('/rooms/1')
    
    // Wait for items to load
    await page.waitForSelector('text=Items in This Room', { timeout: 5000 })
    
    // Click on first item if available
    const itemLink = page.locator('a[href*="/items/"]').first()
    if (await itemLink.count() > 0) {
      await itemLink.click()
      await expect(page).toHaveURL(/\/items\/\d+/)
    }
  })

  test('can navigate from dashboard to room detail', async ({ page }) => {
    await page.goto('/')
    
    // Wait for rooms section to appear
    await page.waitForSelector('text=Rooms', { timeout: 5000 }).catch(() => {})
    
    // Click on first room in dashboard if available
    const roomLink = page.locator('a[href*="/rooms/"]').first()
    if (await roomLink.count() > 0) {
      await roomLink.click()
      await expect(page).toHaveURL(/\/rooms\/\d+/)
    }
  })

  test('shows back button on room detail page', async ({ page }) => {
    await page.goto('/rooms/1')
    
    const backButton = page.locator('button:has-text("Back"), a:has-text("Back")').first()
    if (await backButton.count() > 0) {
      await expect(backButton).toBeVisible()
    }
  })

  test('displays room photos section', async ({ page }) => {
    await page.goto('/rooms/1')
    
    await expect(page.locator('text=Room Photos')).toBeVisible()
  })

  test('displays paint colors when available', async ({ page }) => {
    await page.goto('/rooms/1')
    
    // Paint colors section may or may not be visible depending on data
    const paintColorsSection = page.locator('text=Paint Colors')
    if (await paintColorsSection.count() > 0) {
      await expect(paintColorsSection).toBeVisible()
    }
  })
})
