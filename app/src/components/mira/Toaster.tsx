import { Toast as ToastPrimitive } from "@base-ui/react/toast"
import { CircleAlert, CircleCheck, Info, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "./toast-manager"

function ToastIcon({ type }: { type?: string }) {
  if (type === "success")
    return (
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-m-lime text-m-ink">
        <CircleCheck className="size-4" />
      </span>
    )
  if (type === "error")
    return (
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-m-peach text-m-orange-text">
        <CircleAlert className="size-4" />
      </span>
    )
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-m-surface-3 text-m-strong">
      <Info className="size-4" />
    </span>
  )
}

function ToastList() {
  const { toasts } = ToastPrimitive.useToastManager()
  return toasts.map((t) => (
    <ToastPrimitive.Root
      key={t.id}
      toast={t}
      className={cn(
        "pointer-events-auto flex w-full items-center gap-3 rounded-[22px] bg-m-ink py-3 pr-2 pl-3 text-white shadow-[0_12px_32px_rgba(15,17,15,.28)] outline-none",
        "transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
        "data-starting-style:translate-y-4 data-starting-style:opacity-0 data-ending-style:translate-y-4 data-ending-style:opacity-0"
      )}
    >
      <ToastIcon type={t.type} />
      <div className="min-w-0 flex-1">
        <ToastPrimitive.Title className="text-sm font-medium" />
        <ToastPrimitive.Description className="text-[13px] leading-snug text-white/65" />
      </div>
      <ToastPrimitive.Close
        aria-label="Fermer la notification"
        className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white"
      >
        <X className="size-4" />
      </ToastPrimitive.Close>
    </ToastPrimitive.Root>
  ))
}

/** Zone d'affichage des notifications, à monter une fois à la racine. */
export function Toaster({ children }: { children?: React.ReactNode }) {
  return (
    <ToastPrimitive.Provider toastManager={toast}>
      {children}
      <ToastPrimitive.Portal>
        <ToastPrimitive.Viewport className="pointer-events-none fixed inset-x-3 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-[60] mx-auto flex max-w-sm flex-col-reverse gap-2 outline-none sm:right-5 sm:bottom-5 sm:left-auto sm:mx-0 sm:w-[380px] md:bottom-5">
          <ToastList />
        </ToastPrimitive.Viewport>
      </ToastPrimitive.Portal>
    </ToastPrimitive.Provider>
  )
}
