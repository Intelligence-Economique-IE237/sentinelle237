import { cn } from "@/lib/utils"

/** Logo officiel + nom de l'application. */
export function BrandMark({ size = "md", className }: { size?: "md" | "lg"; className?: string }) {
  return (
    <span className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg bg-m-surface shadow-[inset_0_0_0_1px_rgba(15,17,15,.06)]",
          size === "lg" ? "size-9" : "size-7"
        )}
      >
        <img src="/icons/logo-mark.png" alt="" className={size === "lg" ? "h-6" : "h-5"} />
      </span>
      <span className={cn("truncate leading-none font-semibold tracking-[-0.04em]", size === "lg" ? "text-[21px]" : "text-[19px]")}>
        sentinelle<span className="text-m-muted">237</span>
      </span>
    </span>
  )
}
