import { type LucideIcon, type LucideProps } from 'lucide-react'
import { cn } from '@/lib/utils'

// Untitled UI icon sizes
const sizes = {
  xs: 'h-4 w-4',    // 16px
  sm: 'h-5 w-5',    // 20px
  md: 'h-6 w-6',    // 24px
  lg: 'h-7 w-7',    // 28px
  xl: 'h-8 w-8',    // 32px
}

// Stroke widths per size (Untitled UI uses 1.5 for md/lg, 2 for sm/xs)
const strokeWidths = {
  xs: 2,
  sm: 2,
  md: 1.5,
  lg: 1.5,
  xl: 1.5,
}

export interface IconProps extends Omit<LucideProps, 'size'> {
  icon: LucideIcon
  size?: keyof typeof sizes
}

export function Icon({
  icon: IconComponent,
  size = 'md',
  className,
  strokeWidth,
  ...props
}: IconProps) {
  return (
    <IconComponent
      className={cn(sizes[size], className)}
      strokeWidth={strokeWidth ?? strokeWidths[size]}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    />
  )
}

// Re-export commonly used icons for convenience
export {
  // Navigation
  Home,
  Menu,
  X,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ArrowRight,

  // Actions
  Plus,
  Minus,
  Check,
  Search,
  Filter,
  Edit,
  Pencil,
  Trash2,
  MoreHorizontal,
  MoreVertical,
  Download,
  Upload,
  RefreshCw,
  Copy,
  ExternalLink,

  // Objects
  Package,
  Users,
  User,
  Bell,
  Settings,
  Calendar,
  Clock,
  MapPin,
  Phone,
  Mail,
  Globe,
  File,
  FileText,
  Folder,
  Image,
  Link,
  Tag,

  // Status
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  HelpCircle,

  // Tasks
  CheckSquare,
  Square,
  Circle,
  CircleCheck,
  ListTodo,

  // Misc
  LogOut,
  LogIn,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Star,
  Heart,
  Wrench,
  Zap,
  DollarSign,
  Building,
  Home as House,
  Thermometer,
  Droplets,
  Lightbulb,
  Shield,
  Car,
  Layers,
} from 'lucide-react'
