import { createContext, type Context } from 'react'

/**
 * A React context that survives Vite hot reloads.
 *
 * When a file that defines a context is hot-reloaded, the module runs again and
 * `createContext` returns a NEW context object. Components that already picked
 * up the new module then look for a provider that does not exist yet
 * ("useX must be used within XProvider"). Keeping one context object per name
 * on `globalThis` makes old and new module copies share it. In production
 * there is exactly one module copy, so this behaves like `createContext`.
 */
export function stableContext<T>(name: string, defaultValue: T): Context<T> {
  const store = ((globalThis as Record<string, unknown>).__astrotwinContexts ??= {}) as Record<string, Context<unknown>>
  return (store[name] ??= createContext<unknown>(defaultValue)) as Context<T>
}
