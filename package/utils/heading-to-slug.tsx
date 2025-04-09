export function headingToSlug(heading: string): string {
  return heading
    .split(/\s+/)
    .slice(0, 10)
    .join(' ')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // remove special characters except space and hyphen
    .replace(/\s+/g, '-') // replace spaces with hyphens
    .replace(/-+/g, '-'); // collapse multiple hyphens
}
