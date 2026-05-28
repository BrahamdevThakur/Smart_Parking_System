import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { CalendarCheck, MapPin, Car, Clock, CheckCircle2, XCircle, Loader2, DollarSign, Ban } from 'lucide-react'
import { format } from 'date-fns'

const STATUS_FILTERS = ['All', 'Active', 'Completed', 'Cancelled']

function ReservationCard({ r, onCancel, cancelling }) {
  const statusConfig = {
    Active: { cls: 'badge-active', icon: Clock, dot: 'bg-emerald-500' },
    Completed: { cls: 'badge-completed', icon: CheckCircle2, dot: 'bg-slate-500' },
    Cancelled: { cls: 'badge-cancelled', icon: XCircle, dot: 'bg-red-500' },
  }
  const { cls, icon: StatusIcon, dot } = statusConfig[r.status] || statusConfig.Active

  return (
    <div className="card p-5 hover:border-slate-700/60 transition-all">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center">
              <Car size={18} className="text-slate-400" />
            </div>
            <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ${dot} border-2 border-slate-900`} />
          </div>
          <div>
            <p className="font-semibold text-white text-sm">{r.lot_name}</p>
            <p className="text-xs text-slate-500">Slot <span className="font-mono text-slate-400">{r.slot_number}</span></p>
          </div>
        </div>
        <span className={cls}><StatusIcon size={11} />{r.status}</span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm mb-4">
        <div>
          <p className="text-xs text-slate-500 mb-0.5">Vehicle</p>
          <p className="text-slate-200 font-mono font-medium">{r.plate_number}</p>
          <p className="text-xs text-slate-500">{r.type_name}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-0.5">Cost</p>
          <p className="text-brand-400 font-semibold font-mono">${r.total_cost}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-0.5 flex items-center gap-1"><Clock size={10} />Start</p>
          <p className="text-slate-200 text-xs">{format(new Date(r.start_time), 'MMM d, yyyy HH:mm')}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-0.5 flex items-center gap-1"><Clock size={10} />End</p>
          <p className="text-slate-200 text-xs">{format(new Date(r.end_time), 'MMM d, yyyy HH:mm')}</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-slate-800/60">
        <span className="text-xs text-slate-600">#{r.reservation_id} · Booked {format(new Date(r.created_at), 'MMM d')}</span>
        {r.status === 'Active' && (
          <button
            onClick={() => onCancel(r.reservation_id)}
            disabled={cancelling}
            className="btn-danger text-xs px-3 py-1.5 flex items-center gap-1.5"
          >
            {cancelling ? <Loader2 size={12} className="animate-spin" /> : <Ban size={12} />}
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}

export default function MyReservationsPage() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState('All')
  const [cancellingId, setCancellingId] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['my-reservations'],
    queryFn: () => api.get('/reservations/my').then(r => r.data),
    refetchInterval: 60_000,
  })

  const cancelMutation = useMutation({
    mutationFn: (id) => api.patch(`/reservations/${id}/cancel`),
    onSuccess: () => {
      toast.success('Reservation cancelled')
      queryClient.invalidateQueries({ queryKey: ['my-reservations'] })
      queryClient.invalidateQueries({ queryKey: ['lot-slots'] })
      setCancellingId(null)
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to cancel')
      setCancellingId(null)
    },
  })

  const handleCancel = (id) => {
    if (window.confirm('Cancel this reservation?')) {
      setCancellingId(id)
      cancelMutation.mutate(id)
    }
  }

  const reservations = data?.reservations || []
  const filtered = filter === 'All' ? reservations : reservations.filter(r => r.status === filter)

  const counts = STATUS_FILTERS.reduce((acc, s) => {
    acc[s] = s === 'All' ? reservations.length : reservations.filter(r => r.status === s).length
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">My Bookings</h1>
        <p className="text-slate-400 mt-1">Track and manage all your parking reservations</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
              filter === s
                ? 'bg-brand-500/20 text-brand-300 border-brand-500/40'
                : 'bg-slate-800/50 text-slate-400 border-slate-700/50 hover:border-slate-600'
            }`}
          >
            {s} <span className="ml-1 text-xs opacity-70">{counts[s]}</span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-7 h-7 text-brand-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <CalendarCheck className="w-12 h-12 text-slate-700 mx-auto mb-4" />
          <p className="text-slate-300 font-medium">
            {filter === 'All' ? 'No bookings yet' : `No ${filter.toLowerCase()} bookings`}
          </p>
          {filter === 'All' && (
            <Link to="/parking" className="btn-primary mt-5 text-sm inline-flex items-center gap-2">
              <MapPin size={15} /> Browse Parking Lots
            </Link>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(r => (
            <ReservationCard
              key={r.reservation_id}
              r={r}
              onCancel={handleCancel}
              cancelling={cancellingId === r.reservation_id}
            />
          ))}
        </div>
      )}
    </div>
  )
}
