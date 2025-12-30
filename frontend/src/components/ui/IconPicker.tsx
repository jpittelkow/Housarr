import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { Icon, ChevronDown } from '@/components/ui'
import {
  // Rooms & Spaces
  Home,
  Building,
  Building2,
  Hotel,
  Store,
  Warehouse,
  Castle,
  Church,
  Factory,
  School,
  
  // Bedroom
  Bed,
  BedDouble,
  BedSingle,
  Lamp,
  LampDesk,
  LampFloor,
  LampCeiling,
  Moon,
  AlarmClock,
  
  // Bathroom
  Bath,
  ShowerHead,
  Droplets,
  Droplet,
  
  // Kitchen
  CookingPot,
  Utensils,
  UtensilsCrossed,
  ChefHat,
  Refrigerator,
  Microwave,
  Coffee,
  CupSoda,
  Wine,
  Beer,
  Sandwich,
  Apple,
  Carrot,
  Salad,
  Pizza,
  Croissant,
  IceCream,
  Cake,
  Cookie,
  
  // Living Room
  Sofa,
  Tv,
  Armchair,
  Frame,
  Image,
  Speaker,
  Radio,
  
  // Laundry
  WashingMachine,
  Shirt,
  Haze,
  
  // Office & Work
  Laptop,
  Monitor,
  Keyboard,
  Mouse,
  Printer,
  Phone,
  Smartphone,
  Tablet,
  HardDrive,
  Cpu,
  Router,
  Wifi,
  BookOpen,
  Book,
  Bookmark,
  FileText,
  Briefcase,
  
  // Garage & Tools
  Car,
  Bike,
  Wrench,
  Hammer,
  PaintBucket,
  Paintbrush,
  Ruler,
  Scissors,
  CircleDot,
  Gauge,
  Cog,
  Settings,
  
  // Garden & Outdoor
  TreePine,
  Trees,
  Flower,
  Flower2,
  Leaf,
  Shrub,
  Sun,
  CloudSun,
  Umbrella,
  Fence,
  Tractor,
  Shovel,
  
  // Storage
  Box,
  Package,
  Archive,
  Folder,
  FolderOpen,
  Layers,
  LayoutGrid,
  Container,
  
  // Climate & Utilities
  Thermometer,
  ThermometerSun,
  ThermometerSnowflake,
  Wind,
  Fan,
  Snowflake,
  Flame,
  Heater,
  AirVent,
  Lightbulb,
  LightbulbOff,
  Plug,
  PlugZap,
  Zap,
  BatteryCharging,
  Fuel,
  
  // Security
  Key,
  KeyRound,
  Lock,
  LockOpen,
  Shield,
  ShieldCheck,
  Camera,
  Cctv,
  Bell,
  BellRing,
  Siren,
  DoorOpen,
  DoorClosed,
  
  // Entertainment & Activities
  Gamepad2,
  Joystick,
  Music,
  Music2,
  Headphones,
  Dumbbell,
  Trophy,
  Medal,
  Target,
  
  // Kids & Pets
  Baby,
  ToyBrick,
  Blocks,
  Dog,
  Cat,
  Fish,
  Bird,
  Rabbit,
  
  // Cleaning
  SprayCan,
  Trash,
  Trash2,
  Recycle,
  
  // Misc Household
  Clock,
  Timer,
  Scale,
  Wallet,
  CreditCard,
  Receipt,
  CalendarDays,
  Gift,
  Heart,
  Star,
  Sparkles,
  Tag,
  Tags,
  MapPin,
  Map,
  Compass,
  
  type LucideIcon,
} from 'lucide-react'

// Location-related icons organized by category
const LOCATION_ICONS: { category: string; icons: { name: string; icon: LucideIcon }[] }[] = [
  {
    category: 'Rooms & Spaces',
    icons: [
      { name: 'home', icon: Home },
      { name: 'building', icon: Building },
      { name: 'building2', icon: Building2 },
      { name: 'hotel', icon: Hotel },
      { name: 'store', icon: Store },
      { name: 'warehouse', icon: Warehouse },
      { name: 'castle', icon: Castle },
      { name: 'church', icon: Church },
      { name: 'factory', icon: Factory },
      { name: 'school', icon: School },
      { name: 'door-open', icon: DoorOpen },
      { name: 'door-closed', icon: DoorClosed },
    ],
  },
  {
    category: 'Bedroom',
    icons: [
      { name: 'bed', icon: Bed },
      { name: 'bed-double', icon: BedDouble },
      { name: 'bed-single', icon: BedSingle },
      { name: 'lamp', icon: Lamp },
      { name: 'lamp-desk', icon: LampDesk },
      { name: 'lamp-floor', icon: LampFloor },
      { name: 'lamp-ceiling', icon: LampCeiling },
      { name: 'moon', icon: Moon },
      { name: 'alarm-clock', icon: AlarmClock },
    ],
  },
  {
    category: 'Bathroom',
    icons: [
      { name: 'bath', icon: Bath },
      { name: 'shower-head', icon: ShowerHead },
      { name: 'droplets', icon: Droplets },
      { name: 'droplet', icon: Droplet },
    ],
  },
  {
    category: 'Kitchen',
    icons: [
      { name: 'cooking-pot', icon: CookingPot },
      { name: 'utensils', icon: Utensils },
      { name: 'utensils-crossed', icon: UtensilsCrossed },
      { name: 'chef-hat', icon: ChefHat },
      { name: 'refrigerator', icon: Refrigerator },
      { name: 'microwave', icon: Microwave },
      { name: 'coffee', icon: Coffee },
      { name: 'cup-soda', icon: CupSoda },
      { name: 'wine', icon: Wine },
      { name: 'beer', icon: Beer },
      { name: 'sandwich', icon: Sandwich },
      { name: 'apple', icon: Apple },
      { name: 'carrot', icon: Carrot },
      { name: 'salad', icon: Salad },
      { name: 'pizza', icon: Pizza },
      { name: 'croissant', icon: Croissant },
      { name: 'ice-cream', icon: IceCream },
      { name: 'cake', icon: Cake },
      { name: 'cookie', icon: Cookie },
    ],
  },
  {
    category: 'Living Room',
    icons: [
      { name: 'sofa', icon: Sofa },
      { name: 'armchair', icon: Armchair },
      { name: 'tv', icon: Tv },
      { name: 'frame', icon: Frame },
      { name: 'image', icon: Image },
      { name: 'speaker', icon: Speaker },
      { name: 'radio', icon: Radio },
    ],
  },
  {
    category: 'Laundry',
    icons: [
      { name: 'washing-machine', icon: WashingMachine },
      { name: 'shirt', icon: Shirt },
      { name: 'haze', icon: Haze },
    ],
  },
  {
    category: 'Office & Work',
    icons: [
      { name: 'laptop', icon: Laptop },
      { name: 'monitor', icon: Monitor },
      { name: 'keyboard', icon: Keyboard },
      { name: 'mouse', icon: Mouse },
      { name: 'printer', icon: Printer },
      { name: 'phone', icon: Phone },
      { name: 'smartphone', icon: Smartphone },
      { name: 'tablet', icon: Tablet },
      { name: 'hard-drive', icon: HardDrive },
      { name: 'cpu', icon: Cpu },
      { name: 'router', icon: Router },
      { name: 'wifi', icon: Wifi },
      { name: 'book-open', icon: BookOpen },
      { name: 'book', icon: Book },
      { name: 'bookmark', icon: Bookmark },
      { name: 'file-text', icon: FileText },
      { name: 'briefcase', icon: Briefcase },
    ],
  },
  {
    category: 'Garage & Tools',
    icons: [
      { name: 'car', icon: Car },
      { name: 'bike', icon: Bike },
      { name: 'wrench', icon: Wrench },
      { name: 'hammer', icon: Hammer },
      { name: 'paint-bucket', icon: PaintBucket },
      { name: 'paintbrush', icon: Paintbrush },
      { name: 'ruler', icon: Ruler },
      { name: 'scissors', icon: Scissors },
      { name: 'circle-dot', icon: CircleDot },
      { name: 'gauge', icon: Gauge },
      { name: 'cog', icon: Cog },
      { name: 'settings', icon: Settings },
    ],
  },
  {
    category: 'Garden & Outdoor',
    icons: [
      { name: 'tree-pine', icon: TreePine },
      { name: 'trees', icon: Trees },
      { name: 'flower', icon: Flower },
      { name: 'flower2', icon: Flower2 },
      { name: 'leaf', icon: Leaf },
      { name: 'shrub', icon: Shrub },
      { name: 'sun', icon: Sun },
      { name: 'cloud-sun', icon: CloudSun },
      { name: 'umbrella', icon: Umbrella },
      { name: 'fence', icon: Fence },
      { name: 'tractor', icon: Tractor },
      { name: 'shovel', icon: Shovel },
    ],
  },
  {
    category: 'Storage',
    icons: [
      { name: 'box', icon: Box },
      { name: 'package', icon: Package },
      { name: 'archive', icon: Archive },
      { name: 'folder', icon: Folder },
      { name: 'folder-open', icon: FolderOpen },
      { name: 'layers', icon: Layers },
      { name: 'layout-grid', icon: LayoutGrid },
      { name: 'container', icon: Container },
    ],
  },
  {
    category: 'Climate & Utilities',
    icons: [
      { name: 'thermometer', icon: Thermometer },
      { name: 'thermometer-sun', icon: ThermometerSun },
      { name: 'thermometer-snowflake', icon: ThermometerSnowflake },
      { name: 'wind', icon: Wind },
      { name: 'fan', icon: Fan },
      { name: 'snowflake', icon: Snowflake },
      { name: 'flame', icon: Flame },
      { name: 'heater', icon: Heater },
      { name: 'air-vent', icon: AirVent },
      { name: 'lightbulb', icon: Lightbulb },
      { name: 'lightbulb-off', icon: LightbulbOff },
      { name: 'plug', icon: Plug },
      { name: 'plug-zap', icon: PlugZap },
      { name: 'zap', icon: Zap },
      { name: 'battery-charging', icon: BatteryCharging },
      { name: 'fuel', icon: Fuel },
    ],
  },
  {
    category: 'Security',
    icons: [
      { name: 'key', icon: Key },
      { name: 'key-round', icon: KeyRound },
      { name: 'lock', icon: Lock },
      { name: 'lock-open', icon: LockOpen },
      { name: 'shield', icon: Shield },
      { name: 'shield-check', icon: ShieldCheck },
      { name: 'camera', icon: Camera },
      { name: 'cctv', icon: Cctv },
      { name: 'bell', icon: Bell },
      { name: 'bell-ring', icon: BellRing },
      { name: 'siren', icon: Siren },
    ],
  },
  {
    category: 'Entertainment',
    icons: [
      { name: 'gamepad', icon: Gamepad2 },
      { name: 'joystick', icon: Joystick },
      { name: 'music', icon: Music },
      { name: 'music2', icon: Music2 },
      { name: 'headphones', icon: Headphones },
      { name: 'dumbbell', icon: Dumbbell },
      { name: 'trophy', icon: Trophy },
      { name: 'medal', icon: Medal },
      { name: 'target', icon: Target },
    ],
  },
  {
    category: 'Kids & Pets',
    icons: [
      { name: 'baby', icon: Baby },
      { name: 'toy-brick', icon: ToyBrick },
      { name: 'blocks', icon: Blocks },
      { name: 'dog', icon: Dog },
      { name: 'cat', icon: Cat },
      { name: 'fish', icon: Fish },
      { name: 'bird', icon: Bird },
      { name: 'rabbit', icon: Rabbit },
    ],
  },
  {
    category: 'Cleaning',
    icons: [
      { name: 'spray-can', icon: SprayCan },
      { name: 'trash', icon: Trash },
      { name: 'trash2', icon: Trash2 },
      { name: 'recycle', icon: Recycle },
    ],
  },
  {
    category: 'Misc',
    icons: [
      { name: 'clock', icon: Clock },
      { name: 'timer', icon: Timer },
      { name: 'scale', icon: Scale },
      { name: 'wallet', icon: Wallet },
      { name: 'credit-card', icon: CreditCard },
      { name: 'receipt', icon: Receipt },
      { name: 'calendar-days', icon: CalendarDays },
      { name: 'gift', icon: Gift },
      { name: 'heart', icon: Heart },
      { name: 'star', icon: Star },
      { name: 'sparkles', icon: Sparkles },
      { name: 'tag', icon: Tag },
      { name: 'tags', icon: Tags },
      { name: 'map-pin', icon: MapPin },
      { name: 'map', icon: Map },
      { name: 'compass', icon: Compass },
    ],
  },
]

// Flat list of all icons for lookup
const ALL_ICONS = LOCATION_ICONS.flatMap((cat) => cat.icons)

export function getIconByName(name: string): LucideIcon | undefined {
  return ALL_ICONS.find((i) => i.name === name)?.icon
}

interface IconPickerProps {
  value: string
  onChange: (iconName: string) => void
  placeholder?: string
  className?: string
}

export function IconPicker({ value, onChange, placeholder = 'Select icon', className }: IconPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Update dropdown position when opening
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: Math.max(rect.width, 288), // min 288px (w-72)
      })
    }
  }, [isOpen])

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close on escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false)
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const selectedIcon = getIconByName(value)

  return (
    <div className={cn('relative', className)}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center justify-between w-full px-3 py-2 text-sm',
          'border border-gray-300 dark:border-gray-600 rounded-lg',
          'bg-white dark:bg-gray-800',
          'hover:border-gray-400 dark:hover:border-gray-500',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
          'transition-colors'
        )}
      >
        <span className="flex items-center gap-2">
          {selectedIcon ? (
            <>
              <Icon icon={selectedIcon} size="sm" className="text-gray-600 dark:text-gray-400" />
              <span className="text-gray-900 dark:text-gray-100 capitalize">{value.replace(/-/g, ' ')}</span>
            </>
          ) : (
            <span className="text-gray-500 dark:text-gray-400">{placeholder}</span>
          )}
        </span>
        <Icon
          icon={ChevronDown}
          size="sm"
          className={cn('text-gray-400 transition-transform', isOpen && 'rotate-180')}
        />
      </button>

      {/* Dropdown - rendered via portal to escape modal overflow */}
      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[9999] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-80 overflow-auto"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
          }}
        >
          {/* None option */}
          <button
            type="button"
            onClick={() => {
              onChange('')
              setIsOpen(false)
            }}
            className={cn(
              'flex items-center gap-2 w-full px-3 py-2 text-sm text-left',
              'hover:bg-gray-100 dark:hover:bg-gray-700',
              !value && 'bg-primary-50 dark:bg-primary-900/20'
            )}
          >
            <span className="w-5 h-5 flex items-center justify-center text-gray-400">—</span>
            <span className="text-gray-500 dark:text-gray-400">None</span>
          </button>

          {/* Categories */}
          {LOCATION_ICONS.map((category) => (
            <div key={category.category}>
              <div className="px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
                {category.category}
              </div>
              <div className="grid grid-cols-5 gap-1 p-2">
                {category.icons.map(({ name, icon }) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      onChange(name)
                      setIsOpen(false)
                    }}
                    title={name.replace(/-/g, ' ')}
                    className={cn(
                      'flex items-center justify-center p-2 rounded-md',
                      'hover:bg-gray-100 dark:hover:bg-gray-700',
                      'transition-colors',
                      value === name && 'bg-primary-100 dark:bg-primary-900/30 ring-1 ring-primary-500'
                    )}
                  >
                    <Icon
                      icon={icon}
                      size="sm"
                      className={cn(
                        'text-gray-600 dark:text-gray-400',
                        value === name && 'text-primary-600 dark:text-primary-400'
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}
