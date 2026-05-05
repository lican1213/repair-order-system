import { Navigate, Outlet } from 'react-router-dom'
import NewOrderAlert from '../components/NewOrderAlert'

export default function ProtectedRoute() {
  const token = localStorage.getItem('token')

  if (!token) {
    return <Navigate to="/admin" replace />
  }

  return (
    <>
      <NewOrderAlert />
      <Outlet />
    </>
  )
}
