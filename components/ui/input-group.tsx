import * as React from 'react'

import { cn } from '@/lib/utils'

function InputGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="input-group"
      role="group"
      className={cn(
        'group/input-group border-input dark:bg-input/30 relative flex w-full items-center rounded-lg border shadow-xs transition-[color,box-shadow] outline-none',
        'h-9 min-w-0 has-[>textarea]:h-auto',
        'has-[>[data-align=inline-start]]:[&>input]:pl-2',
        'has-[>[data-align=inline-end]]:[&>input]:pr-2',
        'has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-ring/50 has-[[data-slot=input-group-control]:focus-visible]:ring-[3px]',
        className,
      )}
      {...props}
    />
  )
}

function InputGroupAddon({
  className,
  align = 'inline-start',
  ...props
}: React.ComponentProps<'div'> & {
  align?: 'inline-start' | 'inline-end' | 'block-start' | 'block-end'
}) {
  return (
    <div
      role="group"
      data-slot="input-group-addon"
      data-align={align}
      className={cn(
        "text-muted-foreground flex h-auto cursor-text items-center justify-center gap-2 py-1.5 text-sm font-medium select-none [&>svg:not([class*='size-'])]:size-4",
        className,
      )}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button')) return
        e.currentTarget.parentElement?.querySelector('input')?.focus()
      }}
      {...props}
    />
  )
}

function InputGroupInput({
  className,
  ...props
}: React.ComponentProps<'input'>) {
  return (
    <input
      data-slot="input-group-control"
      className={cn(
        'flex-1 min-w-0 rounded-none border-0 bg-transparent shadow-none outline-none focus-visible:ring-0 dark:bg-transparent text-foreground placeholder:text-muted-foreground',
        className,
      )}
      {...props}
    />
  )
}

export { InputGroup, InputGroupAddon, InputGroupInput }
