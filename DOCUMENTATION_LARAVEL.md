# Laravel Backend Documentation

## Framework & Dependencies

- **Laravel**: 11.0
- **PHP**: ^8.2 (minimum requirement)
- **Laravel Sanctum**: ^4.0 (authentication)
- **Laravel Tinker**: ^2.9 (development)

### Development Dependencies
- FakerPHP/Faker: ^1.23
- Laravel Pint: ^1.13 (code formatting)
- Laravel Sail: ^1.26
- Mockery: ^1.6
- PHPUnit: ^11.0
- Spatie Laravel Ignition: ^2.4

## Project Structure

```
backend/
├── app/
│   ├── Actions/              # Action classes for complex operations
│   │   └── Items/
│   ├── Http/
│   │   ├── Controllers/       # API controllers
│   │   │   └── Api/
│   │   ├── Middleware/        # Custom middleware
│   │   ├── Requests/          # Form request validation
│   │   │   └── Api/
│   │   └── Resources/          # API resource transformers
│   ├── Jobs/                  # Queue jobs
│   ├── Models/                # Eloquent models
│   ├── Notifications/         # Notification classes
│   ├── Policies/             # Authorization policies
│   ├── Providers/            # Service providers
│   └── Services/              # Business logic services
│       └── Storage/
├── bootstrap/
│   ├── app.php                # Application bootstrap
│   └── cache/                 # Cached config files
├── config/                    # Configuration files
├── database/
│   ├── factories/             # Model factories
│   ├── migrations/            # Database migrations
│   └── seeders/               # Database seeders
├── public/                    # Public web root
├── routes/
│   ├── api.php                # API routes
│   └── web.php                # Web routes
├── storage/                   # Storage directory
└── tests/                     # Test files
```

## Models

### User Model (`app/Models/User.php`)

**Traits**: `HasApiTokens`, `HasFactory`, `Notifiable`

**Fillable Fields**:
- `household_id` (foreign key)
- `name`
- `email`
- `password` (hashed)
- `role` (admin/member)

**Hidden Fields**:
- `password`
- `remember_token`

**Casts**:
- `email_verified_at`: datetime
- `password`: hashed

**Relationships**:
- `household()`: BelongsTo Household
- `reminders()`: HasMany Reminder
- `todos()`: HasMany Todo
- `notifications()`: HasMany Notification
- `files()`: MorphMany File
- `avatar()`: MorphOne File (featured image)

**Methods**:
- `isAdmin()`: Returns true if role is 'admin'

### Household Model (`app/Models/Household.php`)

**Fillable Fields**:
- `name`

**Relationships**:
- `users()`: HasMany User
- `categories()`: HasMany Category
- `vendors()`: HasMany Vendor
- `items()`: HasMany Item
- `reminders()`: HasMany Reminder
- `todos()`: HasMany Todo
- `allFiles()`: HasMany File
- `files()`: MorphMany File
- `images()`: MorphMany File (image mime types)
- `featuredImage()`: MorphOne File (featured image)

### Item Model (`app/Models/Item.php`)

**Fillable Fields**:
- `household_id`
- `category_id` (nullable)
- `vendor_id` (nullable)
- `location_id` (nullable)
- `name`
- `make` (nullable)
- `model` (nullable)
- `serial_number` (nullable)
- `install_date` (nullable, date)
- `location` (nullable, string)
- `notes` (nullable)
- `warranty_years` (nullable)
- `maintenance_interval_months` (nullable)
- `typical_lifespan_years` (nullable)

**Casts**:
- `install_date`: date

**Relationships**:
- `household()`: BelongsTo Household
- `category()`: BelongsTo Category
- `vendor()`: BelongsTo Vendor
- `location()`: BelongsTo Location
- `parts()`: HasMany Part
- `replacementParts()`: HasMany Part (type='replacement')
- `consumableParts()`: HasMany Part (type='consumable')
- `maintenanceLogs()`: HasMany MaintenanceLog
- `reminders()`: HasMany Reminder
- `todos()`: HasMany Todo
- `files()`: MorphMany File
- `images()`: MorphMany File (image mime types)
- `featuredImage()`: MorphOne File (featured image)

**Scopes**:
- `scopeSearch($query, string $search)`: Searches name, make, model, location, serial_number

### Part Model (`app/Models/Part.php`)

**Fillable Fields**:
- `item_id`
- `name`
- `part_number` (nullable)
- `type` (enum: 'replacement', 'consumable')
- `purchase_url` (nullable)
- `purchase_urls` (nullable, JSON array)
- `price` (nullable, decimal:2)
- `notes` (nullable)

**Casts**:
- `price`: decimal:2
- `purchase_urls`: array

**Relationships**:
- `item()`: BelongsTo Item
- `reminders()`: HasMany Reminder
- `files()`: MorphMany File
- `images()`: MorphMany File (image mime types)
- `featuredImage()`: MorphOne File (featured image)

**Scopes**:
- `scopeReplacement($query)`: Filters type='replacement'
- `scopeConsumable($query)`: Filters type='consumable'

### Category Model (`app/Models/Category.php`)

**Fillable Fields**:
- `household_id` (nullable, null = global category)
- `name`
- `icon` (nullable)
- `color` (nullable)

**Relationships**:
- `household()`: BelongsTo Household
- `items()`: HasMany Item
- `vendors()`: HasMany Vendor

**Scopes**:
- `scopeForHousehold($query, $householdId)`: Returns categories where household_id is null OR matches

### Vendor Model (`app/Models/Vendor.php`)

**Fillable Fields**:
- `household_id`
- `category_id` (nullable)
- `name`
- `company` (nullable)
- `phone` (nullable)
- `email` (nullable)
- `website` (nullable)
- `address` (nullable)
- `notes` (nullable)

**Relationships**:
- `household()`: BelongsTo Household
- `category()`: BelongsTo Category
- `items()`: HasMany Item
- `maintenanceLogs()`: HasMany MaintenanceLog
- `files()`: MorphMany File
- `images()`: MorphMany File (image mime types)
- `logo()`: MorphOne File (featured image)

**Scopes**:
- `scopeSearch($query, string $search)`: Searches name, company, email, phone

### Location Model (`app/Models/Location.php`)

**Fillable Fields**:
- `household_id`
- `name`
- `icon` (nullable)

**Relationships**:
- `household()`: BelongsTo Household
- `items()`: HasMany Item
- `files()`: MorphMany File
- `images()`: MorphMany File (image mime types)
- `featuredImage()`: MorphOne File (featured image)

### MaintenanceLog Model (`app/Models/MaintenanceLog.php`)

**Fillable Fields**:
- `item_id`
- `vendor_id` (nullable)
- `type` (enum: 'service', 'repair', 'replacement', 'inspection')
- `date` (date)
- `cost` (nullable, decimal:2)
- `notes` (nullable)
- `attachments` (nullable, JSON array)

**Casts**:
- `date`: date
- `cost`: decimal:2
- `attachments`: array

**Relationships**:
- `item()`: BelongsTo Item
- `vendor()`: BelongsTo Vendor
- `files()`: MorphMany File

### Reminder Model (`app/Models/Reminder.php`)

**Fillable Fields**:
- `household_id`
- `user_id` (nullable)
- `item_id` (nullable)
- `part_id` (nullable)
- `title`
- `description` (nullable)
- `due_date` (date)
- `repeat_interval` (nullable, days)
- `status` (enum: 'pending', 'snoozed', 'completed', 'dismissed')
- `last_notified_at` (nullable, datetime)

**Casts**:
- `due_date`: date
- `last_notified_at`: datetime

**Relationships**:
- `household()`: BelongsTo Household
- `user()`: BelongsTo User
- `item()`: BelongsTo Item
- `part()`: BelongsTo Part

**Scopes**:
- `scopePending($query)`: Filters status='pending'
- `scopeOverdue($query)`: Pending reminders with due_date < now
- `scopeUpcoming($query, $days = 7)`: Pending reminders due within X days

**Methods**:
- `complete()`: Sets status to 'completed', creates new reminder if repeat_interval set
- `snooze(int $days = 1)`: Sets status to 'snoozed', adds days to due_date

### Todo Model (`app/Models/Todo.php`)

**Fillable Fields**:
- `household_id`
- `user_id` (nullable)
- `item_id` (nullable)
- `title`
- `description` (nullable)
- `priority` (enum: 'low', 'medium', 'high')
- `due_date` (nullable, date)
- `completed_at` (nullable, datetime)

**Casts**:
- `due_date`: date
- `completed_at`: datetime

**Relationships**:
- `household()`: BelongsTo Household
- `user()`: BelongsTo User
- `item()`: BelongsTo Item

**Scopes**:
- `scopeIncomplete($query)`: Filters completed_at is null
- `scopeCompleted($query)`: Filters completed_at is not null
- `scopeOverdue($query)`: Incomplete todos with due_date < today
- `scopeUpcoming($query, int $days = 7)`: Incomplete todos due within X days
- `scopeHighPriority($query)`: Filters priority='high'

**Methods**:
- `complete()`: Sets completed_at to now
- `uncomplete()`: Sets completed_at to null
- `isCompleted()`: Returns true if completed_at is not null

### Notification Model (`app/Models/Notification.php`)

**Fillable Fields**:
- `user_id`
- `type` (string)
- `data` (JSON array)
- `read_at` (nullable, datetime)

**Casts**:
- `data`: array
- `read_at`: datetime

**Relationships**:
- `user()`: BelongsTo User

**Scopes**:
- `scopeUnread($query)`: Filters read_at is null

**Methods**:
- `markAsRead()`: Sets read_at to now

### File Model (`app/Models/File.php`)

**Fillable Fields**:
- `household_id`
- `fileable_type` (polymorphic)
- `fileable_id` (polymorphic)
- `disk` (storage disk name)
- `path` (file path on disk)
- `original_name`
- `mime_type` (nullable)
- `size` (nullable, integer)
- `is_featured` (boolean)

**Casts**:
- `is_featured`: boolean
- `size`: integer

**Appends**:
- `url` (computed attribute)

**Relationships**:
- `household()`: BelongsTo Household
- `fileable()`: MorphTo (polymorphic)

**Methods**:
- `getUrlAttribute()`: Returns Storage::disk($disk)->url($path), cached per instance
- `deleteFile()`: Deletes file from storage disk

### Setting Model (`app/Models/Setting.php`)

**Fillable Fields**:
- `household_id` (nullable)
- `key` (string)
- `value` (nullable, encrypted if is_encrypted=true)
- `is_encrypted` (boolean)

**Casts**:
- `is_encrypted`: boolean

**Relationships**:
- `household()`: BelongsTo Household

**Static Methods**:
- `get(string $key, ?int $householdId = null, mixed $default = null)`: Get setting with caching (runtime + persistent cache, 5min TTL)
- `set(string $key, mixed $value, ?int $householdId = null, bool $encrypted = false)`: Set setting and clear cache
- `getMany(array $keys, ?int $householdId = null)`: Get multiple settings efficiently
- `clearCache(?int $householdId, ?string $key = null)`: Clear cache for setting(s)
- `clearRuntimeCache()`: Clear in-memory cache

**Accessors/Mutators**:
- `getValueAttribute()`: Decrypts value if is_encrypted
- `setValueAttribute()`: Encrypts value before saving if is_encrypted

## Controllers

All controllers are in `app/Http/Controllers/Api/` namespace.

### AuthController

**Methods**:
- `register(RegisterRequest)`: Creates household and admin user, logs in
- `login(LoginRequest)`: Authenticates user with rate limiting (5 attempts per minute)
- `logout(Request)`: Logs out user, invalidates session
- `user(Request)`: Returns authenticated user
- `invite(InviteUserRequest)`: Creates new user in same household

### DashboardController

**Methods**:
- `index(Request)`: Returns dashboard stats (items count, upcoming/overdue reminders, incomplete todos)
- `prefetch(Request)`: Returns categories and locations in single request for cache warming

### HouseholdController

**Methods**:
- `show(Request)`: Returns user's household
- `update(Request)`: Updates household name

### UserController

**Methods**:
- `index(Request)`: Lists users in household
- `update(Request, User)`: Updates user (role, name, email)
- `destroy(Request, User)`: Deletes user

### CategoryController

**Methods**: Standard CRUD (index, store, show, update, destroy)

### LocationController

**Methods**: Standard CRUD (index, store, show, update, destroy)

### VendorController

**Methods**: Standard CRUD (index, store, show, update, destroy)

### ItemController

**Methods**:
- `index(Request)`: Lists items with filters (category_id, search, limit, minimal mode)
- `store(StoreItemRequest)`: Creates item
- `show(Request, Item)`: Returns item with all relationships
- `update(UpdateItemRequest, Item)`: Updates item
- `destroy(Request, Item)`: Deletes item
- `analyzeImage(Request)`: Analyzes uploaded image using AI
- `uploadManual(Request, Item)`: Uploads manual file
- `downloadManual(Request, Item)`: Searches and downloads manual
- `searchManualUrls(Request, Item)`: Searches for manual URLs (repositories/ai/web)
- `downloadManualFromUrl(Request, Item)`: Downloads manual from URL
- `getAISuggestions(Request, Item)`: Gets AI suggestions for warranty/maintenance
- `checkAIConfig(Request, Item)`: Checks if AI is configured
- `queryAISuggestions(Request, Item)`: Combined AI query with provider info
- `suggestParts(Request, Item)`: Gets AI-suggested parts

### PartController

**Methods**:
- `index(Request, Item)`: Lists parts for item (replacement and consumable)
- `store(StorePartRequest)`: Creates part
- `storeBatch(Request)`: Creates multiple parts at once
- `update(Request, Part)`: Updates part
- `destroy(Request, Part)`: Deletes part

### MaintenanceLogController

**Methods**:
- `index(Request, Item)`: Lists maintenance logs for item
- `store(StoreMaintenanceLogRequest)`: Creates maintenance log
- `update(Request, MaintenanceLog)`: Updates maintenance log
- `destroy(Request, MaintenanceLog)`: Deletes maintenance log

### ReminderController

**Methods**: Standard CRUD plus:
- `snooze(Request, Reminder)`: Snoozes reminder
- `complete(Request, Reminder)`: Completes reminder

### TodoController

**Methods**: Standard CRUD plus:
- `complete(Request, Todo)`: Completes todo

### NotificationController

**Methods**:
- `index(Request)`: Lists notifications (optional unread filter)
- `markRead(Request)`: Marks notifications as read

### FileController

**Methods**:
- `store(Request)`: Uploads file (fileable_type, fileable_id, is_featured)
- `setFeatured(Request, File)`: Sets file as featured
- `destroy(Request, File)`: Deletes file

### SettingController

**Methods**:
- `index(Request)`: Returns all settings with key status
- `update(Request)`: Updates settings
- `checkStorage(Request)`: Checks storage configuration
- `checkEmail(Request)`: Checks email configuration
- `checkAI(Request)`: Checks AI configuration
- `testAI(Request)`: Tests AI connection

### BackupController

**Methods**:
- `export(Request)`: Exports all household data as JSON
- `import(Request)`: Imports household data from JSON

### ProfileController

**Methods**:
- `show(Request)`: Returns user profile
- `update(Request)`: Updates profile (name, email)
- `updatePassword(Request)`: Updates password

## Routes

All API routes are defined in `routes/api.php`.

### Public Routes (Rate Limited: 10/minute)
- `POST /api/auth/register`
- `POST /api/auth/login`

### Protected Routes (Rate Limited: 60/minute, requires auth:sanctum)

**Auth**:
- `POST /api/auth/logout`
- `GET /api/auth/user`
- `POST /api/auth/invite`

**Profile**:
- `GET /api/profile`
- `PATCH /api/profile`
- `PUT /api/profile/password`

**Dashboard**:
- `GET /api/dashboard`
- `GET /api/dashboard/prefetch`

**Household**:
- `GET /api/household`
- `PATCH /api/household`

**Users**:
- `GET /api/users`
- `PATCH /api/users/{user}`
- `DELETE /api/users/{user}`

**Categories**:
- `GET /api/categories`
- `POST /api/categories`
- `GET /api/categories/{category}`
- `PATCH /api/categories/{category}`
- `DELETE /api/categories/{category}`

**Locations**:
- `GET /api/locations`
- `POST /api/locations`
- `GET /api/locations/{location}`
- `PATCH /api/locations/{location}`
- `DELETE /api/locations/{location}`

**Vendors**:
- `GET /api/vendors`
- `POST /api/vendors`
- `GET /api/vendors/{vendor}`
- `PATCH /api/vendors/{vendor}`
- `DELETE /api/vendors/{vendor}`

**Items**:
- `POST /api/items/analyze-image`
- `GET /api/items`
- `POST /api/items`
- `GET /api/items/{item}`
- `PATCH /api/items/{item}`
- `DELETE /api/items/{item}`
- `POST /api/items/{item}/manual`
- `POST /api/items/{item}/download-manual`
- `POST /api/items/{item}/search-manual-urls`
- `POST /api/items/{item}/download-manual-url`
- `POST /api/items/{item}/ai-suggestions`
- `GET /api/items/{item}/ai-config`
- `POST /api/items/{item}/ai-query`
- `POST /api/items/{item}/suggest-parts`

**Parts**:
- `GET /api/items/{item}/parts`
- `POST /api/parts`
- `POST /api/parts/batch`
- `PATCH /api/parts/{part}`
- `DELETE /api/parts/{part}`

**Maintenance Logs**:
- `GET /api/items/{item}/logs`
- `POST /api/maintenance-logs`
- `PATCH /api/maintenance-logs/{maintenanceLog}`
- `DELETE /api/maintenance-logs/{maintenanceLog}`

**Reminders**:
- `GET /api/reminders`
- `POST /api/reminders`
- `GET /api/reminders/{reminder}`
- `PATCH /api/reminders/{reminder}`
- `DELETE /api/reminders/{reminder}`
- `POST /api/reminders/{reminder}/snooze`
- `POST /api/reminders/{reminder}/complete`

**Todos**:
- `GET /api/todos`
- `POST /api/todos`
- `GET /api/todos/{todo}`
- `PATCH /api/todos/{todo}`
- `DELETE /api/todos/{todo}`
- `POST /api/todos/{todo}/complete`

**Notifications**:
- `GET /api/notifications`
- `POST /api/notifications/mark-read`

**Settings**:
- `GET /api/settings`
- `PATCH /api/settings`
- `GET /api/settings/storage`
- `GET /api/settings/email`
- `GET /api/settings/ai`
- `POST /api/settings/ai/test`

**Files** (Rate Limited: 30/minute):
- `POST /api/files`
- `POST /api/files/{file}/featured`
- `DELETE /api/files/{file}`

**Backup** (Rate Limited: 5/minute):
- `GET /api/backup/export`
- `POST /api/backup/import`

## Policies

All policies are in `app/Policies/` namespace. Policies check `household_id` matching for authorization.

**Policies**:
- `HouseholdPolicy`: viewAny, view, update
- `UserPolicy`: viewAny, view, update, delete
- `CategoryPolicy`: viewAny, view, create, update, delete
- `LocationPolicy`: viewAny, view, create, update, delete
- `VendorPolicy`: viewAny, view, create, update, delete
- `ItemPolicy`: viewAny, view, create, update, delete
- `PartPolicy`: viewAny, view, create, update, delete
- `MaintenanceLogPolicy`: viewAny, view, create, update, delete
- `ReminderPolicy`: viewAny, view, create, update, delete
- `TodoPolicy`: viewAny, view, create, update, delete

All policies use `Gate::authorize()` in controllers.

## Services

### AIService (`app/Services/AIService.php`)

**Purpose**: Provides AI integration for multiple providers (Claude, OpenAI, Gemini, Local)

**Constructor**: `__construct(?int $householdId = null)`

**Static Methods**:
- `forHousehold(?int $householdId)`: Creates instance for household

**Public Methods**:
- `isAvailable()`: Checks if AI is configured
- `getProvider()`: Returns provider name
- `getModel()`: Returns model name (with defaults)
- `complete(string $prompt, array $options = [])`: Sends completion request
- `completeWithError(string $prompt, array $options = [])`: Returns response and error
- `analyzeImage(string $base64Image, string $mimeType, string $prompt, array $options = [])`: Analyzes image

**Supported Providers**:
- `claude`: Anthropic API (default model: claude-sonnet-4-20250514)
- `openai`: OpenAI API (default model: gpt-4o, supports custom base_url)
- `gemini`: Google Gemini API (default model: gemini-1.5-pro)
- `local`: Local models via Ollama or OpenAI-compatible API (default model: llama3)

**Settings Keys**:
- `ai_provider`, `ai_model`
- `anthropic_api_key`
- `openai_api_key`, `openai_base_url`
- `gemini_api_key`, `gemini_base_url`
- `local_base_url`, `local_model`, `local_api_key`

### StorageService (`app/Services/StorageService.php`)

**Purpose**: Manages file storage (local or S3) per household

**Static Methods**:
- `getDiskForHousehold(?int $householdId)`: Returns configured Filesystem disk
- `getDiskName(?int $householdId)`: Returns disk name ('public' or 'household_s3')
- `isConfigured(?int $householdId)`: Checks if storage is configured
- `testConnection(?int $householdId)`: Tests storage connection

**Storage Drivers**:
- `local`: Uses Laravel 'public' disk
- `s3`: Dynamically configures S3 disk with household credentials

**S3 Settings Keys**:
- `storage_driver`, `aws_access_key_id`, `aws_secret_access_key`, `aws_default_region`, `aws_bucket`, `aws_endpoint`

### MailService (`app/Services/MailService.php`)

**Purpose**: Configures mailer per household

**Static Methods**:
- `configureForHousehold(?int $householdId)`: Configures mailer for household
- `getDriverName(?int $householdId)`: Returns driver name
- `isConfigured(?int $householdId)`: Checks if email is configured

**Supported Drivers**:
- `smtp`: Standard SMTP
- `mailgun`: Mailgun API
- `sendgrid`: SendGrid via SMTP
- `ses`: Amazon SES
- `cloudflare`: Cloudflare Email Workers
- `log`: Logs emails to file (default)

**Settings Keys**: Various mail_* and provider-specific keys

### ManualSearchService (`app/Services/ManualSearchService.php`)

**Purpose**: Searches and downloads product manuals from the web

**Constructor**: `__construct(?int $householdId = null)`

**Public Methods**:
- `setHouseholdId(int $householdId)`: Sets household for AI service
- `searchForManual(string $make, string $model)`: Multi-strategy search
- `searchManualRepositoriesPublic(string $make, string $model)`: Repository search
- `getAISuggestedUrlsPublic(string $make, string $model)`: AI URL suggestions
- `searchWithDuckDuckGoPublic(string $make, string $model)`: DuckDuckGo search
- `findPdfOnPage(string $pageUrl, string $make, string $model)`: Finds PDF on page
- `downloadPdf(string $url)`: Downloads PDF
- `findAndDownloadManual(string $make, string $model)`: Complete search and download

**Search Strategies**:
1. Manual repositories (Manualslib, manufacturer sites)
2. AI-assisted URL suggestions
3. DuckDuckGo search with multiple query formats

## Actions

### AnalyzeItemImageAction (`app/Actions/Items/AnalyzeItemImageAction.php`)

**Purpose**: Analyzes product image using AI to identify make, model, type

**Method**: `execute(?UploadedFile $file, ?array $categories = [], ?int $householdId = null, ?string $query = null)`

**Returns**: Array of results with make, model, type, confidence

**Process**:
1. Gets AIService for household
2. Converts image to base64 if provided
3. Builds prompt with category context
4. Calls AI analyzeImage or complete
5. Parses and normalizes JSON response
6. Sorts by confidence

### DownloadItemManualAction (`app/Actions/Items/DownloadItemManualAction.php`)

**Purpose**: Downloads manual PDF and attaches to item

**Method**: `execute(Item $item, string $make, string $model, int $householdId)`

**Process**:
1. Uses ManualSearchService to find and download manual
2. Saves PDF to storage using StorageService
3. Creates File record attached to item
4. Returns file resource

## Middleware

### AddCacheHeaders (`app/Http/Middleware/AddCacheHeaders.php`)

**Purpose**: Adds cache headers to responses (currently empty implementation)

## Resources

API resources transform models for JSON responses. All in `app/Http/Resources/`:
- `UserResource`
- `HouseholdResource`
- `CategoryResource`
- `LocationResource`
- `VendorResource`
- `ItemResource`
- `PartResource`
- `MaintenanceLogResource`
- `ReminderResource`
- `TodoResource`
- `NotificationResource`
- `FileResource`

## Requests

Form request validation classes in `app/Http/Requests/Api/`:
- `LoginRequest`
- `RegisterRequest`
- `InviteUserRequest`
- `StoreItemRequest`
- `UpdateItemRequest`
- `StorePartRequest`
- `StoreMaintenanceLogRequest`
- `StoreReminderRequest`
- `UpdateReminderRequest`
- `StoreTodoRequest`
- `StoreVendorRequest`

## Database

### Migrations

All migrations in `database/migrations/`:

**Core Tables**:
- `0001_01_01_000000_create_households_table.php`
- `0001_01_01_000001_create_users_table.php`
- `0001_01_01_000002_create_cache_table.php`
- `0001_01_01_000003_create_jobs_table.php`
- `0001_01_01_000004_create_personal_access_tokens_table.php`

**Application Tables**:
- `2024_01_01_000005_create_categories_table.php`
- `2024_01_01_000006_create_vendors_table.php`
- `2024_01_01_000007_create_items_table.php`
- `2024_01_01_000008_create_parts_table.php`
- `2024_01_01_000009_create_maintenance_logs_table.php`
- `2024_01_01_000010_create_reminders_table.php`
- `2024_01_01_000011_create_todos_table.php`
- `2024_01_01_000012_create_notifications_table.php`
- `2024_01_01_000013_create_files_table.php`
- `2024_01_01_000015_create_locations_table.php`
- `2024_01_01_000016_create_settings_table.php`

**Modifications**:
- `2024_01_01_000014_add_performance_indexes.php`
- `2024_01_01_000017_add_is_featured_to_files_table.php`
- `2024_01_01_000018_add_additional_performance_indexes.php`
- `2024_01_01_000019_add_maintenance_fields_to_items_table.php`
- `2024_01_01_000020_change_purchase_url_to_json_on_parts_table.php`

### Schema Summary

**households**: id, name, timestamps

**users**: id, household_id, name, email, password, role, email_verified_at, remember_token, timestamps

**categories**: id, household_id (nullable), name, icon, color, timestamps

**vendors**: id, household_id, category_id (nullable), name, company, phone, email, website, address, notes, timestamps

**locations**: id, household_id, name, icon, timestamps

**items**: id, household_id, category_id (nullable), vendor_id (nullable), location_id (nullable), name, make, model, serial_number, install_date, location (string), notes, warranty_years, maintenance_interval_months, typical_lifespan_years, timestamps

**parts**: id, item_id, name, part_number, type (enum), purchase_url (nullable), purchase_urls (JSON), price, notes, timestamps

**maintenance_logs**: id, item_id, vendor_id (nullable), type (enum), date, cost, notes, attachments (JSON), timestamps

**reminders**: id, household_id, user_id (nullable), item_id (nullable), part_id (nullable), title, description, due_date, repeat_interval, status (enum), last_notified_at, timestamps

**todos**: id, household_id, user_id (nullable), item_id (nullable), title, description, priority (enum), due_date, completed_at, timestamps

**notifications**: id, user_id, type, data (JSON), read_at, timestamps

**files**: id, household_id, fileable_type, fileable_id, disk, path, original_name, mime_type, size, is_featured, timestamps

**settings**: id, household_id (nullable), key, value, is_encrypted, timestamps

**Indexes**: Performance indexes on foreign keys and commonly queried fields

## Configuration

### Database (`config/database.php`)

**Default Connection**: SQLite (`database/database.sqlite`)

**Supported Connections**:
- `sqlite`: SQLite database
- `mysql`: MySQL/MariaDB
- `pgsql`: PostgreSQL

**Redis Configuration**: Configured for cache and sessions

### Auth (`config/auth.php`)

**Guards**:
- `web`: Session-based
- `sanctum`: Sanctum token-based

**Provider**: `users` (Eloquent, User model)

### CORS (`config/cors.php`)

**Paths**: `['api/*', 'sanctum/csrf-cookie']`

**Allowed Origins**: From `CORS_ALLOWED_ORIGINS` env (default: `http://localhost:5173,http://localhost:3000`)

**Allowed Methods**: GET, POST, PUT, PATCH, DELETE, OPTIONS

**Supports Credentials**: true

### Sanctum (`config/sanctum.php`)

**Stateful Domains**: From `SANCTUM_STATEFUL_DOMAINS` env (includes localhost variants)

**Guard**: `['web']`

**Expiration**: 60 * 24 * 7 (7 days)

## Seeders

**DatabaseSeeder**: Main seeder

**UserSeeder**: Creates test users

**CategorySeeder**: Creates default categories
