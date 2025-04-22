interface Window {
  va?: {
    track: (event: string, properties?: Record<string, string | number | boolean>) => void
  }
}
