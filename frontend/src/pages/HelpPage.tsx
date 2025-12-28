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
        answer: 'The Dashboard provides an overview of your household including total items, upcoming maintenance reminders, pending todos, and quick access to recently added items. It\'s designed to give you a snapshot of what needs attention.',
      },
      {
        question: 'What are the stat cards?',
        answer: 'Stat cards display key metrics: Total Items (all tracked items), Upcoming Reminders (maintenance due soon), Pending Todos (incomplete tasks), and Vendors (service providers). Click any card to navigate to that section.',
      },
      {
        question: 'How do I customize my Dashboard?',
        answer: 'The Dashboard automatically updates based on your data. Add items, set reminders, and create todos to see your Dashboard populate with relevant information.',
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
        answer: 'Items can be anything in your household: appliances (refrigerator, washer), furniture (couch, bed), systems (HVAC, water heater), electronics (TV, computer), or any other possession you want to track.',
      },
      {
        question: 'What information can I store for each item?',
        answer: 'Each item can include: name, description, category, location, purchase date, purchase price, warranty expiration, model/serial numbers, manufacturer, vendor, photos/documents, and custom notes.',
      },
      {
        question: 'How do I organize items?',
        answer: 'Use Categories (e.g., Appliances, Furniture, Electronics) and Locations (e.g., Kitchen, Garage, Master Bedroom) to organize items. You can filter and search by these attributes.',
      },
      {
        question: 'Can I attach files to items?',
        answer: 'Yes! You can upload photos, receipts, manuals, warranty documents, and any other files. These are stored securely and accessible from the item detail page.',
      },
      {
        question: 'What is a Featured Image?',
        answer: 'The featured image is the main photo displayed for an item in lists and cards. Click the star icon on any uploaded image to set it as featured.',
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
        answer: 'Vendors are service providers, contractors, or companies you work with for your home. Examples: plumber, electrician, HVAC technician, appliance store, landscaper.',
      },
      {
        question: 'What information can I store for vendors?',
        answer: 'Each vendor record includes: company name, contact person, phone, email, website, address, category/specialty, and notes. You can also link vendors to specific items.',
      },
      {
        question: 'How do I link a vendor to an item?',
        answer: 'When editing an item, select a vendor from the dropdown. This is useful for tracking who installed, sold, or services that item.',
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
        answer: 'Reminders help you track recurring maintenance (filter changes, inspections), one-time tasks (warranty expiration), or any date-based alerts for your items.',
      },
      {
        question: 'Can I set recurring reminders?',
        answer: 'Yes! Reminders can be one-time or recurring. Set frequency (daily, weekly, monthly, yearly) and the system will automatically create the next occurrence when you complete one.',
      },
      {
        question: 'How do I get notified?',
        answer: 'Reminders appear on your Dashboard as they approach. Email notifications can be configured in Settings if your household has email configured.',
      },
      {
        question: 'Can I attach reminders to items?',
        answer: 'Yes, reminders can be linked to specific items. For example, create a "Change Filter" reminder for your HVAC system or "Annual Service" for your water heater.',
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
        answer: 'Todos are general tasks without specific due dates or recurrence (like a to-do list). Reminders are date-based alerts, often recurring, typically for maintenance schedules.',
      },
      {
        question: 'How do I organize todos?',
        answer: 'Todos can be marked with priority levels and categories. Use the filters to view pending, completed, or all todos.',
      },
      {
        question: 'Can I assign todos to items?',
        answer: 'Yes, todos can be linked to specific items. For example, "Research replacement parts" for a specific appliance.',
      },
    ],
  },
  {
    id: 'settings',
    title: 'Settings & Configuration',
    icon: Settings,
    description: 'Customize your household, manage categories, and configure preferences.',
    topics: [
      {
        question: 'What is a Household?',
        answer: 'A Household is your home profile containing all your items, vendors, and data. You can customize the household name and settings from the Settings page.',
      },
      {
        question: 'How do I manage Categories?',
        answer: 'Categories help organize items (Appliances, Furniture, etc.). Go to Settings > Categories to add, edit, or remove categories.',
      },
      {
        question: 'How do I manage Locations?',
        answer: 'Locations represent areas in your home (Kitchen, Garage, etc.). Go to Settings > Locations to manage them. Locations can be nested (e.g., "Upstairs > Master Bedroom").',
      },
      {
        question: 'How do I backup my data?',
        answer: 'Go to Settings > Backup to export your data. This creates a downloadable file with all your items, vendors, and settings that can be restored later.',
      },
      {
        question: 'Can I configure notifications?',
        answer: 'Yes, notification preferences can be set in Settings > Notifications. Configure email alerts for reminders, system updates, and more.',
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
        answer: 'Go to your Profile page (click your avatar in the sidebar) and use the "Change Password" section to update your password.',
      },
      {
        question: 'How do I update my profile picture?',
        answer: 'On the Profile page, click on your avatar or the upload area to select a new profile picture. Supported formats: JPG, PNG, GIF.',
      },
      {
        question: 'Can I change my email address?',
        answer: 'Yes, you can update your email on the Profile page. You may need to verify the new email address.',
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
        <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50">
                <Icon className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <CardTitle className="text-lg">{section.title}</CardTitle>
                <p className="text-sm text-gray-500 mt-0.5">{section.description}</p>
              </div>
            </div>
            {isOpen ? (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronRight className="h-5 w-5 text-gray-400" />
            )}
          </div>
        </CardHeader>
      </button>
      {isOpen && (
        <CardContent className="pt-0 pb-4">
          <div className="space-y-4 mt-2">
            {filteredTopics.map((topic, index) => (
              <div key={index} className="border-l-2 border-primary-200 pl-4">
                <h4 className="font-medium text-gray-900 flex items-start gap-2">
                  <HelpCircle className="h-4 w-4 text-primary-500 mt-0.5 flex-shrink-0" />
                  {topic.question}
                </h4>
                <p className="text-sm text-gray-600 mt-1 ml-6">
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
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Help & Documentation</h1>
        <p className="text-gray-500 mt-1">
          Learn how to use Housarr to manage your home inventory and maintenance.
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
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Expand all
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={collapseAll}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
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
            <span className="text-sm text-gray-500 mr-2">Quick links:</span>
            {helpSections.map(section => {
              const Icon = section.icon
              return (
                <button
                  key={section.id}
                  onClick={() => {
                    setOpenSections(new Set([section.id]))
                    document.getElementById(`section-${section.id}`)?.scrollIntoView({ behavior: 'smooth' })
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 hover:bg-gray-200 text-sm text-gray-700 transition-colors"
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
              <HelpCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No results found</h3>
              <p className="text-gray-500 mt-1">
                Try searching with different keywords or browse the sections below.
              </p>
              <button
                onClick={() => setSearchQuery('')}
                className="mt-4 text-primary-600 hover:text-primary-700 font-medium"
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
      <Card className="bg-primary-50 border-primary-200">
        <CardContent className="py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-medium text-primary-900">Need more help?</h3>
              <p className="text-sm text-primary-700 mt-1">
                Look for the <HelpCircle className="inline h-4 w-4" /> icons throughout the app for contextual help.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
