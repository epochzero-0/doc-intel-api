import { isAxiosError } from 'axios'

// FastAPI puts a string in `detail` for HTTPException, and a list of field errors for validation failures.
export function errorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    if (!error.response) return 'Could not reach the server. Check your connection and try again.'
    const detail = error.response.data?.detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail) && typeof detail[0]?.msg === 'string') return detail[0].msg
  }
  return fallback
}
