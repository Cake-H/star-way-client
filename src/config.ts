/** 与后端约定：/api/v1/app 为 app 端前缀 */
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8088/api/v1/app'

export const AUTH_TOKEN_KEY = 'ida_auth_token'
