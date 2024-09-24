import { LucideIcon } from "@fileverse/ui"

export const Spinner = () => {
  return (
    <div className="flex items-center justify-center">
      <LucideIcon
        name="LoaderCircle"
        size="lg"
        className="animate-spin"
        fill="transparent"
        stroke="currentColor"
      />
    </div>
  )
}
