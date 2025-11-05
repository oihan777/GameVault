'use client'

import { Star } from 'lucide-react'
import { useState } from 'react'

interface StarRatingProps {
  value: number
  onChange: (value: number) => void
  max?: number
  size?: 'sm' | 'md' | 'lg'
  readonly?: boolean
  className?: string
}

export function StarRating({ 
  value, 
  onChange, 
  max = 5, 
  size = 'md', 
  readonly = false,
  className = ''
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState(0)
  
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }
  
  const containerSizeClasses = {
    sm: 'gap-1',
    md: 'gap-1.5',
    lg: 'gap-2'
  }

  const handleStarClick = (starValue: number) => {
    if (!readonly) {
      onChange(starValue)
    }
  }

  const handleMouseEnter = (starValue: number) => {
    if (!readonly) {
      setHoverValue(starValue)
    }
  }

  const handleMouseLeave = () => {
    if (!readonly) {
      setHoverValue(0)
    }
  }

  return (
    <div className={`flex items-center ${containerSizeClasses[size]} ${className}`}>
      {[...Array(max)].map((_, index) => {
        const starValue = index + 1
        const isFilled = starValue <= (hoverValue || value)
        const isHalfFilled = !isFilled && starValue - 0.5 <= (hoverValue || value)
        
        return (
          <button
            key={index}
            type="button"
            onClick={() => handleStarClick(starValue)}
            onMouseEnter={() => handleMouseEnter(starValue)}
            onMouseLeave={handleMouseLeave}
            className={`
              ${sizeClasses[size]} 
              transition-all duration-200 
              ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}
              ${!readonly && 'transform active:scale-95'}
            `}
            disabled={readonly}
          >
            <Star
              className={`
                ${sizeClasses[size]}
                transition-all duration-200
                ${isFilled 
                  ? 'fill-yellow-400 text-yellow-400 drop-shadow-lg' 
                  : isHalfFilled 
                    ? 'fill-yellow-200/50 text-yellow-200/50' 
                    : 'fill-transparent text-slate-600 hover:text-yellow-300'
                }
                ${!readonly && 'hover:text-yellow-400'}
              `}
            />
          </button>
        )
      })}
      {!readonly && (
        <span className="ml-2 text-sm text-slate-400">
          {value}/{max}
        </span>
      )}
    </div>
  )
}