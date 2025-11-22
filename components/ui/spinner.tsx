import { Loader2Icon } from 'lucide-react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const spinnerVariants = cva(
  'animate-spin',
  {
    variants: {
      size: {
        default: 'size-4',
        sm: 'size-2',
        lg: 'size-8',
        icon: 'size-4'
      },
    },
    defaultVariants: {
      size: 'default',
    },
  },
)

interface SpinnerProps extends React.SVGAttributes<SVGSVGElement>, VariantProps<typeof spinnerVariants> {
  
}


function Spinner({ className, size, ...props }: SpinnerProps) {
  return (
    <Loader2Icon
      role="status"
      aria-label="Loading"
      className={cn(spinnerVariants({ size }), className)}
      {...props}
    />
  )
}

export { Spinner }
