import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, Car, MapPin, CalendarCheck,
  LogOut, Menu, X, ShieldCheck, ParkingSquare, ChevronRight
} from 'lucide-react'

const navItems = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/parking',      icon: MapPin,          label: 'Parking Lots' },
  { to: '/vehicles',     icon: Car,             label: 'My Vehicles' },
  { to: '/reservations', icon: CalendarCheck,   label: 'My Bookings' },
  { to: '/admin',        icon: ShieldCheck,     label: 'Admin Panel' },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const NavContent = () => (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800/60">
        <div className="w-9 h-9 bg-brand-500/20 rounded-xl flex items-center justify-center ring-1 ring-brand-500/30">
          <ParkingSquare className="w-5 h-5 text-brand-400" />
        </div>
        <div>
          <span className="font-bold text-white text-[15px] tracking-tight">ParkSmart</span>
          <p className="text-[10px] text-slate-500 -mt-0.5">Management System</p>
        </div>
      </div>

      {/* User info */}
      <div className="px-4 py-4 border-b border-slate-800/60">
        <div className="bg-slate-800/50 rounded-xl px-3 py-2.5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-cyan-400 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
            {user?.full_name?.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-100 truncate">{user?.full_name}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-3 mb-3">Menu</p>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group
               ${isActive
                 ? 'bg-brand-500/15 text-brand-400 ring-1 ring-brand-500/20'
                 : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-100'}`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`w-4.5 h-4.5 flex-shrink-0 ${isActive ? 'text-brand-400' : 'text-slate-500 group-hover:text-slate-300'}`} size={18} />
                <span className="flex-1">{label}</span>
                {isActive && <ChevronRight size={14} className="text-brand-400/50" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-slate-800/60">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400
                     hover:bg-red-500/10 hover:text-red-400 transition-all duration-150 w-full group"
        >
          <LogOut size={18} className="group-hover:text-red-400 transition-colors" />
          Sign Out
        </button>
      </div>
    </>
  )

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-slate-900/95 border-r border-slate-800/60 flex-shrink-0">
        <NavContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-slate-800 text-slate-400"
            >
              <X size={18} />
            </button>
            <NavContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile topbar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-slate-800/60 bg-slate-900/80">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <ParkingSquare className="w-5 h-5 text-brand-400" />
            <span className="font-bold text-white">ParkSmart</span>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 lg:py-8 page-enter">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
