/** 与后端约定：/api/v1/app 为 app 端前缀 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

export const AUTH_TOKEN_KEY = 'ida_auth_token'

/** 浏览器扩展商店链接（运营/部署前填入真实地址） */
export const EXTENSION_STORE_URLS = {
  chrome: import.meta.env.VITE_EXTENSION_CHROME_URL || '',
  edge: import.meta.env.VITE_EXTENSION_EDGE_URL || '',
  firefox: import.meta.env.VITE_EXTENSION_FIREFOX_URL || '',
}

/** 扩展在浏览器的显示名称（与插件 manifest 保持一致） */
export const EXTENSION_NAME = '智能投递助手'
