import { ArrowDown, ArrowUp, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

export interface TickerItem {
  key: string
  label: string
  value: string
  variation: number | null
}

interface MarketTickerProps {
  items: TickerItem[]
}

function VariationBadge({ variation }: { variation: number | null }) {
  if (variation === null) {
    return (
      <span className="flex items-center gap-1 text-muted-foreground">
        <Minus className="h-3 w-3" />
      </span>
    )
  }
  if (variation > 0) {
    return (
      <span className="flex items-center gap-1 text-green-600">
        <ArrowUp className="h-3 w-3" />
        {variation.toFixed(2)}%
      </span>
    )
  }
  if (variation < 0) {
    return (
      <span className="flex items-center gap-1 text-red-600">
        <ArrowDown className="h-3 w-3" />
        {Math.abs(variation).toFixed(2)}%
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1 text-muted-foreground">
      <Minus className="h-3 w-3" />
      0.00%
    </span>
  )
}

// Bandeau défilant en continu (devises, matières, indices). CSS pur —
// contenu dupliqué une fois pour boucler sans coupure visible, mis en
// pause au survol et respecte prefers-reduced-motion.
export function MarketTicker({ items }: MarketTickerProps) {
  if (items.length === 0) return null

  return (
    <div className="group relative overflow-hidden border-y bg-muted/30 py-2">
      <div
        className={cn(
          "flex w-max gap-8 motion-safe:animate-[ticker-scroll_40s_linear_infinite]",
          "group-hover:[animation-play-state:paused]"
        )}
      >
        {[...items, ...items].map((item, i) => (
          <div key={`${item.key}-${i}`} className="flex shrink-0 items-center gap-2 whitespace-nowrap text-sm">
            <span className="font-medium">{item.label}</span>
            <span className="tabular-nums text-muted-foreground">{item.value}</span>
            <VariationBadge variation={item.variation} />
          </div>
        ))}
      </div>
      {/* Fondus sur les bords pour un défilement propre */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-background to-transparent" />
    </div>
  )
}
