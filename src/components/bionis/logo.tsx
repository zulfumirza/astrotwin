import type { SVGProps } from 'react'

/**
 * AstroTwin mark (from AstroTwin-logo-kit): a planet with a pulse line, its
 * "twin" outline and an orbit. Colours follow the kit: dark-on-light in the
 * light theme (#0C121C / #2F7DE1) and light-on-dark in the dark theme
 * (#E6EBF3 / #7DB8FF). Stroke weights are the kit's small-size variant.
 */
export function AstroTwinLogo({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="70 70 660 660"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <circle cx="305" cy="400" r="190" className="fill-[#0C121C] dark:fill-[#E6EBF3]" />
      <path
        d="M 330 400 L 365 400 L 378 380 L 392 418 L 408 325 L 425 482 L 440 382 L 452 400 L 492 400"
        className="stroke-white dark:stroke-[#0C121C]"
        strokeWidth="28.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="495" cy="400" r="187" className="stroke-[#2F7DE1] dark:stroke-[#7DB8FF]" strokeWidth="34" />
      <ellipse
        cx="400"
        cy="400"
        rx="396"
        ry="92"
        className="stroke-[#2F7DE1] dark:stroke-[#7DB8FF]"
        strokeWidth="34"
        transform="rotate(-39.7 400 400)"
      />
    </svg>
  )
}

/** Wordmark as in the kit: bold "Astro" + blue monospace "Twin". */
export function AstroTwinWordmark({ className }: { className?: string }) {
  return (
    <span className={className}>
      <span className="font-bold tracking-tight">Astro</span>
      <span className="font-mono font-normal text-[#2F7DE1] dark:text-[#7DB8FF]">Twin</span>
    </span>
  )
}

/** Kept for existing imports in the design components. */
export const BionisLogo = AstroTwinLogo
