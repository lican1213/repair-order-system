import axios from 'axios'

const client = axios.create({
  baseURL: '',
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器：自动附加 JWT
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器：401 时清除 token 并跳转登录
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      if (!window.location.pathname.startsWith('/admin')) {
        window.location.href = '/admin'
      }
    }
    return Promise.reject(error)
  }
)

export default client
