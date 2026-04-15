import React, { useEffect, useState } from 'react'
const API_BASE = import.meta.env.VITE_API_URL || '${API_BASE}'

function nextMondayISO() {
  const d = new Date()
  const day = d.getDay()
  const daysUntilMonday = (8 - day) % 7 || 7
  d.setDate(d.getDate() + daysUntilMonday)
  d.setHours(0, 0, 0, 0)
  return d.toISOString().slice(0, 10)
}

export default function EmployeeForm() {
  const [employees, setEmployees] = useState([])
  const [stores, setStores] = useState([])
  const [form, setForm] = useState({
    employeeId: '',
    weekStart: nextMondayISO(),
    offDay: '',
    notes: '',
    storePreference: ''
  })
  const [status, setStatus] = useState(null)

  useEffect(() => {
    fetch(`${API_BASE}/api/employees`)
      .then(r => r.json())
      .then(setEmployees)
  }, [])

  useEffect(() => {
    fetch(`${API_BASE}/api/stores`)
      .then(r => r.json())
      .then(setStores)
      .catch(() => setStores([]))
  }, [])

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus(null)
    // basic validation: require name, week, and a single off-day for the week
    if (!form.employeeId || !form.weekStart || !form.offDay) {
      setStatus({ error: 'Please choose your name, week start and the day you need off.' })
      return
    }

    // If a store preference was selected, ensure it's a valid store name
    if (form.storePreference) {
      const valid = stores.some(s => s.name === form.storePreference)
      if (!valid) {
        setStatus({ error: 'Please choose a valid store from the list or leave blank.' })
        return
      }
    }

    const res = await fetch(`${API_BASE}/api/restrictions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    const data = await res.json()
    if (!res.ok) setStatus({ error: data.error || 'Submission failed' })
    else {
      setStatus({ success: 'Restriction submitted — thank you!' })
      // clear offDay and notes while keeping selected name/week
      setForm(prev => ({ ...prev, offDay: '', notes: '', storePreference: '' }))
    }
  }

  return (
    <div className="form-container">
      <form onSubmit={handleSubmit} className="card">
        <label>Employee name</label>
        <select name="employeeId" value={form.employeeId} onChange={handleChange} required>
          <option value="">Select your name</option>
          {employees.map(e => (
            <option key={e.id} value={e.id}>{e.name} {e.role === 'manager' ? `(${e.homeStore})` : ''}</option>
          ))}
        </select>

        <label>Week starting (Monday)</label>
        <input type="date" name="weekStart" value={form.weekStart} onChange={handleChange} required />

        <label>Which day do you need off?</label>
        <input type="date" name="offDay" value={form.offDay} onChange={handleChange} required />

        <label>Store preference (optional)</label>
        <select name="storePreference" value={form.storePreference} onChange={handleChange}>
          <option value="">No preference</option>
          {stores.map(s => (
            <option key={s.id} value={s.name}>{s.name}</option>
          ))}
        </select>

        <label>Notes (optional)</label>
        <textarea name="notes" value={form.notes} onChange={handleChange} rows={3} />

        <button type="submit" className="primary">Submit restrictions</button>

        {status?.error && <div className="alert error">{status.error}</div>}
        {status?.success && <div className="alert success">{status.success}</div>}
      </form>
    </div>
  )
}
