import { HashRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import {
  LayoutDashboard, Users, CalendarCheck, Package, Sparkles,
  CreditCard, BarChart3, Star
} from 'lucide-react'

import Dashboard    from './pages/Dashboard.jsx'
import Customers    from './pages/Customers.jsx'
import Bookings     from './pages/Bookings.jsx'
import Packages     from './pages/Packages.jsx'
import AddOnServices from './pages/AddOnServices.jsx'
import Payments     from './pages/Payments.jsx'
import Reports      from './pages/Reports.jsx'

const NAV = [
  { group: 'Overview', items: [
    { to: '/',         icon: LayoutDashboard, label: 'Dashboard' },
  ]},
  { group: 'Management', items: [
    { to: '/customers',  icon: Users,         label: 'Customers' },
    { to: '/bookings',   icon: CalendarCheck, label: 'Bookings' },
    { to: '/packages',   icon: Package,       label: 'Packages' },
    { to: '/services',   icon: Sparkles,      label: 'Add-on Services' },
  ]},
  { group: 'Finance', items: [
    { to: '/payments',   icon: CreditCard,    label: 'Payments' },
    { to: '/reports',    icon: BarChart3,     label: 'Reports' },
  ]},
]

function PAGE_TITLES() {
  return {
    '/':          'Dashboard',
    '/customers': 'Customers',
    '/bookings':  'Bookings',
    '/packages':  'Hall Packages',
    '/services':  'Add-on Services',
    '/payments':  'Payments',
    '/reports':   'Reports',
  }
}

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h1>✦ Taj Banquet Hall</h1>
        <p>Booking Management System</p>
      </div>
      <nav>
        {NAV.map(g => (
          <div key={g.group}>
            <div className="nav-group-label">{g.group}</div>
            {g.items.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              >
                <item.icon size={16} />
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div>Taj Banquet Hall Management</div>
        <div style={{ marginTop: 2 }}>v1.0.0 · Active</div>
      </div>
    </aside>
  )
}

function Topbar() {
  const loc    = useLocation()
  const titles = PAGE_TITLES()
  const title  = titles[loc.pathname] || 'Taj Banquet Hall'
  const now    = new Date().toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' })
  return (
    <header className="topbar">
      <span className="topbar-title">{title}</span>
      <span className="topbar-badge">{now}</span>
    </header>
  )
}

export default function App() {
  return (
    <HashRouter>
      <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
      <div className="app-shell">
        <Sidebar />
        <div className="main">
          <Topbar />
          <main className="page">
            <Routes>
              <Route path="/"          element={<Dashboard />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/bookings"  element={<Bookings />} />
              <Route path="/packages"  element={<Packages />} />
              <Route path="/services"  element={<AddOnServices />} />
              <Route path="/payments"  element={<Payments />} />
              <Route path="/reports"   element={<Reports />} />
            </Routes>
          </main>
        </div>
      </div>
    </HashRouter>
  )
}

