import { useState, useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Search,
  Home,
  Package,
  Users,
  Bell,
  CheckSquare,
  Settings,
  User,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  Sparkles,
  FileText,
  Wrench,
  MapPin,
  MessageSquare,
} from '@/components/ui'

interface HelpSection {
  id: string
  title: string
  icon: React.ComponentType<{ className?: string }>
  description: string
  topics: HelpTopic[]
}

interface HelpTopic {
  question: string
  answer: string
}

const helpSections: HelpSection[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: Home,
    description: 'Your home base for monitoring your household at a glance.',
    topics: [
      {
        question: 'What does the Dashboard show?',
        answer: 'The Dashboard provides an overview of your household including total items tracked, upcoming maintenance reminders, overdue reminders needing attention, and open todos. It\'s designed to give you a snapshot of what needs attention.',
      },
      {
        question: 'What are the stat cards?',
        answer: 'Stat cards display key metrics: Total Items (all tracked items), Upcoming Reminders (maintenance due within 30 days), Overdue (past due items), and Open Todos (incomplete tasks). Hover over the help icon on each card for details.',
      },
      {
        question: 'How do I navigate from the Dashboard?',
        answer: 'Click "View all" on any section to go to that page. The sidebar provides quick access to all areas of the app. Your household name is shown in the header breadcrumb.',
      },
    ],
  },
  {
    id: 'smart-add',
    title: 'Smart Add (AI)',
    icon: Sparkles,
    description: 'Use AI to quickly identify and add products by photo or text search.',
    topics: [
      {
        question: 'What is Smart Add?',
        answer: 'Smart Add uses AI to identify products from photos or text searches. Upload a photo of an appliance label, or type a product name, and AI will identify the make, model, and type. Multiple AI agents work together for better accuracy.',
      },
      {
        question: 'How does the multi-agent AI work?',
        answer: 'Housarr can use multiple AI providers (Claude, OpenAI, Gemini, local models) simultaneously. When enabled, they analyze in parallel and synthesize results. You\'ll see which agents contributed and their confidence levels.',
      },
      {
        question: 'What happens after AI identifies a product?',
        answer: 'You\'ll see a list of possible matches with confidence scores. Select one, review the pre-filled details, and optionally: attach the uploaded photo as the featured image, and automatically search for the product manual online.',
      },
      {
        question: 'Why are some results more confident than others?',
        answer: 'Confidence depends on image quality, label visibility, and product recognition. When multiple AI agents agree on an identification, you\'ll see "X agents agree" which indicates higher reliability.',
      },
      {
        question: 'Can I use Smart Add without uploading a photo?',
        answer: 'Yes! You can type a product name, make, or model directly. The AI will search its knowledge to identify the product and may also find a product image to attach.',
      },
    ],
  },
  {
    id: 'items',
    title: 'Items & Inventory',
    icon: Package,
    description: 'Track everything in your home from appliances to furniture.',
    topics: [
      {
        question: 'What can I track as an Item?',
        answer: 'Items can be anything in your household: appliances (refrigerator, washer), furniture (couch, bed), systems (HVAC, water heater), electronics (TV, computer), vehicles, outdoor equipment, or any possession you want to track.',
      },
      {
        question: 'What information can I store for each item?',
        answer: 'Each item can include: name, make, model, serial number, category, location, install date, warranty years, maintenance interval, typical lifespan, vendor, photos/documents, parts, maintenance logs, and notes. AI can suggest warranty and maintenance info.',
      },
      {
        question: 'What is a Featured Image?',
        answer: 'The featured image is the main photo displayed for an item in lists and cards. Click the star icon on any uploaded image to set it as featured. When using Smart Add, the uploaded photo can automatically become the featured image.',
      },
      {
        question: 'How do I get AI suggestions for an item?',
        answer: 'On the item detail page, click "Get AI Suggestions" to have AI recommend warranty period, maintenance interval, and lifespan based on the product type. You can also ask AI to suggest replacement parts.',
      },
      {
        question: 'What\'s the difference between the list and grid view?',
        answer: 'List view shows items in a compact table format ideal for scanning many items. Grid view shows larger cards with featured images, better for visual browsing. Use the toggle in the top right to switch.',
      },
    ],
  },
  {
    id: 'parts',
    title: 'Parts & Consumables',
    icon: Wrench,
    description: 'Track replacement parts and consumables for your items.',
    topics: [
      {
        question: 'What are Parts?',
        answer: 'Parts are components that belong to an item. There are two types: Replacement parts (wear out over time, like capacitors or belts) and Consumable parts (regularly used up, like filters or batteries).',
      },
      {
        question: 'How do I add parts?',
        answer: 'On the item detail page, go to the Parts tab and click "Add Part". You can also click "Suggest Parts" to have AI recommend common parts for that product, complete with purchase links.',
      },
      {
        question: 'What are purchase URLs?',
        answer: 'Each part can have multiple purchase links to retailers like Amazon, Home Depot, and RepairClinic. AI-suggested parts automatically include search URLs for these stores based on the part number or search term.',
      },
      {
        question: 'Can I add images to parts?',
        answer: 'Yes! Parts can have their own images. When using AI part suggestions, you can search for a product image online and attach it directly to the part.',
      },
    ],
  },
  {
    id: 'maintenance',
    title: 'Maintenance Logs',
    icon: FileText,
    description: 'Keep a service history for all your items.',
    topics: [
      {
        question: 'What are Maintenance Logs?',
        answer: 'Maintenance logs are records of service, repairs, replacements, or inspections performed on an item. They create a complete service history for each item.',
      },
      {
        question: 'What information can I log?',
        answer: 'Each log includes: type (service, repair, replacement, inspection), date, cost, vendor who performed the work, parts used, and notes. You can also attach files like receipts or invoices.',
      },
      {
        question: 'How do I link parts to a maintenance log?',
        answer: 'When creating or editing a maintenance log, you can select which parts were used or replaced during the service. This helps track when parts were last changed.',
      },
      {
        question: 'Why track maintenance history?',
        answer: 'A complete service history helps with warranty claims, home resale value, identifying recurring problems, and knowing when service was last performed.',
      },
    ],
  },
  {
    id: 'locations',
    title: 'Locations',
    icon: MapPin,
    description: 'Organize items by where they are in your home.',
    topics: [
      {
        question: 'What are Locations?',
        answer: 'Locations represent physical areas in your home: rooms (Kitchen, Master Bedroom), zones (Upstairs, Basement), or outdoor areas (Garage, Backyard). Each item can be assigned to a location.',
      },
      {
        question: 'How do I create locations?',
        answer: 'Go to Settings > Locations to add, edit, or remove locations. Each location can have a custom icon and you can add a photo to visually identify the space.',
      },
      {
        question: 'How do locations help organize items?',
        answer: 'On the Items page, you can filter by location to see all items in a specific room. Location is also shown on item cards and in search results for quick identification.',
      },
    ],
  },
  {
    id: 'vendors',
    title: 'Vendors & Service Providers',
    icon: Users,
    description: 'Keep track of contractors, repair services, and suppliers.',
    topics: [
      {
        question: 'What is a Vendor?',
        answer: 'Vendors are service providers, contractors, or companies you work with for your home. Examples: plumber, electrician, HVAC technician, appliance store, landscaper, handyman.',
      },
      {
        question: 'What information can I store for vendors?',
        answer: 'Each vendor record includes: company name, contact person, phone, email, website, address, category/specialty, logo, and notes. You can link vendors to specific items and maintenance logs.',
      },
      {
        question: 'How do I link a vendor to an item or maintenance log?',
        answer: 'When editing an item, select a vendor from the dropdown to indicate who installed or services it. When logging maintenance, select the vendor who performed the work.',
      },
    ],
  },
  {
    id: 'reminders',
    title: 'Reminders & Maintenance',
    icon: Bell,
    description: 'Never miss important maintenance tasks or warranty expirations.',
    topics: [
      {
        question: 'What are Reminders for?',
        answer: 'Reminders help you track recurring maintenance (filter changes, inspections), one-time tasks (warranty expiration), or any date-based alerts. Link them to items or parts for context.',
      },
      {
        question: 'Can I set recurring reminders?',
        answer: 'Yes! Set a repeat interval (in days) and when you complete a reminder, the system automatically creates the next occurrence. Perfect for recurring maintenance like quarterly filter changes.',
      },
      {
        question: 'What do the reminder statuses mean?',
        answer: 'Pending: upcoming or due. Snoozed: postponed to a later date. Completed: finished. You can snooze a reminder to push it back by a number of days.',
      },
      {
        question: 'Can I attach reminders to specific items or parts?',
        answer: 'Yes! Link a reminder to an item (e.g., "HVAC Annual Service") or even a specific part (e.g., "Replace HVAC Filter"). This provides context and quick access to the related item.',
      },
    ],
  },
  {
    id: 'todos',
    title: 'Todos & Tasks',
    icon: CheckSquare,
    description: 'Manage your household task list and stay organized.',
    topics: [
      {
        question: 'What\'s the difference between Todos and Reminders?',
        answer: 'Todos are general tasks that may or may not have due dates—like a to-do list. Reminders are specifically date-based alerts, often recurring, designed for maintenance schedules.',
      },
      {
        question: 'How do priorities work?',
        answer: 'Todos can be marked as Low, Medium, or High priority. High priority items are shown with a red indicator. Use filters to focus on high-priority tasks first.',
      },
      {
        question: 'Can I assign todos to items?',
        answer: 'Yes, todos can be linked to specific items for context. For example, "Research replacement parts for dishwasher" linked to your dishwasher item.',
      },
    ],
  },
  {
    id: 'ai-chat',
    title: 'AI Assistant',
    icon: MessageSquare,
    description: 'Chat with AI about your items, manuals, and home maintenance.',
    topics: [
      {
        question: 'What is the AI Assistant?',
        answer: 'The floating chat button (bottom right) opens an AI assistant that can answer questions about home maintenance, your items, and even help with troubleshooting using your uploaded manuals.',
      },
      {
        question: 'How does item context work?',
        answer: 'When viewing an item\'s detail page, the AI can access that item\'s uploaded manuals, service history, and parts. Ask questions like "How do I clean the filter?" and it will reference the actual manual.',
      },
      {
        question: 'What can I ask the AI?',
        answer: 'General questions: home maintenance tips, repair advice, product recommendations. Item-specific: troubleshooting, manual lookups, maintenance procedures, part compatibility.',
      },
      {
        question: 'Which AI providers are supported?',
        answer: 'Configure AI providers in Settings: Claude (Anthropic), OpenAI (ChatGPT), Google Gemini, or local models (Ollama). You can enable multiple providers for better coverage.',
      },
    ],
  },
  {
    id: 'files',
    title: 'Files & Documents',
    icon: FileText,
    description: 'Upload and manage photos, manuals, receipts, and documents.',
    topics: [
      {
        question: 'What files can I upload?',
        answer: 'Supported formats: Images (JPG, PNG, GIF, WebP) and PDFs. Use photos for product images and visual records. Use PDFs for manuals, warranties, receipts, and documentation.',
      },
      {
        question: 'How does manual search work?',
        answer: 'Click "Find Manual" on an item to search for the product manual online. Housarr searches manual repositories, uses AI suggestions, and web search to find PDFs. Found manuals are automatically downloaded and attached.',
      },
      {
        question: 'What\'s the difference between display name and original name?',
        answer: 'Original name is the filename as uploaded. Display name is a custom label you can set for better organization. For example, rename "scan001.pdf" to "Warranty Certificate".',
      },
      {
        question: 'Where are files stored?',
        answer: 'By default, files are stored locally. In Settings > Storage, admins can configure S3-compatible storage (AWS S3, DigitalOcean Spaces, MinIO) for cloud storage.',
      },
    ],
  },
  {
    id: 'settings',
    title: 'Settings & Configuration',
    icon: Settings,
    description: 'Customize your household, manage categories, and configure services.',
    topics: [
      {
        question: 'What is a Household?',
        answer: 'A Household is your home profile containing all your items, vendors, and data. You can customize the household name and add a photo. All household members share the same data.',
      },
      {
        question: 'How do I manage Categories?',
        answer: 'Categories help organize items (Appliances, Furniture, HVAC, etc.). Go to Settings > Categories to add, edit, or remove categories. Each can have a custom icon and color.',
      },
      {
        question: 'How do I configure AI providers?',
        answer: 'Go to Settings > AI Configuration. Add API keys for Claude, OpenAI, or Gemini. Enable/disable each provider, set models, and designate a primary agent for synthesis. Test connections before use.',
      },
      {
        question: 'How do backups work?',
        answer: 'Go to Settings > Backup to export your data as a ZIP file. This includes all items, vendors, settings AND all your uploaded files (photos, manuals, documents). Import to restore everything.',
      },
      {
        question: 'How do I invite other household members?',
        answer: 'Admins can go to Settings > Users to invite new members. Set their role as Admin (full access) or Member (limited access). Each person has their own login credentials.',
      },
    ],
  },
  {
    id: 'profile',
    title: 'Profile & Account',
    icon: User,
    description: 'Manage your personal account settings and security.',
    topics: [
      {
        question: 'How do I change my password?',
        answer: 'Go to your Profile page (click your name in the sidebar) and use the "Change Password" section. Enter your current password and the new password twice to confirm.',
      },
      {
        question: 'How do I update my profile picture?',
        answer: 'On the Profile page, click the upload area under "Profile Photo" to select a new avatar. Supported formats: JPG, PNG, GIF, WebP.',
      },
      {
        question: 'What\'s the difference between Admin and Member roles?',
        answer: 'Admins can: invite/remove users, access backup/restore, configure AI and storage settings, delete the household. Members can use all features but cannot change household settings or manage users.',
      },
    ],
  },
]

function CollapsibleSection({ section, isOpen, onToggle, searchQuery }: {
  section: HelpSection
  isOpen: boolean
  onToggle: () => void
  searchQuery: string
}) {
  const Icon = section.icon

  const filteredTopics = useMemo(() => {
    if (!searchQuery) return section.topics
    const query = searchQuery.toLowerCase()
    return section.topics.filter(
      topic =>
        topic.question.toLowerCase().includes(query) ||
        topic.answer.toLowerCase().includes(query)
    )
  }, [section.topics, searchQuery])

  if (searchQuery && filteredTopics.length === 0) {
    return null
  }

  return (
    <Card className="overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
      >
        <CardHeader className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-900/30">
                <Icon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <CardTitle className="text-lg">{section.title}</CardTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{section.description}</p>
              </div>
            </div>
            {isOpen ? (
              <ChevronDown className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            ) : (
              <ChevronRight className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            )}
          </div>
        </CardHeader>
      </button>
      {isOpen && (
        <CardContent className="pt-0 pb-4">
          <div className="space-y-4 mt-2">
            {filteredTopics.map((topic, index) => (
              <div key={index} className="border-l-2 border-primary-200 dark:border-primary-800 pl-4">
                <h4 className="font-medium text-gray-900 dark:text-gray-50 flex items-start gap-2">
                  <HelpCircle className="h-4 w-4 text-primary-500 dark:text-primary-400 mt-0.5 flex-shrink-0" />
                  {topic.question}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 ml-6">
                  {topic.answer}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  )
}

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['dashboard']))

  const toggleSection = (id: string) => {
    setOpenSections(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const expandAll = () => {
    setOpenSections(new Set(helpSections.map(s => s.id)))
  }

  const collapseAll = () => {
    setOpenSections(new Set())
  }

  // Auto-expand sections when searching
  const effectiveOpenSections = searchQuery
    ? new Set(helpSections.map(s => s.id))
    : openSections

  const visibleSections = useMemo(() => {
    if (!searchQuery) return helpSections
    const query = searchQuery.toLowerCase()
    return helpSections.filter(section =>
      section.title.toLowerCase().includes(query) ||
      section.description.toLowerCase().includes(query) ||
      section.topics.some(
        topic =>
          topic.question.toLowerCase().includes(query) ||
          topic.answer.toLowerCase().includes(query)
      )
    )
  }, [searchQuery])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-5 border-b border-gray-200 dark:border-gray-800">
        <h1 className="text-display-sm font-semibold text-gray-900 dark:text-gray-50">Help & Documentation</h1>
        <p className="text-text-md text-gray-500 dark:text-gray-400 mt-1">
          Learn how to use Housarr to manage your home inventory, maintenance, and more.
        </p>
      </div>

      {/* Search and Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="search"
            placeholder="Search help topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        {!searchQuery && (
          <div className="flex gap-2">
            <button
              onClick={expandAll}
              className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
            >
              Expand all
            </button>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <button
              onClick={collapseAll}
              className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
            >
              Collapse all
            </button>
          </div>
        )}
      </div>

      {/* Quick Links */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">Quick links:</span>
            {helpSections.map(section => {
              const Icon = section.icon
              return (
                <button
                  key={section.id}
                  onClick={() => {
                    setOpenSections(new Set([section.id]))
                    document.getElementById(`section-${section.id}`)?.scrollIntoView({ behavior: 'smooth' })
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-300 transition-colors"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {section.title}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Help Sections */}
      <div className="space-y-4">
        {visibleSections.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <HelpCircle className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-50">No results found</h3>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                Try searching with different keywords or browse the sections below.
              </p>
              <button
                onClick={() => setSearchQuery('')}
                className="mt-4 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
              >
                Clear search
              </button>
            </CardContent>
          </Card>
        ) : (
          visibleSections.map(section => (
            <div key={section.id} id={`section-${section.id}`}>
              <CollapsibleSection
                section={section}
                isOpen={effectiveOpenSections.has(section.id)}
                onToggle={() => toggleSection(section.id)}
                searchQuery={searchQuery}
              />
            </div>
          ))
        )}
      </div>

      {/* Footer Help */}
      <Card className="bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800">
        <CardContent className="py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-medium text-primary-900 dark:text-primary-100">Need more help?</h3>
              <p className="text-sm text-primary-700 dark:text-primary-300 mt-1">
                Look for the <HelpCircle className="inline h-4 w-4" /> icons throughout the app for contextual help tooltips.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
