import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import { MapPin, Car, CalendarCheck, TrendingUp, ArrowRight, Clock, CheckCircle2, XCircle } from 'lucide-react'
import { format } from 'date-fns'

function StatCard({ icon: Icon, label, value, color, to }) {
  const content = (
    <div className={`card p-5 hover:border-slate-700/80 transition-colors group`}>
      <div className="flex items-start justify-between">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={20} />
        </div>
        {to && <ArrowRight size={16} className="text-slate-600 group-hover:text-slate-400 transition-colors mt-1" />}
      </div>
      <p className="text-3xl font-bold text-white mt-4">{value ?? '—'}</p>
      <p className="text-sm text-slate-400 mt-1">{label}</p>
    </div>
  )
  return to ? <Link to={to}>{content}</Link> : content
}

const statusIcon = { Active: Clock, Completed: CheckCircle2, Cancelled: XCircle }
const statusClass = { Active: 'badge-active', Completed: 'badge-completed', Cancelled: 'badge-cancelled' }

export default function DashboardPage() {
  const { user } = useAuth()

  const { data: reservationsData, isLoading: resLoading } = useQuery({
    queryKey: ['my-reservations'],
    queryFn: () => api.get('/reservations/my').then(r => r.data),
  })

  const { data: vehiclesData } = useQuery({
    queryKey: ['my-vehicles'],
    queryFn: () => api.get('/vehicles').then(r => r.data),
  })

  const { data: lotsData } = useQuery({
    queryKey: ['parking-lots'],
    queryFn: () => api.get('/parking/lots').then(r => r.data),
  })

  const reservations = reservationsData?.reservations || []
  const activeCount = reservations.filter(r => r.status === 'Active').length
  const recentReservations = reservations.slice(0, 5)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'},{' '}
          <span className="text-gradient">{user?.full_name?.split(' ')[0]}</span> 👋
        </h1>
        <p className="text-slate-400 mt-1">Here's your parking activity overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={CalendarCheck}
          label="Active Bookings"
          value={activeCount}
          color="bg-brand-500/15 text-brand-400"
          to="/reservations"
        />
        <StatCard
          icon={Car}
          label="My Vehicles"
          value={vehiclesData?.vehicles?.length ?? 0}
          color="bg-violet-500/15 text-violet-400"
          to="/vehicles"
        />
        <StatCard
          icon={MapPin}
          label="Parking Lots"
          value={lotsData?.lots?.length ?? 0}
          color="bg-amber-500/15 text-amber-400"
          to="/parking"
        />
        <StatCard
          icon={TrendingUp}
          label="Total Bookings"
          value={reservations.length}
          color="bg-emerald-500/15 text-emerald-400"
        />
      </div>

      {/* Quick actions */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Link to="/parking" className="card p-5 flex items-center gap-4 hover:border-brand-500/30 transition-all duration-200 group glow-brand">
          <div className="w-12 h-12 bg-brand-500/15 rounded-xl flex items-center justify-center ring-1 ring-brand-500/20 group-hover:bg-brand-500/25 transition-colors">
            <MapPin className="w-6 h-6 text-brand-400" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-white">Book a Slot</p>
            <p className="text-sm text-slate-400">Browse available parking lots</p>
          </div>
          <ArrowRight size={18} className="text-slate-600 group-hover:text-brand-400 group-hover:translate-x-1 transition-all" />
        </Link>
        <Link to="/vehicles" className="card p-5 flex items-center gap-4 hover:border-violet-500/30 transition-all duration-200 group">
          <div className="w-12 h-12 bg-violet-500/15 rounded-xl flex items-center justify-center ring-1 ring-violet-500/20 group-hover:bg-violet-500/25 transition-colors">
            <Car className="w-6 h-6 text-violet-400" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-white">Manage Vehicles</p>
            <p className="text-sm text-slate-400">Add or remove your vehicles</p>
          </div>
          <ArrowRight size={18} className="text-slate-600 group-hover:text-violet-400 group-hover:translate-x-1 transition-all" />
        </Link>
      </div>

      {/* Recent reservations */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Recent Bookings</h2>
          <Link to="/reservations" className="text-sm text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors">
            View all <ArrowRight size={14} />
          </Link>
        </div>

        {resLoading ? (
          <div className="card p-8 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : recentReservations.length === 0 ? (
          <div className="card p-10 text-center">
            <CalendarCheck className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">No bookings yet</p>
            <p className="text-slate-500 text-sm mt-1">Start by browsing parking lots</p>
            <Link to="/parking" className="btn-primary inline-flex items-center gap-2 mt-5 text-sm px-4 py-2">
              <MapPin size={16} /> Browse Lots
            </Link>
          </div>
        ) : (
          <div className="card divide-y divide-slate-800/60 overflow-hidden">
            {recentReservations.map((r) => {
              const StatusIcon = statusIcon[r.status] || Clock
              return (
                <div key={r.reservation_id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-800/30 transition-colors">
                  <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Car size={18} className="text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-100 text-sm truncate">
                      {r.lot_name} — Slot {r.slot_number}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {format(new Date(r.start_time), 'MMM d, HH:mm')} → {format(new Date(r.end_time), 'HH:mm')} · {r.plate_number}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className={statusClass[r.status]}>
                      <StatusIcon size={11} />
                      {r.status}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">${r.total_cost}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
