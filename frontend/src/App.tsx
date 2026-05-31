import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import ProtectedRoute from './routes/ProtectedRoute'
import SiteFooter from './components/SiteFooter'

import RepairForm from './pages/RepairForm'
import RepairSuccess from './pages/RepairSuccess'
import PricingPage from './pages/PricingPage'
import UsedAppliancesPage from './pages/UsedAppliancesPage'
import UsedApplianceDetail from './pages/UsedApplianceDetail'
import WarrantyPage from './pages/WarrantyPage'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'
import OrderList from './pages/OrderList'
import OrderDetail from './pages/OrderDetail'
import TodayOrders from './pages/TodayOrders'
import FollowupList from './pages/FollowupList'
import AdminProfile from './pages/AdminProfile'
import AdminUsedAppliances from './pages/AdminUsedAppliances'

function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">404</h1>
        <p className="text-gray-500">页面不存在</p>
        <a href="/repair" className="text-blue-600 mt-4 inline-block">返回首页</a>
      </div>
    </div>
  )
}

function PublicPage({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <SiteFooter />
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 默认重定向 */}
        <Route path="/" element={<Navigate to="/repair" replace />} />

        {/* 公开页面 */}
        <Route path="/repair" element={<PublicPage><RepairForm /></PublicPage>} />
        <Route path="/repair/success" element={<PublicPage><RepairSuccess /></PublicPage>} />
        <Route path="/pricing" element={<PublicPage><PricingPage /></PublicPage>} />
        <Route path="/used" element={<PublicPage><UsedAppliancesPage /></PublicPage>} />
        <Route path="/used/:id" element={<PublicPage><UsedApplianceDetail /></PublicPage>} />
        <Route path="/warranty/t/:token" element={<PublicPage><WarrantyPage /></PublicPage>} />

        {/* 后台登录 */}
        <Route path="/admin" element={<AdminLogin />} />

        {/* 后台页面（需登录） */}
        <Route element={<ProtectedRoute />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/orders" element={<OrderList />} />
          <Route path="/admin/orders/:id" element={<OrderDetail />} />
          <Route path="/admin/today" element={<TodayOrders />} />
          <Route path="/admin/followups" element={<FollowupList />} />
          <Route path="/admin/used-appliances" element={<AdminUsedAppliances />} />
          <Route path="/admin/profile" element={<AdminProfile />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<PublicPage><NotFound /></PublicPage>} />
      </Routes>
    </BrowserRouter>
  )
}
