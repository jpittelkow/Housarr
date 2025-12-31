export interface User {
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

export interface Household {
  id: number
  name: string
  address: string | null
  latitude: number | null
  longitude: number | null
  images?: FileRecord[]
  featured_image?: FileRecord
  created_at: string
  updated_at: string
}

export interface Category {
  id: number
  household_id: number | null
  name: string
  icon: string | null
  color: string | null
  created_at: string
  updated_at: string
}

export interface Vendor {
  id: number
  household_id: number
  category_id: number | null
  name: string
  company: string | null
  phone: string | null
  email: string | null
  website: string | null
  address: string | null
  latitude: number | null
  longitude: number | null
  notes: string | null
  category?: Category
  images?: FileRecord[]
  logo?: FileRecord
  created_at: string
  updated_at: string
}

export interface Location {
  id: number
  household_id: number
  name: string
  icon: string | null
  items_count?: number
  images?: FileRecord[]
  featured_image?: FileRecord
  created_at: string
  updated_at: string
}

export interface Item {
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

export interface Part {
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

export interface MaintenanceLog {
  id: number
  item_id: number
  vendor_id: number | null
  type: 'service' | 'repair' | 'replacement' | 'inspection'
  date: string
  cost: number | null
  notes: string | null
  attachments: string[] | null
  vendor?: Vendor
  parts?: Part[]
  created_at: string
  updated_at: string
}

export interface Reminder {
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

export interface Todo {
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

export interface Notification {
  id: number
  user_id: number
  type: string
  data: Record<string, unknown>
  read_at: string | null
  created_at: string
  updated_at: string
}

export interface FileRecord {
  id: number
  household_id: number
  fileable_type: string
  fileable_id: number
  disk: string
  path: string
  original_name: string
  display_name: string | null
  mime_type: string | null
  size: number | null
  is_featured: boolean
  url: string
  created_at: string
  updated_at: string
}

export type FileableType = 'item' | 'maintenance_log' | 'part' | 'vendor' | 'location' | 'household' | 'user'

export interface AuthResponse {
  user: User
}

export interface ApiResponse<T> {
  data: T
}
