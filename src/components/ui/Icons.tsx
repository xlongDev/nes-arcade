import type { LucideProps } from 'lucide-react'
import {
  ArrowDown,
  ArrowUp,
  Camera,
  Check,
  ChevronDown,
  ChevronLeft,
  Clock,
  Copy,
  Download,
  Folder,
  FolderOpen,
  FolderPlus,
  Gamepad2,
  Heart,
  LayoutGrid,
  Maximize,
  Moon,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Settings,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  Volume1,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'

/**
 * 图标层。
 * 标准 UI 图标统一走 lucide-react（tree-shake，风格一致），
 * 仅保留极少量自定义图标在组件内直接内联（如顶部 NES 手柄 logo）。
 */

export type IconProps = LucideProps & { size?: number }

const DEFAULT_SIZE = 20
const DEFAULT_STROKE = 1.65

function wrapIcon(Icon: React.ComponentType<LucideProps>) {
  return ({ size = DEFAULT_SIZE, ...rest }: IconProps) => (
    <Icon size={size} strokeWidth={DEFAULT_STROKE} aria-hidden="true" focusable="false" {...rest} />
  )
}

export const IconSettings = wrapIcon(Settings)
export const IconSun = wrapIcon(Sun)
export const IconMoon = wrapIcon(Moon)
export const IconUpload = wrapIcon(Upload)
export const IconSearch = wrapIcon(Search)
export const IconFolder = wrapIcon(Folder)
export const IconFolderOpen = wrapIcon(FolderOpen)
export const IconFolderPlus = wrapIcon(FolderPlus)
export const IconRefresh = wrapIcon(RefreshCw)
export const IconBack = wrapIcon(ChevronLeft)
export const IconChevronDown = wrapIcon(ChevronDown)
export const IconCheck = wrapIcon(Check)
export const IconClose = wrapIcon(X)
export const IconPlay = wrapIcon(Play)
export const IconPause = wrapIcon(Pause)
export const IconReset = wrapIcon(RotateCcw)
export const IconFullscreen = wrapIcon(Maximize)
export const IconGrid = wrapIcon(LayoutGrid)
export const IconClock = wrapIcon(Clock)
export const IconCamera = wrapIcon(Camera)
export const IconSave = wrapIcon(Save)
export const IconLoad = wrapIcon(Download)
export const IconTrash = wrapIcon(Trash2)
export const IconGamepad = wrapIcon(Gamepad2)
export const IconSparkle = wrapIcon(Sparkles)
export const IconCopy = wrapIcon(Copy)
export const IconArrowUp = wrapIcon(ArrowUp)
export const IconArrowDown = wrapIcon(ArrowDown)

export const IconHeart = ({
  filled,
  size = DEFAULT_SIZE,
  ...rest
}: IconProps & { filled?: boolean }) => (
  <Heart
    size={size}
    strokeWidth={DEFAULT_STROKE}
    fill={filled ? 'currentColor' : 'none'}
    aria-hidden="true"
    focusable="false"
    {...rest}
  />
)

export const IconGithub = ({
  size = DEFAULT_SIZE,
  ...rest
}: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
    {...rest}
  >
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.73.083-.73 1.205.085 1.84 1.237 1.84 1.237 1.07 1.835 2.807 1.305 3.492.998.108-.776.42-1.305.763-1.605-2.665-.3-5.467-1.334-5.467-5.93 0-1.31.468-2.382 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.4 3-.405 1.02.005 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.838 1.23 1.91 1.23 3.22 0 4.61-2.807 5.625-5.48 5.92.43.372.81 1.103.81 2.222 0 1.606-.015 2.898-.015 3.293 0 .32.21.694.825.577C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </svg>
)

export const IconVolume = ({
  level = 2,
  size = DEFAULT_SIZE,
  ...rest
}: IconProps & { level?: 0 | 1 | 2 }) => {
  const Icon = level === 0 ? VolumeX : level === 1 ? Volume1 : Volume2
  return <Icon size={size} strokeWidth={DEFAULT_STROKE} aria-hidden="true" focusable="false" {...rest} />
}
