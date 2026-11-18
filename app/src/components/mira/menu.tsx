/**
 * Menus déroulants et popovers au style Mira (comportement : Base UI, sans style).
 */
import type React from "react"
import { Menu } from "@base-ui/react/menu"
import { Popover } from "@base-ui/react/popover"
import { cn } from "@/lib/utils"

const POPUP =
  "z-50 rounded-2xl bg-m-surface p-1.5 text-sm text-m-ink shadow-[0_1px_2px_rgba(15,17,15,.08),0_12px_32px_rgba(15,17,15,.16)] outline-none origin-(--transform-origin) transition-[opacity,transform] duration-150 data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0"

export function MMenu(props: Menu.Root.Props) {
  return <Menu.Root {...props} />
}

export function MMenuTrigger(props: Menu.Trigger.Props) {
  return <Menu.Trigger {...props} />
}

export function MMenuContent({
  children,
  align = "end",
  sideOffset = 6,
  className,
}: {
  children: React.ReactNode
  align?: "start" | "center" | "end"
  sideOffset?: number
  className?: string
}) {
  return (
    <Menu.Portal>
      <Menu.Positioner align={align} sideOffset={sideOffset} className="z-50 outline-none">
        <Menu.Popup className={cn(POPUP, "min-w-44", className)}>{children}</Menu.Popup>
      </Menu.Positioner>
    </Menu.Portal>
  )
}

export function MMenuItem({
  children,
  onClick,
  tone = "default",
}: {
  children: React.ReactNode
  onClick?: () => void
  tone?: "default" | "danger"
}) {
  return (
    <Menu.Item
      onClick={onClick}
      className={cn(
        "flex h-9 cursor-pointer items-center gap-2.5 rounded-xl px-2.5 outline-none select-none data-highlighted:bg-m-surface-3 [&_svg]:size-4 [&_svg]:shrink-0",
        tone === "danger" ? "text-m-orange-text data-highlighted:bg-m-peach" : "[&_svg]:text-m-soft"
      )}
    >
      {children}
    </Menu.Item>
  )
}

export function MMenuSeparator() {
  return <Menu.Separator className="mx-2 my-1 h-px bg-m-surface-4" />
}

export function MPopover(props: Popover.Root.Props) {
  return <Popover.Root {...props} />
}

export function MPopoverTrigger(props: Popover.Trigger.Props) {
  return <Popover.Trigger {...props} />
}

export function MPopoverContent({
  children,
  align = "end",
  sideOffset = 8,
  className,
}: {
  children: React.ReactNode
  align?: "start" | "center" | "end"
  sideOffset?: number
  className?: string
}) {
  return (
    <Popover.Portal>
      <Popover.Positioner align={align} sideOffset={sideOffset} className="z-50 outline-none">
        <Popover.Popup className={cn(POPUP, "p-3", className)}>{children}</Popover.Popup>
      </Popover.Positioner>
    </Popover.Portal>
  )
}
