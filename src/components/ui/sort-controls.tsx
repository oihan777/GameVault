'use client'

import { ArrowUpDown, ArrowUp, ArrowDown, SortAsc, SortDesc, Calendar, Star, Hash } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type SortOption = 'title-asc' | 'title-desc' | 'rating-asc' | 'rating-desc' | 'date-asc' | 'date-desc'

interface SortControlsProps {
  value: SortOption
  onChange: (value: SortOption) => void
  className?: string
}

const sortOptions = [
  { value: 'title-asc', label: 'Title A-Z', icon: SortAsc },
  { value: 'title-desc', label: 'Title Z-A', icon: SortDesc },
  { value: 'rating-asc', label: 'Rating Low to High', icon: ArrowUp },
  { value: 'rating-desc', label: 'Rating High to Low', icon: ArrowDown },
  { value: 'date-asc', label: 'Oldest First', icon: Calendar },
  { value: 'date-desc', label: 'Newest First', icon: Calendar }
]

export function SortControls({ value, onChange, className = '' }: SortControlsProps) {
  const currentOption = sortOptions.find(option => option.value === value)
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50">
        {currentOption?.icon && (
          <currentOption.icon className="w-4 h-4 text-violet-400" />
        )}
        <span className="text-sm text-slate-300">Sort by</span>
      </div>
      
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-48 bg-slate-800/50 backdrop-blur-sm border-slate-700/50 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 h-10 rounded-xl">
          <SelectValue placeholder="Sort by..." />
        </SelectTrigger>
        <SelectContent className="bg-slate-900/95 backdrop-blur-xl border-slate-800/50">
          {sortOptions.map((option) => (
            <SelectItem key={option.value} value={option.value} className="hover:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <option.icon className="w-4 h-4 text-violet-400" />
                <span>{option.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}