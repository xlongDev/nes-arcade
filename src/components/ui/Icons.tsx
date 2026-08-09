import type { LucideProps } from 'lucide-react'
import {
  Camera,
  ChevronLeft,
  Clock,
  Download,
  Gamepad2,
  Heart,
  LayoutGrid,
  Maximize,
  Moon,
  Pause,
  Play,
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
export const IconBack = wrapIcon(ChevronLeft)
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

export const IconVolume = ({
  level = 2,
  size = DEFAULT_SIZE,
  ...rest
}: IconProps & { level?: 0 | 1 | 2 }) => {
  const Icon = level === 0 ? VolumeX : level === 1 ? Volume1 : Volume2
  return <Icon size={size} strokeWidth={DEFAULT_STROKE} aria-hidden="true" focusable="false" {...rest} />
}
