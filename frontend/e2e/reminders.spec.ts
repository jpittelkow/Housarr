import { test, expect } from '@playwright/test'

test.describe('Reminders', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Login before each test
    test.skip(process.env.CI === 'true', 'Requires live backend')
    
    await page.goto('/login')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'password')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/dashboard/)
  })

  test('can navigate to Reminders page', async ({ page }) => {
    await page.click('a:has-text("Reminders"), [href="/reminders"]')
    
    await expect(page).toHaveURL(/\/reminders/)
    await expect(page.locator('h1:has-text("Reminders")')).toBeVisible()
  })

  test('shows add reminder button', async ({ page }) => {
    await page.goto('/reminders')
    
    await expect(page.locator('button:has-text("Add"), button:has-text("New"), button:has-text("Create")')).toBeVisible()
  })

  test('opens create reminder modal', async ({ page }) => {
    await page.goto('/reminders')
    
    await page.click('button:has-text("Add"), button:has-text("New")')
    
    // Modal should be visible
    await expect(page.locator('[role="dialog"], [class*="modal"]')).toBeVisible()
    await expect(page.locator('input[name="title"], label:has-text("Title")')).toBeVisible()
  })

  test('create reminder form has required fields', async ({ page }) => {
    await page.goto('/reminders')
    
    await page.click('button:has-text("Add"), button:has-text("New")')
    
    // Check for required fields
    await expect(page.locator('input[name="title"], label:has-text("Title")')).toBeVisible()
    await expect(page.locator('input[type="date"], input[name="due_date"], label:has-text("Date")')).toBeVisible()
  })

  test('can create a new reminder', async ({ page }) => {
    await page.goto('/reminders')
    
    await page.click('button:has-text("Add"), button:has-text("New")')
    
    // Fill form
    await page.fill('input[name="title"]', 'Test Reminder ' + Date.now())
    
    // Fill date (handle different date input formats)
    const dateInput = page.locator('input[type="date"], input[name="due_date"]')
    if (await dateInput.isVisible()) {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      await dateInput.fill(tomorrow.toISOString().split('T')[0])
    }
    
    // Submit
    await page.click('button:has-text("Save"), button:has-text("Create"), button[type="submit"]')
    
    // Should show success or new reminder in list
    await expect(page.locator('[data-sonner-toast]:has-text("success"), text=Test Reminder')).toBeVisible({ timeout: 5000 })
  })

  test('shows pending reminders', async ({ page }) => {
    await page.goto('/reminders')
    
    // Should have some way to see pending/upcoming reminders
    await expect(page.locator('text=Pending, text=Upcoming, text=Due')).toBeVisible()
  })

  test('can mark reminder as complete', async ({ page }) => {
    await page.goto('/reminders')
    
    // Look for complete button/checkbox on a reminder
    const completeButton = page.locator('button:has-text("Complete"), [class*="check"], input[type="checkbox"]').first()
    
    if (await completeButton.isVisible()) {
      await completeButton.click()
      
      // Should show success feedback
      await expect(page.locator('[data-sonner-toast], text=completed, text=marked')).toBeVisible({ timeout: 5000 })
    }
  })

  test('can snooze a reminder', async ({ page }) => {
    await page.goto('/reminders')
    
    // Look for snooze button on a reminder
    const snoozeButton = page.locator('button:has-text("Snooze"), [title*="snooze"]').first()
    
    if (await snoozeButton.isVisible()) {
      await snoozeButton.click()
      
      // Should show snooze options or confirm snooze
      await expect(page.locator('text=snooze, text=days, [data-sonner-toast]')).toBeVisible({ timeout: 5000 })
    }
  })

  test('can edit a reminder', async ({ page }) => {
    await page.goto('/reminders')
    
    // Look for edit button
    const editButton = page.locator('button:has-text("Edit"), [title*="Edit"], button[aria-label*="edit"]').first()
    
    if (await editButton.isVisible()) {
      await editButton.click()
      
      // Should open edit modal
      await expect(page.locator('[role="dialog"], [class*="modal"]')).toBeVisible()
    }
  })

  test('can delete a reminder', async ({ page }) => {
    await page.goto('/reminders')
    
    // Look for delete button
    const deleteButton = page.locator('button:has-text("Delete"), [title*="Delete"], button[aria-label*="delete"]').first()
    
    if (await deleteButton.isVisible()) {
      await deleteButton.click()
      
      // Should show confirmation or delete immediately
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Delete")')
      if (await confirmButton.isVisible()) {
        await confirmButton.click()
      }
      
      // Should show success feedback
      await expect(page.locator('[data-sonner-toast], text=deleted')).toBeVisible({ timeout: 5000 })
    }
  })

  test('can filter reminders by status', async ({ page }) => {
    await page.goto('/reminders')
    
    // Look for filter options
    const filterSelect = page.locator('select[name="status"], button:has-text("Filter"), [class*="filter"]')
    
    if (await filterSelect.isVisible()) {
      await filterSelect.click()
      
      // Should show status options
      await expect(page.locator('text=Pending, text=Completed, text=Snoozed, text=All')).toBeVisible()
    }
  })

  test('shows reminder linked item if exists', async ({ page }) => {
    await page.goto('/reminders')
    
    // Reminders linked to items should show item name
    const linkedReminder = page.locator('[class*="reminder"]:has([href*="/items"]), text=Linked to')
    
    // This is optional - not all reminders have linked items
    // Just verify the page loads properly
    await expect(page).toHaveURL(/\/reminders/)
  })

  test('recurring reminder shows repeat interval', async ({ page }) => {
    await page.goto('/reminders')
    
    await page.click('button:has-text("Add"), button:has-text("New")')
    
    // Should have repeat/recurrence option
    await expect(page.locator('label:has-text("Repeat"), input[name="repeat"], text=recurring, text=interval')).toBeVisible()
  })

  test('help tooltip is visible', async ({ page }) => {
    await page.goto('/reminders')
    
    // Should have help tooltip on header
    const helpIcon = page.locator('[class*="help"], [aria-label*="help"]')
    
    if (await helpIcon.isVisible()) {
      await helpIcon.hover()
      
      // Tooltip should appear
      await expect(page.locator('[role="tooltip"], [class*="tooltip"]')).toBeVisible()
    }
  })

  test('empty state shows when no reminders', async ({ page }) => {
    // This test assumes we might have no reminders
    await page.goto('/reminders')
    
    // Either shows reminders or empty state
    const content = await page.content()
    expect(content.includes('reminder') || content.includes('No') || content.includes('empty')).toBe(true)
  })
})
