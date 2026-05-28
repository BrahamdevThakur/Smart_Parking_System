import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { ShieldCheck, Users, CalendarCheck, DollarSign, MapPin, Plus, Loader2, Building2 } from 'lucide-react'

function StatBox({ icon: Icon, label, value, color }) {
  return (
    <div className="card p-5">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
        <Icon size={18} />
      </div>
      <p className="text-2xl font-bold text-white">{value ?? '—'}</p>
      <p className="text-xs text-slate-400 mt-1">{label}</p>
    </div>
  )
}

const STATUS_COLORS = {
  Active: 'badge-active',
  Completed: 'badge-completed',
  Cancelled: 'badge-cancelled',
}

export default function AdminPage() {
  const queryClient = useQueryClient()
  const [showCreateLot, setShowCreateLot] = useState(false)
  const [lotForm, setLotForm] = useState({ lot_name: '', total_capacity: '', base_rate: '' })
  const [resFilter, setResFilter] = useState('')

  const { data: statsData } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/admin/stats').then(r => r.data),
    refetchInterval: 30_000,
  })

  const { data: lotsData, isLoading: lotsLoading } = useQuery({
    queryKey: ['admin-lots'],
    queryFn: () => api.get('/admin/lots').then(r => r.data),
  })

  const { data: resData, isLoading: resLoading } = useQuery({
    queryKey: ['admin-reservations', resFilter],
    queryFn: () => api.get('/admin/reservations', { params: resFilter ? { status: resFilter } : {} }).then(r => r.data),
  })

  const createLotMutation = useMutation({
    mutationFn: (payload) => api.post('/admin/lots', payload),
    onSuccess: () => {
      toast.success('Parking lot created!')
      queryClient.invalidateQueries({ queryKey: ['admin-lots'] })
      queryClient.invalidateQueries({ queryKey: ['parking-lots'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
      setLotForm({ lot_name: '', total_capacity: '', base_rate: '' })
      setShowCreateLot(false)
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to create lot'),
  })

  const stats = statsData?.stats

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-brand-500/15 rounded-xl flex items-center justify-center ring-1 ring-brand-500/30">
          <ShieldCheck className="w-5 h-5 text-brand-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
          <p className="text-slate-400 text-sm">System overview and management</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatBox icon={Users} label="Total Users" value={stats?.users} color="bg-violet-500/15 text-violet-400" />
        <StatBox icon={CalendarCheck} label="Active Bookings" value={stats?.reservations?.active} color="bg-emerald-500/15 text-emerald-400" />
        <StatBox icon={DollarSign} label="Total Revenue ($)" value={stats?.revenue?.toFixed(2)} color="bg-amber-500/15 text-amber-400" />
        <StatBox icon={MapPin} label="Parking Lots" value={stats?.lots?.total_lots} color="bg-brand-500/15 text-brand-400" />
      </div>

      {/* Lots management */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Parking Lots</h2>
          <button onClick={() => setShowCreateLot(v => !v)} className="btn-primary text-sm flex items-center gap-2">
            <Plus size={15} />New Lot
          </button>
        </div>

        {showCreateLot && (
          <div className="card p-5 mb-4 border-brand-500/30 animate-slide-up">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Create Parking Lot</h3>
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="label">Lot Name</label>
                <input className="input" placeholder="e.g. South Bay Garage" value={lotForm.lot_name} onChange={e => setLotForm(f => ({ ...f, lot_name: e.target.value }))} />
              </div>
              <div>
                <label className="label">Total Capacity</label>
                <input type="number" className="input" placeholder="20" min={1} value={lotForm.total_capacity} onChange={e => setLotForm(f => ({ ...f, total_capacity: e.target.value }))} />
              </div>
              <div>
                <label className="label">Rate ($/hr)</label>
                <input type="number" className="input" placeholder="2.50" step="0.25" min={0} value={lotForm.base_rate} onChange={e => setLotForm(f => ({ ...f, base_rate: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowCreateLot(false)} className="btn-secondary text-sm">Cancel</button>
              <button
                onClick={() => createLotMutation.mutate(lotForm)}
                disabled={createLotMutation.isPending}
                className="btn-primary text-sm flex items-center gap-2"
              >
                {createLotMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Create Lot
              </button>
            </div>
          </div>
        )}

        {lotsLoading ? (
          <div className="flex items-center justify-center py-10"><Loader2 className="w-6 h-6 text-brand-500 animate-spin" /></div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800/60">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Lot</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Capacity</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Available</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Rate/hr</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Occupancy</th>
                </tr>
              </thead>
              <tbody>
                {lotsData?.lots?.map(lot => {
                  const occupied = parseInt(lot.occupied_slots)
                  const total = parseInt(lot.total_slots)
                  const pct = total > 0 ? Math.round((occupied / total) * 100) : 0
                  return (
                    <tr key={lot.lot_id} className="border-b border-slate-800/30 hover:bg-slate-800/20 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <Building2 size={14} className="text-slate-500" />
                          <span className="text-slate-100 font-medium">{lot.lot_name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right text-slate-400">{lot.total_capacity}</td>
                      <td className="px-5 py-3.5 text-right">
                        <span className={`font-medium ${parseInt(lot.available_slots) > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {lot.available_slots}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right text-slate-400 font-mono">${lot.base_rate}</td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${pct < 80 ? 'bg-emerald-500' : pct < 95 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-slate-500 w-8 text-right">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* All reservations */}
      <div>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="text-lg font-semibold text-white">All Reservations</h2>
          <div className="flex gap-2">
            {['', 'Active', 'Completed', 'Cancelled'].map(s => (
              <button
                key={s || 'All'}
                onClick={() => setResFilter(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${resFilter === s ? 'bg-brand-500/20 text-brand-300 border-brand-500/40' : 'bg-slate-800/50 text-slate-400 border-slate-700/50 hover:border-slate-600'}`}
              >
                {s || 'All'}
              </button>
            ))}
          </div>
        </div>

        {resLoading ? (
          <div className="flex items-center justify-center py-10"><Loader2 className="w-6 h-6 text-brand-500 animate-spin" /></div>
        ) : (
          <div className="card overflow-hidden overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-800/60">
                  {['ID', 'User', 'Lot / Slot', 'Vehicle', 'Period', 'Cost', 'Status'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {resData?.reservations?.map(r => (
                  <tr key={r.reservation_id} className="border-b border-slate-800/20 hover:bg-slate-800/20 transition-colors">
                    <td className="px-4 py-3 font-mono text-slate-500 text-xs">#{r.reservation_id}</td>
                    <td className="px-4 py-3">
                      <p className="text-slate-200 text-xs font-medium">{r.full_name}</p>
                      <p className="text-slate-500 text-xs">{r.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-200 text-xs">{r.lot_name}</p>
                      <p className="text-slate-500 text-xs font-mono">Slot {r.slot_number}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">{r.plate_number}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      <p>{format(new Date(r.start_time), 'MMM d HH:mm')}</p>
                      <p className="text-slate-600">→ {format(new Date(r.end_time), 'MMM d HH:mm')}</p>
                    </td>
                    <td className="px-4 py-3 text-brand-400 font-mono text-xs font-semibold">${r.total_cost}</td>
                    <td className="px-4 py-3">
                      <span className={STATUS_COLORS[r.status] + ' badge'}>{r.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {resData?.reservations?.length === 0 && (
              <div className="py-10 text-center text-slate-500 text-sm">No reservations found</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
