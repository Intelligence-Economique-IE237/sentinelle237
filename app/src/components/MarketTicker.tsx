import { ArrowDown, ArrowUp, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

export interface TickerItem {
  key: string
  label: string
  value: string
  variation: number | null
}

function Variation({ variation }: { variation: number | null }) {
  if (variation === null || variation === 0)
    return (
      <span className="flex items-center gap-1 text-white/50">
        <Minus className="size-3" />
        {variation === 0 && "0,00 %"}
      </span>
    )
  const up = variation > 0
  return (
    <span className={cn("flex items-center gap-1", up ? "text-m-lime" : "text-m-orange")}>
      {up ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
      {Math.abs(variation).toFixed(2)} %
    </span>
  )
}

// Bandeau défilant en continu (devises, matières, indices). CSS pur :
// contenu dupliqué une fois pour boucler sans coupure visible, mis en
// pause au survol et respectant prefers-reduced-motion.
export function MarketTicker({ items }: { items: TickerItem[] }) {
  if (items.length === 0) return null
  return (
    <div className="group relative overflow-hidden rounded-full bg-m-ink py-3">
      <div
        className={cn(
          "flex w-max gap-10 pl-6 motion-safe:animate-[ticker-scroll_45s_linear_infinite]",
          "group-hover:[animation-play-state:paused]"
        )}
      >
        {[...items, ...items].map((item, i) => (
          <div key={`${item.key}-${i}`} className="flex shrink-0 items-center gap-2.5 font-mono text-[12px] whitespace-nowrap">
            <span className="text-white">{item.label}</span>
            <span className="text-white/60 tabular-nums">{item.value}</span>
            <Variation variation={item.variation} />
          </div>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-14 bg-gradient-to-r from-m-ink to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-14 bg-gradient-to-l from-m-ink to-transparent" />
    </div>
  )
}
