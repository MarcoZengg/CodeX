// Get API URL from environment variable
// In development: VITE_API_URL=http://localhost:8000
// In production: VITE_API_URL=https://api.yourdomain.com
// Fallback to localhost for development if not set
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

