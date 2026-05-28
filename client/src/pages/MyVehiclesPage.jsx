import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { Car, Plus, Trash2, Loader2, Tag } from 'lucide-react'

const typeIcons = { Car: '🚗', Motorcycle: '🏍️', Truck: '🚛', Van: '🚐', 'Electric Vehicle': '⚡' }

export default function MyVehiclesPage() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ plate_number: '', type_id: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['my-vehicles'],
    queryFn: () => api.get('/vehicles').then(r => r.data),
  })

  const { data: typesData } = useQuery({
    queryKey: ['vehicle-types'],
    queryFn: () => api.get('/vehicles/types').then(r => r.data),
  })

  const addMutation = useMutation({
    mutationFn: (payload) => api.post('/vehicles', payload),
    onSuccess: () => {
      toast.success('Vehicle added!')
      queryClient.invalidateQueries({ queryKey: ['my-vehicles'] })
      setForm({ plate_number: '', type_id: '' })
      setShowForm(false)
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to add vehicle'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/vehicles/${id}`),
    onSuccess: () => {
      toast.success('Vehicle removed')
      queryClient.invalidateQueries({ queryKey: ['my-vehicles'] })
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to remove vehicle'),
  })

  const handleAdd = (e) => {
    e.preventDefault()
    if (!form.plate_number.trim()) return toast.error('Plate number required')
    if (!form.type_id) return toast.error('Vehicle type required')
    addMutation.mutate(form)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">My Vehicles</h1>
          <p className="text-slate-400 mt-1">Manage vehicles for parking reservations</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <Plus size={16} />Add Vehicle
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="card p-5 border-brand-500/30 animate-slide-up">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Add New Vehicle</h2>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="label">Plate Number</label>
              <input
                type="text"
                className="input uppercase"
                placeholder="e.g. BA 1 CHA 1234"
                value={form.plate_number}
                onChange={e => setForm(f => ({ ...f, plate_number: e.target.value.toUpperCase() }))}
                required
              />
            </div>
            <div>
              <label className="label">Vehicle Type</label>
              <select className="input" value={form.type_id} onChange={e => setForm(f => ({ ...f, type_id: e.target.value }))} required>
                <option value="">Select type...</option>
                {typesData?.types?.map(t => (
                  <option key={t.type_id} value={t.type_id}>
                    {typeIcons[t.type_name] || '🚘'} {t.type_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1 text-sm">
                Cancel
              </button>
              <button type="submit" className="btn-primary flex-1 text-sm flex items-center justify-center gap-2" disabled={addMutation.isPending}>
                {addMutation.isPending ? <><Loader2 size={14} className="animate-spin" />Adding...</> : <><Plus size={14} />Add Vehicle</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Vehicle list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-7 h-7 text-brand-500 animate-spin" />
        </div>
      ) : data?.vehicles?.length === 0 ? (
        <div className="card p-12 text-center">
          <Car className="w-12 h-12 text-slate-700 mx-auto mb-4" />
          <p className="text-slate-300 font-medium">No vehicles added yet</p>
          <p className="text-slate-500 text-sm mt-1">Add your vehicle to start booking parking slots</p>
          <button onClick={() => setShowForm(true)} className="btn-primary mt-5 text-sm flex items-center gap-2 mx-auto">
            <Plus size={15} /> Add First Vehicle
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {data?.vehicles?.map(v => (
            <div key={v.vehicle_id} className="card px-5 py-4 flex items-center gap-4 hover:border-slate-700/80 transition-colors">
              <div className="w-11 h-11 bg-slate-800 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                {typeIcons[v.type_name] || '🚘'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white font-mono tracking-wide">{v.plate_number}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Tag size={11} className="text-slate-500" />
                  <span className="text-xs text-slate-400">{v.type_name}</span>
                </div>
              </div>
              <button
                onClick={() => {
                  if (window.confirm(`Remove ${v.plate_number}?`)) deleteMutation.mutate(v.vehicle_id)
                }}
                disabled={deleteMutation.isPending}
                className="btn-danger p-2 aspect-square"
                title="Remove vehicle"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
