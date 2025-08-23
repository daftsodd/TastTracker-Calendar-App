import React from 'react'
import * as L from 'lucide-react'

// Wrapper to enforce consistent size and stroke width
export function Icon({name, size=18, strokeWidth=1.75, className}: {name: keyof typeof L, size?: number, strokeWidth?: number, className?: string}) {
  const Cmp = L[name]
  // @ts-ignore
  return <Cmp size={size} strokeWidth={strokeWidth} className={className} />
}
