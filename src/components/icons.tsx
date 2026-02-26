import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowLeftRightIcon,
  ArrowLeftToLineIcon,
  ArrowRightIcon,
  ArrowRightToLineIcon,
  ArrowUpIcon,
  BellIcon,
  CalendarIcon,
  CameraIcon,
  ChartBarIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  ChevronsUpDownIcon,
  ChevronUpIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  CircleHelpIcon,
  CircleIcon,
  CirclePlusIcon,
  CircleUserRoundIcon,
  Columns3Icon,
  CommandIcon,
  CornerUpLeftIcon,
  CornerUpRightIcon,
  CreditCardIcon,
  DatabaseIcon,
  EllipsisVerticalIcon,
  ExternalLinkIcon,
  EyeIcon,
  EyeOffIcon,
  FileChartColumnIcon,
  FileIcon,
  FileTextIcon,
  FilterIcon,
  FolderIcon,
  GlobeIcon,
  GripHorizontalIcon,
  GripVerticalIcon,
  HomeIcon,
  InfoIcon,
  LayoutDashboardIcon,
  ListIcon,
  Loader2Icon,
  LogOutIcon,
  MailIcon,
  MinusIcon,
  MoonIcon,
  MoreHorizontalIcon,
  OctagonXIcon,
  PanelLeftIcon,
  PinOffIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  Settings2Icon,
  SettingsIcon,
  ShareIcon,
  StarIcon,
  SunIcon,
  TagIcon,
  Trash2Icon,
  TrendingDownIcon,
  TrendingUpIcon,
  TriangleAlertIcon,
  UploadIcon,
  UserIcon,
  UsersIcon,
  WalletIcon,
  XIcon,
} from 'lucide-react';

type IconComponent = typeof SunIcon;
type SvgProps = React.ComponentProps<'svg'>;

const Icons = {
  ArrowDown: ArrowDownIcon,
  ArrowLeft: ArrowLeftIcon,
  ArrowLeftRight: ArrowLeftRightIcon,
  ArrowLeftToLine: ArrowLeftToLineIcon,
  ArrowRight: ArrowRightIcon,
  ArrowRightToLine: ArrowRightToLineIcon,
  ArrowUp: ArrowUpIcon,
  Bell: BellIcon,
  Calendar: CalendarIcon,
  Camera: CameraIcon,
  ChartBar: ChartBarIcon,
  Check: CheckIcon,
  ChevronDown: ChevronDownIcon,
  ChevronLeft: ChevronLeftIcon,
  ChevronRight: ChevronRightIcon,
  ChevronsLeft: ChevronsLeftIcon,
  ChevronsRight: ChevronsRightIcon,
  ChevronsUpDown: ChevronsUpDownIcon,
  ChevronUp: ChevronUpIcon,
  Circle: CircleIcon,
  CircleAlert: CircleAlertIcon,
  CircleCheck: CircleCheckIcon,
  CircleHelp: CircleHelpIcon,
  CirclePlus: CirclePlusIcon,
  CircleUserRound: CircleUserRoundIcon,
  Columns3: Columns3Icon,
  Command: CommandIcon,
  CornerUpLeft: CornerUpLeftIcon,
  CornerUpRight: CornerUpRightIcon,
  CreditCard: CreditCardIcon,
  Database: DatabaseIcon,
  EllipsisVertical: EllipsisVerticalIcon,
  ExternalLink: ExternalLinkIcon,
  Eye: EyeIcon,
  EyeOff: EyeOffIcon,
  File: FileIcon,
  FileChartColumn: FileChartColumnIcon,
  FileText: FileTextIcon,
  Filter: FilterIcon,
  Folder: FolderIcon,
  GitHub: (props: SvgProps) => (
    <svg aria-hidden="true" fill="currentColor" viewBox="0 0 24 24" {...props}>
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.338c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
    </svg>
  ),
  Globe: GlobeIcon,
  Google: (props: SvgProps) => (
    <svg aria-hidden="true" fill="currentColor" viewBox="0 0 24 24" {...props}>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z" />
      <path d="M5.84 14.09A6.99 6.99 0 0 1 5.48 12c0-.72.12-1.43.35-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.93l3.66-2.84Z" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z" />
    </svg>
  ),
  GripHorizontal: GripHorizontalIcon,
  GripVertical: GripVerticalIcon,
  Home: HomeIcon,
  Info: InfoIcon,
  LayoutDashboard: LayoutDashboardIcon,
  List: ListIcon,
  Loader2: Loader2Icon,
  Logo: ({ className = 'size-6', ...props }: SvgProps) => (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      {...props}
    >
      <line x1="12" x2="12" y1="2" y2="22" />
      <line x1="8" x2="16" y1="22" y2="22" />
      <line x1="3" x2="21" y1="6" y2="6" />
      <polygon fill="currentColor" points="12,2 10,6 14,6" stroke="none" />
      <path d="M3 6 L2 12 A4.5 2 0 0 0 11 12 L10 6" />
      <path d="M14 6 L13 12 A4.5 2 0 0 0 22 12 L21 6" />
    </svg>
  ),
  LogOut: LogOutIcon,
  Mail: MailIcon,
  Minus: MinusIcon,
  Moon: MoonIcon,
  MoreHorizontal: MoreHorizontalIcon,
  OctagonX: OctagonXIcon,
  PanelLeft: PanelLeftIcon,
  PinOff: PinOffIcon,
  Plus: PlusIcon,
  RefreshCw: RefreshCwIcon,
  Search: SearchIcon,
  Settings: SettingsIcon,
  Settings2: Settings2Icon,
  Share: ShareIcon,
  Star: StarIcon,
  Sun: SunIcon,
  Tag: TagIcon,
  Trash2: Trash2Icon,
  TrendingDown: TrendingDownIcon,
  TrendingUp: TrendingUpIcon,
  TriangleAlert: TriangleAlertIcon,
  Upload: UploadIcon,
  User: UserIcon,
  Users: UsersIcon,
  Wallet: WalletIcon,
  X: XIcon,
} as const;

export { type IconComponent, Icons };
