import { z } from 'zod'

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  password_confirmation: z.string(),
  household_name: z.string().min(2, 'Household name must be at least 2 characters'),
}).refine((data) => data.password === data.password_confirmation, {
  message: "Passwords don't match",
  path: ['password_confirmation'],
})

export const inviteUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  password_confirmation: z.string(),
  role: z.enum(['admin', 'member']).default('member'),
}).refine((data) => data.password === data.password_confirmation, {
  message: "Passwords don't match",
  path: ['password_confirmation'],
})

// Item schemas
export const itemSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  category_id: z.number().nullable().optional(),
  vendor_id: z.number().nullable().optional(),
  make: z.string().max(255).optional(),
  model: z.string().max(255).optional(),
  serial_number: z.string().max(255).optional(),
  install_date: z.string().optional(),
  location: z.string().max(255).optional(),
  notes: z.string().optional(),
})

// Vendor schemas
export const vendorSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  category_id: z.number().nullable().optional(),
  company: z.string().max(255).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
  address: z.string().optional(),
  notes: z.string().optional(),
})

// Part schemas
export const partSchema = z.object({
  item_id: z.number({ required_error: 'Item is required' }),
  name: z.string().min(1, 'Name is required').max(255),
  part_number: z.string().max(255).optional(),
  type: z.enum(['replacement', 'consumable']),
  purchase_url: z.string().url().optional().or(z.literal('')),
  price: z.number().min(0).optional(),
  notes: z.string().optional(),
})

// Maintenance log schemas
export const maintenanceLogSchema = z.object({
  item_id: z.number({ required_error: 'Item is required' }),
  vendor_id: z.number().nullable().optional(),
  type: z.enum(['service', 'repair', 'replacement', 'inspection']),
  date: z.string().min(1, 'Date is required'),
  cost: z.number().min(0).optional(),
  notes: z.string().optional(),
})

// Reminder schemas
export const reminderSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().optional(),
  due_date: z.string().min(1, 'Due date is required'),
  repeat_interval: z.number().min(1).optional(),
  item_id: z.number().nullable().optional(),
  part_id: z.number().nullable().optional(),
  user_id: z.number().nullable().optional(),
})

// Todo schemas
export const todoSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  due_date: z.string().optional(),
  item_id: z.number().nullable().optional(),
  user_id: z.number().nullable().optional(),
})

// Category schemas
export const categorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  icon: z.string().max(50).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
})

// Household schemas
export const householdSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
})

// Type exports
export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type InviteUserInput = z.infer<typeof inviteUserSchema>
export type ItemInput = z.infer<typeof itemSchema>
export type VendorInput = z.infer<typeof vendorSchema>
export type PartInput = z.infer<typeof partSchema>
export type MaintenanceLogInput = z.infer<typeof maintenanceLogSchema>
export type ReminderInput = z.infer<typeof reminderSchema>
export type TodoInput = z.infer<typeof todoSchema>
export type CategoryInput = z.infer<typeof categorySchema>
export type HouseholdInput = z.infer<typeof householdSchema>
