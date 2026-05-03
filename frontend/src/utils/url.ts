export function buildWarrantyUrl(token: string): string {
  return `${window.location.origin}/warranty/t/${token}`
}
