import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { ArrowLeft, Car, Clock, DollarSign, CheckCircle2, XCircle, Info, Loader2 } from 'lucide-react'
import { format, addHours } from 'date-fns'

function toLocalInput(date) {
  const d = new Date(date)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

function SlotGrid({ slots, selectedSlot, onSelect }) {
  if (!slots?.length) return <p className="text-slate-500 text-sm">No slots available.</p>
  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
      {slots.map(slot => {
        const unavailable = slot.booked_in_window || slot.is_occupied
        const isSelected = selectedSlot?.slot_id === slot.slot_id

        return (
          <button
            key={slot.slot_id}
            onClick={() => !unavailable && onSelect(slot)}
            disabled={unavailable}
            className={`
              slot-card relative flex flex-col items-center justify-center rounded-xl py-3 px-2 text-xs font-mono font-semibold border transition-all duration-150
              ${unavailable
                ? 'bg-red-500/10 border-red-500/20 text-red-400/60 cursor-not-allowed'
                : isSelected
                ? 'bg-brand-500/25 border-brand-500/60 text-brand-300 ring-2 ring-brand-500/40 shadow-lg shadow-brand-500/10'
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/40 cursor-pointer'
              }
            `}
          >
            <Car size={13} className="mb-1 opacity-70" />
            {slot.slot_number}
            {isSelected && (
              <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-brand-500 rounded-full flex items-center justify-center">
                <CheckCircle2 size={10} className="text-white" />
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}

export default function LotDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const now = new Date()
  const defaultStart = toLocalInput(addHours(now, 1))
  const defaultEnd = toLocalInput(addHours(now, 3))

  const [startTime, setStartTime] = useState(defaultStart)
  const [endTime, setEndTime] = useState(defaultEnd)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [selectedVehicle, setSelectedVehicle] = useState('')
  const [showBooking, setShowBooking] = useState(false)

  // Lot + slots query — re-runs when time window changes
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['lot-slots', id, startTime, endTime],
    queryFn: () => api.get(`/parking/lots/${id}/slots`, { params: { start_time: startTime, end_time: endTime } }).then(r => r.data),
    enabled: !!id,
  })

  const { data: vehiclesData } = useQuery({
    queryKey: ['my-vehicles'],
    queryFn: () => api.get('/vehicles').then(r => r.data),
  })

  const bookMutation = useMutation({
    mutationFn: (payload) => api.post('/reservations', payload),
    onSuccess: (res) => {
      toast.success('Slot booked successfully! 🎉')
      queryClient.invalidateQueries({ queryKey: ['lot-slots', id] })
      queryClient.invalidateQueries({ queryKey: ['my-reservations'] })
      setSelectedSlot(null)
      setShowBooking(false)
      refetch()
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Booking failed. Please try again.')
    },
  })

  const hours = startTime && endTime
    ? Math.max(0, (new Date(endTime) - new Date(startTime)) / 3600000)
    : 0
  const cost = hours * parseFloat(data?.lot?.base_rate || 0)

  const handleBook = () => {
    if (!selectedSlot) return toast.error('Please select a slot')
    if (!selectedVehicle) return toast.error('Please select a vehicle')
    if (!startTime || !endTime) return toast.error('Please set start and end time')
    if (new Date(endTime) <= new Date(startTime)) return toast.error('End time must be after start time')
    bookMutation.mutate({
      slot_id: selectedSlot.slot_id,
      vehicle_id: parseInt(selectedVehicle),
      start_time: new Date(startTime).toISOString(),
      end_time: new Date(endTime).toISOString(),
    })
  }

  const lot = data?.lot
  const slots = data?.slots || []
  const availableCount = slots.filter(s => !s.booked_in_window && !s.is_occupied).length

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back + title */}
      <div>
        <Link to="/parking" className="flex items-center gap-2 text-slate-400 hover:text-slate-200 text-sm mb-4 transition-colors w-fit">
          <ArrowLeft size={16} /> Back to lots
        </Link>
        {lot && (
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-white">{lot.lot_name}</h1>
              <div className="flex items-center gap-4 mt-1.5">
                <span className="flex items-center gap-1.5 text-sm text-slate-400">
                  <DollarSign size={14} className="text-slate-500" />${lot.base_rate}/hr
                </span>
                <span className="flex items-center gap-1.5 text-sm text-slate-400">
                  <Car size={14} className="text-slate-500" />{lot.total_capacity} total capacity
                </span>
                <span className={`badge border ${availableCount > 0 ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' : 'bg-red-500/15 text-red-400 border-red-500/20'}`}>
                  {availableCount} available
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Time selector */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
          <Clock size={15} className="text-brand-400" /> Select Time Window
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Start Time</label>
            <input
              type="datetime-local"
              className="input"
              value={startTime}
              onChange={e => { setStartTime(e.target.value); setSelectedSlot(null) }}
              min={toLocalInput(now)}
            />
          </div>
          <div>
            <label className="label">End Time</label>
            <input
              type="datetime-local"
              className="input"
              value={endTime}
              onChange={e => { setEndTime(e.target.value); setSelectedSlot(null) }}
              min={startTime}
            />
          </div>
        </div>
        {hours > 0 && (
          <div className="mt-3 flex items-center gap-2 text-sm text-slate-400">
            <Info size={13} className="text-brand-400" />
            Duration: <span className="text-white font-medium">{hours.toFixed(1)} hrs</span>
            {lot && <> · Estimated cost: <span className="text-brand-400 font-semibold font-mono">${cost.toFixed(2)}</span></>}
          </div>
        )}
      </div>

      {/* Slot grid */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-300">Parking Slots</h2>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-3 h-3 rounded-sm bg-emerald-500/30 border border-emerald-500/40" />Available
            </span>
            <span className="flex items-center gap-1.5 text-red-400">
              <span className="w-3 h-3 rounded-sm bg-red-500/20 border border-red-500/30" />Booked
            </span>
            <span className="flex items-center gap-1.5 text-brand-400">
              <span className="w-3 h-3 rounded-sm bg-brand-500/30 border border-brand-500/50 ring-1 ring-brand-500/40" />Selected
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
          </div>
        ) : (
          <SlotGrid slots={slots} selectedSlot={selectedSlot} onSelect={(s) => { setSelectedSlot(s); setShowBooking(true) }} />
        )}
      </div>

      {/* Booking panel */}
      {showBooking && selectedSlot && (
        <div className="card p-5 border-brand-500/30 animate-slide-up">
          <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <CheckCircle2 size={15} className="text-brand-400" /> Confirm Booking — Slot {selectedSlot.slot_number}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="label">Select Vehicle</label>
              <select
                className="input"
                value={selectedVehicle}
                onChange={e => setSelectedVehicle(e.target.value)}
              >
                <option value="">Choose a vehicle...</option>
                {vehiclesData?.vehicles?.map(v => (
                  <option key={v.vehicle_id} value={v.vehicle_id}>
                    {v.plate_number} ({v.type_name})
                  </option>
                ))}
              </select>
              {vehiclesData?.vehicles?.length === 0 && (
                <p className="text-xs text-amber-400 mt-1.5">
                  No vehicles found. <Link to="/vehicles" className="underline">Add one first.</Link>
                </p>
              )}
            </div>

            {/* Summary */}
            <div className="bg-slate-800/50 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between text-slate-400">
                <span>Lot</span><span className="text-slate-200">{lot?.lot_name}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Slot</span><span className="text-slate-200 font-mono">{selectedSlot.slot_number}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Start</span><span className="text-slate-200">{startTime ? format(new Date(startTime), 'MMM d, HH:mm') : '—'}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>End</span><span className="text-slate-200">{endTime ? format(new Date(endTime), 'MMM d, HH:mm') : '—'}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Duration</span><span className="text-slate-200">{hours.toFixed(1)} hrs</span>
              </div>
              <div className="border-t border-slate-700/60 pt-2 flex justify-between font-semibold">
                <span className="text-slate-300">Total Cost</span>
                <span className="text-brand-400 font-mono text-base">${cost.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowBooking(false); setSelectedSlot(null) }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleBook}
                disabled={bookMutation.isPending || !selectedVehicle}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {bookMutation.isPending ? (
                  <><Loader2 size={16} className="animate-spin" />Booking...</>
                ) : (
                  <><CheckCircle2 size={16} />Confirm Booking</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
