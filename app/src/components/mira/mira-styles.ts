import { cn } from "@/lib/utils"

export type ButtonVariant = "dark" | "light" | "white" | "lime" | "danger" | "ghost"
export type ButtonSize = "md" | "sm" | "icon" | "icon-sm"

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  dark: "bg-m-ink text-white hover:bg-m-ink/85",
  light: "bg-m-surface-3 text-m-ink hover:bg-m-surface-4",
  white: "bg-m-surface text-m-ink hover:bg-m-surface-2",
  lime: "bg-m-lime text-m-ink hover:brightness-95",
  danger: "bg-m-peach text-m-orange-text hover:brightness-95",
  ghost: "bg-transparent text-m-soft hover:bg-m-surface-3 hover:text-m-ink",
}

const BUTTON_SIZES: Record<ButtonSize, string> = {
  md: "h-11 px-[18px] text-sm gap-2",
  sm: "h-9 px-4 text-[13px] gap-1.5",
  icon: "size-10",
  "icon-sm": "size-8",
}

export function mButtonClasses(variant: ButtonVariant = "dark", size: ButtonSize = "md", className?: string) {
  return cn(
    "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full font-medium whitespace-nowrap transition-[background-color,filter,color] outline-none select-none focus-visible:ring-3 focus-visible:ring-m-lime/70 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
    BUTTON_VARIANTS[variant],
    BUTTON_SIZES[size],
    className
  )
}

export function initials(name?: string | null) {
  if (!name) return "?"
  const parts = name.trim().split(/[\s._-]+/).filter(Boolean)
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? parts[0]?.[1] ?? "")).toUpperCase()
}
