# React Frontend Documentation

## Framework & Dependencies

### Core
- **React**: 18.3.1
- **React DOM**: 18.3.1
- **TypeScript**: ~5.6.3
- **Vite**: ^6.0.1 (build tool)

### Routing & State
- **React Router DOM**: ^7.0.1
- **Zustand**: ^5.0.1 (state management)
- **TanStack React Query**: ^5.60.0 (server state)
- **TanStack React Virtual**: ^3.13.13 (virtualization)

### Forms & Validation
- **React Hook Form**: ^7.53.2
- **@hookform/resolvers**: ^3.9.0
- **Zod**: ^3.23.8 (schema validation)

### UI & Styling
- **Tailwind CSS**: ^3.4.15
- **Lucide React**: ^0.460.0 (icons)
- **clsx**: ^2.1.1 (className utilities)
- **tailwind-merge**: ^2.5.5 (merge Tailwind classes)

### HTTP & Notifications
- **Axios**: ^1.7.7
- **React Hot Toast**: ^2.4.1 (notifications)
- **date-fns**: ^4.1.0 (date formatting)

### Development
- **ESLint**: ^9.15.0
- **TypeScript ESLint**: ^8.15.0
- **@vitejs/plugin-react**: ^4.3.4
- **Autoprefixer**: ^10.4.20
- **PostCSS**: ^8.4.49

## Project Structure

```
frontend/
├── src/
│   ├── components/          # React components
│   │   ├── ui/              # Reusable UI components
│   │   ├── Layout.tsx       # Main layout component
│   │   └── ErrorBoundary.tsx
│   ├── pages/               # Page components
│   ├── services/            # API service layer
│   │   └── api.ts          # Axios client and API methods
│   ├── stores/              # Zustand stores
│   │   ├── authStore.ts
│   │   └── themeStore.ts
│   ├── types/               # TypeScript type definitions
│   │   └── index.ts
│   ├── lib/                 # Utility functions
│   │   ├── utils.ts        # General utilities
│   │   └── validations.ts  # Zod schemas
│   ├── hooks/               # Custom React hooks
│   ├── App.tsx              # Root component
│   ├── main.tsx             # Entry point
│   └── index.css            # Global styles
├── public/                  # Static assets
├── dist/                    # Build output
├── index.html               # HTML template
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── postcss.config.js
```

## Pages

All pages are lazy-loaded for code splitting. Located in `src/pages/`.

### DashboardPage (`src/pages/DashboardPage.tsx`)

**Purpose**: Main dashboard showing overview statistics

**Features**:
- Items count
- Upcoming reminders
- Overdue reminders
- Incomplete todos
- Quick actions

### ItemsPage (`src/pages/ItemsPage.tsx`)

**Purpose**: List and manage household items

**Features**:
- Filter by category
- Search items
- Create new item
- View item details
- Delete items

### ItemDetailPage (`src/pages/ItemDetailPage.tsx`)

**Purpose**: Detailed view of a single item

**Features**:
- Item information (make, model, serial number, etc.)
- Parts list (replacement and consumable)
- Maintenance logs
- Reminders
- Files and images
- Edit item
- Upload manual
- AI suggestions

### SmartAddPage (`src/pages/SmartAddPage.tsx`)

**Purpose**: Add items using AI image analysis

**Features**:
- Upload image or enter search query
- AI-powered product identification
- Category suggestions
- Quick item creation from AI results

### ReportsPage (`src/pages/ReportsPage.tsx`)

**Purpose**: List and manage AI-generated reports

**Features**:
- List all saved reports
- View report details
- Create new report
- Edit report metadata
- Delete reports
- Regenerate reports

### ReportCreatorPage (`src/pages/ReportCreatorPage.tsx`)

**Purpose**: Create new reports by chatting with Claude

**Features**:
- Chat interface with Claude
- Available data types information
- Suggested questions for report creation
- Generate report from conversation
- Save report with name and description

### ReportViewerPage (`src/pages/ReportViewerPage.tsx`)

**Purpose**: Display generated reports with fresh data

**Features**:
- View report HTML in iframe
- Edit report metadata
- Regenerate report
- Delete report
- Reports fetch fresh data from API when viewed

### VendorsPage (`src/pages/VendorsPage.tsx`)

**Purpose**: Manage vendors/service providers

**Features**:
- List vendors
- Create vendor
- Edit vendor
- Delete vendor
- Search vendors

### RemindersPage (`src/pages/RemindersPage.tsx`)

**Purpose**: Manage maintenance reminders

**Features**:
- List reminders (pending, overdue, upcoming)
- Create reminder
- Snooze reminder
- Complete reminder
- Filter by status

### TodosPage (`src/pages/TodosPage.tsx`)

**Purpose**: Manage todo tasks

**Features**:
- List todos (incomplete, completed)
- Create todo
- Complete todo
- Filter by priority
- Filter by user

### SettingsPage (`src/pages/SettingsPage.tsx`)

**Purpose**: Application settings

**Features**:
- Storage settings (local/S3)
- Email settings (SMTP/Mailgun/SendGrid/SES/Cloudflare)
- AI settings (Claude/OpenAI/Gemini/Local)
- Test connections
- Backup/restore

### RoomsPage (`src/pages/RoomsPage.tsx`)

**Purpose**: Manage rooms and track paint colors

**Features**:
- List rooms with featured images
- Create room
- Edit room with inline image upload
- Delete room
- Upload room photos (using ImageUpload component)
- Add/edit paint colors using PaintColorForm component
- Real-time color picker with hex/RGB/CMYK sync
- Analyze wall colors from photos using AI
- Navigate to room detail page by clicking room card

**Photo Management**:
- Photos are uploaded using the ImageUpload component with `fileableType="location"`
- Photos are displayed in the room cards using `featured_image`
- All room images are loaded via the `images` relationship
- Photo uploads invalidate both `['locations']` and `['locations', id]` queries

**Paint Color Management**:
- Uses PaintColorForm component for consistent form handling
- ColorPicker component for real-time hex/RGB/CMYK synchronization
- CMYK support for professional paint matching

### RoomDetailPage (`src/pages/RoomDetailPage.tsx`)

**Purpose**: Detailed view of a single room showing room information, photos, paint colors, and items in that room

**Features**:
- Room header with name, icon, featured image, items count, and edit/delete buttons
- Edit room modal for updating name, icon, and notes
- Room photos gallery with ImageUpload component for uploading/managing photos
- Paint colors section with:
  - Color swatches showing hex/RGB values
  - Add/edit paint colors using PaintColorForm component
  - AI-powered wall color analysis from uploaded photos
  - Delete paint colors
- Items in this room section with:
  - Cards view (grid layout similar to ItemsPage)
  - List view (compact list similar to ItemsPage)
  - View toggle (grid/list buttons)
  - Links to each item's detail page
- Back button to rooms list
- Filters items by `location_id` using `items.list({ location_id: roomId })`

**Component Reuse**:
- Reuses `ImageUpload` component from Items for photo management
- Reuses `PaintColorForm` component for consistent paint color handling
- Reuses card/list view patterns from `ItemsPage.tsx`
- Reuses `ItemCard` and `ItemList` components for consistent styling

### ProfilePage (`src/pages/ProfilePage.tsx`)

**Purpose**: User profile management

**Features**:
- View profile
- Update name and email
- Change password
- Upload avatar

### LoginPage (`src/pages/LoginPage.tsx`)

**Purpose**: User authentication

**Features**:
- Email/password login
- Link to registration
- Error handling

### RegisterPage (`src/pages/RegisterPage.tsx`)

**Purpose**: New user registration

**Features**:
- Create account
- Create household
- Auto-login after registration

### HelpPage (`src/pages/HelpPage.tsx`)

**Purpose**: Help and documentation

## Components

### Layout (`src/components/Layout.tsx`)

**Purpose**: Main application layout with sidebar navigation

**Features**:
- Sidebar navigation (collapsible on mobile)
- Top bar with breadcrumbs
- User profile section
- Theme toggle
- Logout functionality
- Prefetching common data (categories, locations)
- Background preloading of page chunks

**Navigation Items**:
- Dashboard (/)
- Items (/items)
- Smart Add (/smart-add) - AI-powered product identification with image gallery import and try again feature
- Rooms (/rooms) - Room management and paint color tracking
- Vendors (/vendors)
- Reminders (/reminders)
- Todos (/todos)
- Settings (/settings)
- Help (/help)

### ErrorBoundary (`src/components/ErrorBoundary.tsx`)

**Purpose**: Catches React errors and displays fallback UI

### PaintColorForm (`src/components/PaintColorForm.tsx`)

**Purpose**: Reusable form component for adding/editing paint colors

**Features**:
- Form state management
- All paint color fields (brand, name, hex, RGB, CMYK, URLs)
- Integration with ColorPicker component
- Create and update modes
- Consistent UI across RoomsPage and RoomDetailPage

**Props**:
- `paintColor?: PaintColor | null` - Existing paint color for edit mode
- `onSubmit: (data: Partial<PaintColor>) => void` - Submit handler
- `onCancel: () => void` - Cancel handler
- `isLoading?: boolean` - Loading state for submit button

### UI Components (`src/components/ui/`)

All UI components follow a consistent design system (Untitled UI style).

#### Avatar (`Avatar.tsx`)
- User avatar display
- Fallback initials
- Image support

#### Badge (`Badge.tsx`)
- Status badges
- Color variants

#### Button (`Button.tsx`)
- Primary, secondary, ghost variants
- Size variants (sm, md, lg)
- Loading state
- Icon support

#### Card (`Card.tsx`)
- Container component
- Header, body, footer sections

#### Checkbox (`Checkbox.tsx`)
- Form checkbox
- Label support

#### DocumentUpload (`DocumentUpload.tsx`)
- File upload component
- PDF preview
- Drag and drop

#### Dropdown (`Dropdown.tsx`)
- Dropdown menu
- Trigger and content slots

#### EmptyState (`EmptyState.tsx`)
- Empty state display
- Icon, title, description

#### Icon (`Icon.tsx`)
- Icon wrapper component
- Size variants
- Lucide icons

#### ImageUpload (`ImageUpload.tsx`)
- Image upload component
- Drag and drop support
- Preview gallery
- Featured image support
- Camera button on mobile
- Multiple file upload
- Query invalidation on upload

#### ColorPicker (`ColorPicker.tsx`)
- Real-time color selection
- Hex code input with validation
- RGB inputs (R, G, B) with 0-255 range
- CMYK inputs (C, M, Y, K) with 0-100% range
- Bidirectional synchronization between all color formats
- Native HTML color picker integration
- Color swatch preview

#### Input (`Input.tsx`)
- Text input
- Error states
- Label support

#### Modal (`Modal.tsx`)
- Modal dialog
- Open/close state
- Overlay

#### Select (`Select.tsx`)
- Dropdown select
- Search support
- Option groups

#### Skeleton (`Skeleton.tsx`)
- Loading skeleton
- Various shapes

#### Tabs (`Tabs.tsx`)
- Tab navigation
- Tab panels

#### Textarea (`Textarea.tsx`)
- Multi-line text input
- Error states

#### ThemeToggle (`ThemeToggle.tsx`)
- Light/dark/auto theme switching
- System preference detection

#### Toggle (`Toggle.tsx`)
- Toggle switch
- Checked/unchecked states

#### Tooltip (`Tooltip.tsx`)
- Tooltip display
- Positioning

**Component Index** (`src/components/ui/index.ts`): Exports all UI components

## Stores (Zustand)

### authStore (`src/stores/authStore.ts`)

**State**:
- `user`: User | null
- `isAuthenticated`: boolean
- `isLoading`: boolean

**Actions**:
- `setUser(user)`: Sets user
- `login(email, password)`: Authenticates user
- `register(data)`: Registers new user
- `logout()`: Logs out user
- `checkAuth()`: Checks authentication status

**Usage**: Used throughout app for authentication state

### themeStore (`src/stores/themeStore.ts`)

**State**:
- `mode`: 'light' | 'dark' | 'auto'
- `resolvedTheme`: 'light' | 'dark'

**Actions**:
- `setMode(mode)`: Sets theme mode
- `initializeTheme()`: Initializes theme from localStorage and system preference

**Storage**: Persists to localStorage key 'housarr-theme'

**Features**:
- System preference detection
- Auto mode listens to system changes
- Applies dark class to document root

## Services

### API Service (`src/services/api.ts`)

**Axios Instance**:
- Base URL: `/api`
- Timeout: 30000ms (30 seconds)
- Credentials: true (cookies)
- Content-Type: application/json

**Interceptors**:
- Response interceptor: Redirects to /login on 401 (unless already on auth pages)

**API Methods**:

#### Dashboard
- `dashboard.get()`: Gets dashboard stats
- `dashboard.prefetch()`: Gets categories and locations (batched)

#### Auth
- `auth.csrf()`: Gets CSRF cookie
- `auth.register(data)`: Registers user
- `auth.login(data)`: Logs in
- `auth.logout()`: Logs out
- `auth.getUser()`: Gets authenticated user
- `auth.invite(data)`: Invites user

#### Household
- `household.get()`: Gets household
- `household.update(data)`: Updates household

#### Users
- `users.list()`: Lists users
- `users.update(id, data)`: Updates user
- `users.delete(id)`: Deletes user

#### Categories
- `categories.list()`: Lists categories
- `categories.create(data)`: Creates category
- `categories.update(id, data)`: Updates category
- `categories.delete(id)`: Deletes category

#### Locations
- `locations.list()`: Lists locations (with images and featured_image)
- `locations.get(id)`: Gets location (with images, featured_image, paint_colors)
- `locations.create(data)`: Creates location
- `locations.update(id, data)`: Updates location
- `locations.delete(id)`: Deletes location

#### Vendors
- `vendors.list()`: Lists vendors
- `vendors.get(id)`: Gets vendor
- `vendors.create(data)`: Creates vendor
- `vendors.update(id, data)`: Updates vendor
- `vendors.delete(id)`: Deletes vendor

#### Items
- `items.list(params?)`: Lists items (category_id, location_id, search filters)
- `items.listMinimal()`: Lightweight list (id, name only)
- `items.get(id)`: Gets item
- `items.create(data)`: Creates item
- `items.update(id, data)`: Updates item
- `items.delete(id)`: Deletes item
- `items.uploadManual(id, file)`: Uploads manual
- `items.analyzeImage(file?, query?, categoryNames?)`: Analyzes image (90s timeout)
- `items.searchManual(make, model)`: Searches for manual
- `items.downloadManual(itemId, make, model)`: Downloads manual (180s timeout)
- `items.searchManualUrls(itemId, make, model, step)`: Searches manual URLs (30-45s timeout)
- `items.downloadManualFromUrl(itemId, url, make, model)`: Downloads from URL (120s timeout)
- `items.getAISuggestions(itemId, make, model, category?)`: Gets AI suggestions
- `items.queryAISuggestions(itemId, make, model, category?)`: Combined AI query (60s timeout)
- `items.suggestParts(itemId, make, model, category?)`: Gets AI-suggested parts (60s timeout)

#### Parts
- `parts.list(itemId)`: Lists parts for item
- `parts.create(data)`: Creates part
- `parts.createBatch(itemId, partsData)`: Creates multiple parts
- `parts.update(id, data)`: Updates part
- `parts.delete(id)`: Deletes part

#### Maintenance Logs
- `maintenanceLogs.list(itemId)`: Lists logs for item
- `maintenanceLogs.create(data)`: Creates log
- `maintenanceLogs.update(id, data)`: Updates log
- `maintenanceLogs.delete(id)`: Deletes log

#### Reminders
- `reminders.list(params?)`: Lists reminders (status, overdue, upcoming filters)
- `reminders.get(id)`: Gets reminder
- `reminders.create(data)`: Creates reminder
- `reminders.update(id, data)`: Updates reminder
- `reminders.delete(id)`: Deletes reminder
- `reminders.snooze(id, days?)`: Snoozes reminder
- `reminders.complete(id)`: Completes reminder

#### Todos
- `todos.list(params?)`: Lists todos (completed, incomplete, priority, user_id filters)
- `todos.get(id)`: Gets todo
- `todos.create(data)`: Creates todo
- `todos.update(id, data)`: Updates todo
- `todos.delete(id)`: Deletes todo
- `todos.complete(id)`: Completes todo

#### Notifications
- `notifications.list(params?)`: Lists notifications (unread filter)
- `notifications.markRead(ids?)`: Marks notifications as read

#### Files
- `files.upload(file, fileableType, fileableId, isFeatured?)`: Uploads file
- `files.setFeatured(id)`: Sets file as featured
- `files.delete(id)`: Deletes file

#### Backup
- `backup.export()`: Exports backup (returns Blob)
- `backup.import(file)`: Imports backup

#### Profile
- `profile.get()`: Gets profile
- `profile.update(data)`: Updates profile
- `profile.updatePassword(data)`: Updates password

#### Settings
- `settings.get()`: Gets all settings
- `settings.update(data)`: Updates settings
- `settings.checkStorage()`: Checks storage config
- `settings.checkEmail()`: Checks email config
- `settings.checkAI()`: Checks AI config
- `settings.testAI(settings?)`: Tests AI connection

#### Reports
- `reports.list()`: Lists all reports for household
- `reports.create(conversationHistory, name, description?)`: Creates new report (timeout: 180s)
- `reports.get(id)`: Gets report metadata
- `reports.view(id)`: Gets report HTML content (returns text)
- `reports.update(id, data)`: Updates report name/description
- `reports.delete(id)`: Deletes report
- `reports.regenerate(id, conversationHistory)`: Regenerates report (timeout: 180s)
- `reports.getDataTypes()`: Returns available data types and endpoints

#### Chat
- `chat.checkAvailability()`: Checks if AI chat is available
- `chat.send(message, history?)`: Sends chat message (timeout: 120s)
- `chat.sendWithItem(itemId, message, history?, options?)`: Sends chat with item context
- `chat.getSuggestedQuestions(itemId)`: Gets suggested questions for item

## Types

All TypeScript types defined in `src/types/index.ts`:

### User
```typescript
interface User {
  id: number
  household_id: number
  name: string
  email: string
  role: 'admin' | 'member'
  email_verified_at: string | null
  created_at: string
  updated_at: string
  household?: Household
  avatar?: FileRecord
}
```

### Household
```typescript
interface Household {
  id: number
  name: string
  images?: FileRecord[]
  featured_image?: FileRecord
  created_at: string
  updated_at: string
}
```

### Category
```typescript
interface Category {
  id: number
  household_id: number | null
  name: string
  icon: string | null
  color: string | null
  created_at: string
  updated_at: string
}
```

### Vendor
```typescript
interface Vendor {
  id: number
  household_id: number
  category_id: number | null
  name: string
  company: string | null
  phone: string | null
  email: string | null
  website: string | null
  address: string | null
  notes: string | null
  category?: Category
  images?: FileRecord[]
  logo?: FileRecord
  created_at: string
  updated_at: string
}
```

### Location
```typescript
interface Location {
  id: number
  household_id: number
  name: string
  icon: string | null
  notes: string | null
  items_count?: number
  images?: FileRecord[]
  featured_image?: FileRecord
  paint_colors?: PaintColor[]
  created_at: string
  updated_at: string
}
```

### Item
```typescript
interface Item {
  id: number
  household_id: number
  category_id: number | null
  vendor_id: number | null
  location_id: number | null
  name: string
  make: string | null
  model: string | null
  serial_number: string | null
  install_date: string | null
  location: string | null
  notes: string | null
  warranty_years: number | null
  maintenance_interval_months: number | null
  typical_lifespan_years: number | null
  category?: Category
  vendor?: Vendor
  location_obj?: Location
  parts?: Part[]
  maintenanceLogs?: MaintenanceLog[]
  reminders?: Reminder[]
  files?: FileRecord[]
  images?: FileRecord[]
  featured_image?: FileRecord
  created_at: string
  updated_at: string
}
```

### Part
```typescript
interface Part {
  id: number
  item_id: number
  name: string
  part_number: string | null
  type: 'replacement' | 'consumable'
  purchase_url: string | null
  purchase_urls: {
    repairclinic?: string
    amazon?: string
    home_depot?: string
    primary?: string
  } | null
  price: number | null
  notes: string | null
  images?: FileRecord[]
  featured_image?: FileRecord
  created_at: string
  updated_at: string
}
```

### MaintenanceLog
```typescript
interface MaintenanceLog {
  id: number
  item_id: number
  vendor_id: number | null
  type: 'service' | 'repair' | 'replacement' | 'inspection'
  date: string
  cost: number | null
  notes: string | null
  attachments: string[] | null
  vendor?: Vendor
  created_at: string
  updated_at: string
}
```

### Reminder
```typescript
interface Reminder {
  id: number
  household_id: number
  user_id: number | null
  item_id: number | null
  part_id: number | null
  title: string
  description: string | null
  due_date: string
  repeat_interval: number | null
  status: 'pending' | 'snoozed' | 'completed' | 'dismissed'
  last_notified_at: string | null
  item?: Item
  part?: Part
  user?: User
  created_at: string
  updated_at: string
}
```

### Todo
```typescript
interface Todo {
  id: number
  household_id: number
  user_id: number | null
  item_id: number | null
  title: string
  description: string | null
  priority: 'low' | 'medium' | 'high'
  due_date: string | null
  completed_at: string | null
  item?: Item
  user?: User
  created_at: string
  updated_at: string
}
```

### Notification
```typescript
interface Notification {
  id: number
  user_id: number
  type: string
  data: Record<string, unknown>
  read_at: string | null
  created_at: string
  updated_at: string
}
```

### Report
```typescript
interface Report {
  id: number
  name: string
  description: string | null
  created_at: string
  updated_at: string
  created_by?: {
    id: number
    name: string
  } | null
}
```

### ReportDataTypes
```typescript
interface ReportDataTypes {
  items: { description: string; endpoint: string; fields: string[] }
  reminders: { description: string; endpoint: string; fields: string[] }
  todos: { description: string; endpoint: string; fields: string[] }
  maintenance_logs: { description: string; endpoint: string; fields: string[] }
  vendors: { description: string; endpoint: string; fields: string[] }
  locations: { description: string; endpoint: string; fields: string[] }
  dashboard: { description: string; endpoint: string; fields: string[] }
}
```

### FileRecord
```typescript
interface FileRecord {
  id: number
  household_id: number
  fileable_type: string
  fileable_id: number
  disk: string
  path: string
  original_name: string
  mime_type: string | null
  size: number | null
  is_featured: boolean
  url: string
  created_at: string
  updated_at: string
}
```

### Other Types
- `FileableType`: 'item' | 'maintenance_log' | 'part' | 'vendor' | 'location' | 'household' | 'user'
- `AuthResponse`: { user: User }
- `ApiResponse<T>`: { data: T }

## Routing

### Route Structure (`src/App.tsx`)

**Public Routes**:
- `/login`: LoginPage
- `/register`: RegisterPage

**Protected Routes** (require authentication):
- `/`: DashboardPage (index)
- `/items`: ItemsPage
- `/items/:id`: ItemDetailPage
- `/smart-add`: SmartAddPage
- `/rooms`: RoomsPage
- `/rooms/:id`: RoomDetailPage
- `/vendors`: VendorsPage
- `/reminders`: RemindersPage
- `/todos`: TodosPage
- `/settings`: SettingsPage
- `/profile`: ProfilePage
- `/help`: HelpPage

**Route Protection**:
- `ProtectedRoute` component checks authentication
- Redirects to `/login` if not authenticated
- Shows loading state during auth check

**Code Splitting**:
- All pages are lazy-loaded with `React.lazy()`
- Suspense fallback shows loading spinner
- Background preloading after initial render

## State Management

### Global State (Zustand)
- `authStore`: Authentication state
- `themeStore`: Theme preferences

### Server State (React Query)
- All API data managed by React Query
- Automatic caching and refetching
- Query keys organized by resource
- Prefetching for common data

**Query Keys**:
- `['dashboard']`
- `['categories']`
- `['locations']`
- `['items']`, `['items', id]`
- `['vendors']`, `['vendors', id]`
- `['reminders']`
- `['todos']`
- `['notifications']`
- `['profile']`
- `['settings']`

## Styling

### Tailwind CSS Configuration (`tailwind.config.js`)

**Design System**: Untitled UI

**Color Palette**:
- **Primary**: Purple shades (25-950)
- **Gray**: Neutral grays (25-950)
- **Error**: Red shades (25-950)
- **Warning**: Orange shades (25-950)
- **Success**: Green shades (25-950)

**Typography Scale**:
- Display sizes: display-2xl, display-xl, display-lg, display-md, display-sm, display-xs
- Text sizes: text-xl, text-lg, text-md, text-sm, text-xs

**Shadows**:
- xs, sm, md, lg, xl, 2xl, 3xl
- Focus rings: ring, ring-gray, ring-error

**Border Radius**:
- xxs (2px) through 4xl (24px)
- full (9999px)

**Spacing**: 4px grid system (0.5 = 2px, 1 = 4px, etc.)

**Animations**:
- fade-in, fade-up, scale-in, slide-down

**Dark Mode**: Class-based (`dark:` prefix)

### Global Styles (`src/index.css`)

- Tailwind directives
- Custom CSS variables
- Base styles
- Dark mode styles

## Build Configuration

### Vite (`vite.config.ts`)

**Plugins**: @vitejs/plugin-react

**Aliases**:
- `@`: `./src`

**Dev Server**:
- Port: 5173
- Host: true (accessible from network)
- Proxy:
  - `/api` → `http://host.docker.internal:8000`
  - `/sanctum` → `http://host.docker.internal:8000`

### TypeScript (`tsconfig.json`)

**Target**: ES2020

**Module**: ESNext

**JSX**: react-jsx

**Strict Mode**: Enabled

**Path Aliases**: `@/*` → `./src/*`

**No Emit**: true (Vite handles compilation)

### PostCSS (`postcss.config.js`)

**Plugins**: tailwindcss, autoprefixer

## Development Scripts

- `npm run dev`: Start Vite dev server
- `npm run build`: Build for production (TypeScript + Vite)
- `npm run lint`: Run ESLint
- `npm run preview`: Preview production build

## Performance Optimizations

1. **Code Splitting**: All pages lazy-loaded
2. **Prefetching**: Common data prefetched on layout mount
3. **Background Preloading**: Page chunks preloaded during idle time
4. **React Query Caching**: Server state cached with staleTime
5. **Virtual Scrolling**: TanStack React Virtual for long lists
6. **Image Optimization**: Lazy loading, featured images
7. **Bundle Optimization**: Vite tree-shaking and minification
