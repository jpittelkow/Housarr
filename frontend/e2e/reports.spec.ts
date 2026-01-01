import { test, expect } from '@playwright/test'

test.describe('Reports Page', () => {
  test.beforeEach(async ({ page }) => {
    // Skip tests that require backend
    test.skip(process.env.CI === 'true', 'Requires live backend')
    
    // Login
    await page.goto('/login')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'password')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/dashboard/)
    
    // Navigate to reports
    await page.goto('/reports')
  })

  test('reports page loads without React errors', async ({ page }) => {
    // Listen for console errors, especially React rendering errors
    const errors: string[] = []
    const consoleErrors: string[] = []
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const errorText = msg.text()
        errors.push(errorText)
        consoleErrors.push(errorText)
      }
    })

    // Listen for page errors
    page.on('pageerror', error => {
      errors.push(error.message)
      consoleErrors.push(error.message)
    })

    // Navigate and wait for page to fully load
    await page.goto('/reports')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000) // Give React time to render
    
    // Check for React rendering errors - this is the critical check
    const reactErrors = errors.filter(e => 
      e.includes('Objects are not valid as a React child') ||
      e.includes('found: object with keys') ||
      e.includes('$$typeof') ||
      (e.includes('React.createElement') && e.includes('render')) ||
      e.includes('Element type is invalid')
    )
    
    // Fail test if React rendering errors found
    if (reactErrors.length > 0) {
      console.error('React rendering errors found:', reactErrors)
      throw new Error(`React rendering error detected: ${reactErrors.join('; ')}`)
    }
    
    expect(reactErrors).toHaveLength(0)
    
    // Page should load successfully
    await expect(page.locator('h1')).toContainText(/reports/i)
    
    // Verify page content renders correctly (not just blank)
    const pageContent = await page.locator('body').textContent()
    expect(pageContent).toBeTruthy()
    expect(pageContent?.length).toBeGreaterThan(0)
  })

  test('reports page displays correctly', async ({ page }) => {
    await expect(page.locator('h1')).toContainText(/reports/i)
    await expect(page.locator('text=AI-generated reports')).toBeVisible()
  })

  test('shows empty state when no reports exist', async ({ page }) => {
    // Listen for errors while checking empty state
    const errors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })
    page.on('pageerror', error => {
      errors.push(error.message)
    })

    await page.waitForLoadState('networkidle')
    
    // Check for React rendering errors
    const reactErrors = errors.filter(e => 
      e.includes('Objects are not valid as a React child') ||
      e.includes('found: object with keys') ||
      e.includes('$$typeof')
    )
    expect(reactErrors).toHaveLength(0)
    
    // Check for empty state message - should render without errors
    const emptyStateTitle = page.locator('text=No reports yet')
    const emptyStateDescription = page.locator('text=Create your first AI-powered report')
    
    // Empty state should be visible if no reports exist
    const hasReports = await page.locator('a[href^="/reports/"]:not([href="/reports/create"])').count() > 0
    
    if (!hasReports) {
      // Should show empty state
      await expect(emptyStateTitle).toBeVisible({ timeout: 5000 })
      
      // Should have create button in empty state
      const createButton = page.locator('button:has-text("Create Your First Report"), button:has-text("Create")')
      await expect(createButton.first()).toBeVisible()
    }
  })

  test('create new report button navigates to creator page', async ({ page }) => {
    const createButton = page.locator('button:has-text("Create New Report"), button:has-text("Create")')
    
    if (await createButton.isVisible()) {
      await createButton.click()
      await expect(page).toHaveURL(/\/reports\/create/)
    }
  })

  test('reports page has no console errors', async ({ page }) => {
    const errors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        // Filter out common non-critical errors
        const errorText = msg.text()
        if (
          !errorText.includes('favicon') &&
          !errorText.includes('404') &&
          !errorText.includes('Failed to load resource') &&
          !errorText.includes('net::ERR_') &&
          !errorText.includes('ChunkLoadError') // Vite HMR chunk errors
        ) {
          errors.push(errorText)
        }
      }
    })

    page.on('pageerror', error => {
      const errorMessage = error.message
      // Filter out non-critical errors
      if (
        !errorMessage.includes('favicon') &&
        !errorMessage.includes('ChunkLoadError')
      ) {
        errors.push(errorMessage)
      }
    })

    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000) // Give React time to render
    
    // Specifically check for React rendering errors
    const reactErrors = errors.filter(e => 
      e.includes('Objects are not valid as a React child') ||
      e.includes('found: object with keys') ||
      e.includes('$$typeof') ||
      e.includes('Element type is invalid')
    )
    
    if (reactErrors.length > 0) {
      console.error('React rendering errors:', reactErrors)
      throw new Error(`React rendering error: ${reactErrors.join('; ')}`)
    }
    
    // Should have no critical errors
    expect(errors).toHaveLength(0)
  })
})

test.describe('Report Creator Page', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(process.env.CI === 'true', 'Requires live backend')
    
    await page.goto('/login')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'password')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/dashboard/)
    
    await page.goto('/reports/create')
  })

  test('report creator page loads without React errors', async ({ page }) => {
    const errors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const errorText = msg.text()
        // Filter out non-critical errors
        if (
          !errorText.includes('favicon') &&
          !errorText.includes('ChunkLoadError')
        ) {
          errors.push(errorText)
        }
      }
    })

    page.on('pageerror', error => {
      const errorMessage = error.message
      if (!errorMessage.includes('favicon') && !errorMessage.includes('ChunkLoadError')) {
        errors.push(errorMessage)
      }
    })

    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000) // Give React time to render
    
    // Check for React rendering errors - this is critical
    const reactErrors = errors.filter(e => 
      e.includes('Objects are not valid as a React child') ||
      e.includes('found: object with keys') ||
      e.includes('$$typeof') ||
      e.includes('Element type is invalid') ||
      (e.includes('React.createElement') && e.includes('render'))
    )
    
    if (reactErrors.length > 0) {
      console.error('React rendering errors on creator page:', reactErrors)
      throw new Error(`React rendering error: ${reactErrors.join('; ')}`)
    }
    
    expect(reactErrors).toHaveLength(0)
    
    await expect(page.locator('h1')).toContainText(/create report/i)
    
    // Verify page content renders
    const pageContent = await page.locator('body').textContent()
    expect(pageContent).toBeTruthy()
  })

  test('shows chat interface', async ({ page }) => {
    // Should show chat window or AI assistant
    await expect(
      page.locator('text=Report Creator, text=Chat with Claude, text=AI Assistant')
    ).toBeVisible()
  })

  test('shows available data types info', async ({ page }) => {
    await expect(
      page.locator('text=Available Data, text=Items, text=Reminders, text=Todos')
    ).toBeVisible()
  })

  test('back button navigates to reports list', async ({ page }) => {
    const backButton = page.locator('button:has-text("Back"), a:has-text("Back")')
    
    if (await backButton.isVisible()) {
      await backButton.click()
      await expect(page).toHaveURL(/\/reports$/)
    }
  })
})

test.describe('Report Viewer Page', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(process.env.CI === 'true', 'Requires live backend')
    
    await page.goto('/login')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'password')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/dashboard/)
  })

  test('report viewer page loads without React errors', async ({ page }) => {
    // Try to navigate to a report (if any exist)
    await page.goto('/reports')
    
    // Check if there are any reports
    const reportLink = page.locator('a[href^="/reports/"]:not([href="/reports/create"])').first()
    
    if (await reportLink.isVisible()) {
      const errors: string[] = []
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text())
        }
      })

      page.on('pageerror', error => {
        errors.push(error.message)
      })

      await reportLink.click()
      await page.waitForLoadState('networkidle')
      
      // Check for React rendering errors - critical check
      const reactErrors = errors.filter(e => 
        e.includes('Objects are not valid as a React child') ||
        e.includes('found: object with keys') ||
        e.includes('$$typeof') ||
        e.includes('Element type is invalid') ||
        (e.includes('React.createElement') && e.includes('render'))
      )
      
      if (reactErrors.length > 0) {
        console.error('React rendering errors on viewer page:', reactErrors)
        throw new Error(`React rendering error: ${reactErrors.join('; ')}`)
      }
      
      expect(reactErrors).toHaveLength(0)
    }
  })
})

test.describe('Reports Navigation', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(process.env.CI === 'true', 'Requires live backend')
    
    await page.goto('/login')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'password')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/dashboard/)
  })

  test('reports link exists in navigation', async ({ page }) => {
    // Check sidebar for Reports link
    await expect(
      page.locator('nav a[href="/reports"], nav >> text=Reports')
    ).toBeVisible()
  })

  test('can navigate to reports from sidebar', async ({ page }) => {
    await page.click('nav a[href="/reports"], nav >> text=Reports')
    await expect(page).toHaveURL(/\/reports/)
    await expect(page.locator('h1')).toContainText(/reports/i)
  })
})
