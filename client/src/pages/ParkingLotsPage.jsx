import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../utils/api'
import { MapPin, Car, DollarSign, ArrowRight, Loader2 } from 'lucide-react'

function LotCard({ lot }) {
  const available = parseInt(lot.available_slots)
  const total = parseInt(lot.total_slots)
  const pct = total > 0 ? ((total - available) / total) * 100 : 0
  const availPct = total > 0 ? (available / total) * 100 : 0

  const barColor = availPct > 50 ? 'bg-emerald-500' : availPct > 20 ? 'bg-amber-500' : 'bg-red-500'
  const badgeColor = availPct > 50
    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
    : availPct > 20
    ? 'bg-amber-500/15 text-amber-400 border-amber-500/20'
    : 'bg-red-500/15 text-red-400 border-red-500/20'

  return (
    <Link to={`/parking/${lot.lot_id}`} className="card p-6 hover:border-brand-500/30 transition-all duration-200 group block">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 bg-brand-500/15 rounded-lg flex items-center justify-center">
              <MapPin size={16} className="text-brand-400" />
            </div>
            <h3 className="font-semibold text-white text-base">{lot.lot_name}</h3>
          </div>
        </div>
        <span className={`badge border ${badgeColor}`}>
          {available > 0 ? `${available} free` : 'Full'}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-slate-500 mb-1.5">
          <span>{available} of {total} slots available</span>
          <span>{Math.round(availPct)}% free</span>
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full ${barColor} rounded-full transition-all duration-500`}
            style={{ width: `${availPct}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-sm text-slate-400">
            <Car size={14} className="text-slate-500" />
            {lot.total_capacity} capacity
          </div>
          <div className="flex items-center gap-1.5 text-sm text-slate-400">
            <DollarSign size={14} className="text-slate-500" />
            ${lot.base_rate}/hr
          </div>
        </div>
        <div className="flex items-center gap-1 text-brand-400 text-sm font-medium group-hover:gap-2 transition-all">
          View slots <ArrowRight size={14} />
        </div>
      </div>
    </Link>
  )
}

export default function ParkingLotsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['parking-lots'],
    queryFn: () => api.get('/parking/lots').then(r => r.data),
    refetchInterval: 30_000,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Parking Lots</h1>
        <p className="text-slate-400 mt-1">Select a lot to view available slots and make a booking</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
        </div>
      ) : error ? (
        <div className="card p-8 text-center text-red-400">Failed to load parking lots.</div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {data?.lots?.map(lot => <LotCard key={lot.lot_id} lot={lot} />)}
        </div>
      )}

      {data?.lots?.length === 0 && (
        <div className="card p-10 text-center">
          <MapPin className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400">No parking lots available.</p>
        </div>
      )}
    </div>
  )
}
