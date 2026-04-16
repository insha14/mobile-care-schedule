import React, { useEffect, useRef, useState } from 'react'
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'

function nextMondayISO() {
  const d = new Date()
  const day = d.getDay()
  const daysUntilMonday = (8 - day) % 7 || 7
  d.setDate(d.getDate() + daysUntilMonday)
  d.setHours(0, 0, 0, 0)
  return d.toISOString().slice(0, 10)
}

export default function EmployeeForm({ employee, onLogout }) {
  const formRef = useRef(null)
  const [stores, setStores] = useState([])
  const [form, setForm] = useState({
    weekStart: nextMondayISO(),
    offDay: '',
    notes: '',
    storePreference: ''
  })
  const [status, setStatus] = useState(null)
  const [editingMessage, setEditingMessage] = useState('')
  const [employeeEntries, setEmployeeEntries] = useState([])
  const [existingId, setExistingId] = useState(null)
  const [skipNextLoad, setSkipNextLoad] = useState(false)
  const [justCreatedWeek, setJustCreatedWeek] = useState(null)
  const [currentEntryId, setCurrentEntryId] = useState(null)

  useEffect(() => {
    fetch(`${API_BASE}/api/stores`)
      .then(r => r.json())
      .then(setStores)
      .catch(() => setStores([]))
  }, [])

  async function fetchEntries() {
    if (!employee?.id || !employee?.pin) return
    try {
      const res = await fetch(`${API_BASE}/api/restrictions/self/all?employeeId=${encodeURIComponent(employee.id)}&pin=${encodeURIComponent(employee.pin)}`)
      if (!res.ok) return
      const data = await res.json()
      setEmployeeEntries(data)
    } catch (err) {
      // ignore load errors for now
    }
  }

  useEffect(() => {
    fetchEntries()
  }, [employee.id, employee.pin])

  useEffect(() => {
    // Reset form after successful submit
    if (skipNextLoad) {
      setSkipNextLoad(false)
      // Reset form to fresh state for next entry
      setForm({
        weekStart: nextMondayISO(),
        offDay: '',
        notes: '',
        storePreference: ''
      })
      setCurrentEntryId(null)
      setExistingId(null)
      setJustCreatedWeek(null)
      setEditingMessage('')
    }
  }, [skipNextLoad])

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (name === 'weekStart') {
      setJustCreatedWeek(null)
    }
    // If user changes form while in edit mode, we keep editing that specific entry by id
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus(null)
    if (!form.weekStart || !form.offDay) {
      setStatus({ error: 'Please choose week start and the day you need off.' })
      return
    }

    if (form.storePreference) {
      const valid = stores.some(s => s.name === form.storePreference)
      if (!valid) {
        setStatus({ error: 'Please choose a valid store from the list or leave blank.' })
        return
      }
    }

    // Check for duplicate only if creating new (not editing)
    if (!currentEntryId) {
      const duplicate = employeeEntries.find(e =>
        e.weekStart === form.weekStart &&
        e.offDay === form.offDay
      )
      if (duplicate) {
        setStatus({ error: 'A request for this day already exists for that week' })
        return
      }
    }

    const payload = { ...form, employeeId: employee.id, pin: employee.pin }
    // Include id if editing an existing entry
    if (currentEntryId) {
      payload.id = currentEntryId
    }

    console.log('Submitting payload:', payload, 'currentEntryId:', currentEntryId)
    const res = await fetch(`${API_BASE}/api/restrictions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const data = await res.json()
    if (!res.ok) {
      setStatus({ error: data.error || 'Submission failed' })
      return
    }
    setStatus({ success: data.message || 'Restriction submitted — thank you!' })
    setEditingMessage('')
    // Immediately update local state for instant UI feedback
    const newRestriction = data.restriction
    const wasNew = !employeeEntries.some(e => e.id === newRestriction.id)
    setEmployeeEntries(prev => {
      const existingIndex = prev.findIndex(e => e.id === newRestriction.id)
      if (existingIndex >= 0) {
        // Update existing (editing mode)
        const updated = [...prev]
        updated[existingIndex] = newRestriction
        return updated.sort((a, b) => (b.createdAt || b.weekStart).localeCompare(a.createdAt || a.weekStart))
      } else {
        // Add new
        return [newRestriction, ...prev].sort((a, b) => (b.createdAt || b.weekStart).localeCompare(a.createdAt || a.weekStart))
      }
    })
    // Refetch in background for consistency
    fetchEntries()
    setCurrentEntryId(null)
setExistingId(null)
setForm({
  weekStart: form.weekStart,
  offDay: '',
  notes: '',
  storePreference: ''
})
    setSkipNextLoad(true)
  }

  function handleEdit(entry) {
    // Only allow editing pending requests
    if (entry.status && entry.status !== 'pending') {
      setStatus({ error: 'Only pending requests can be edited' })
      return
    }
    setForm({
      weekStart: entry.weekStart,
      offDay: entry.offDay || '',
      notes: entry.notes || '',
      storePreference: entry.storePreference || ''
    })
    setExistingId(entry.id)
    setCurrentEntryId(entry.id)
    setJustCreatedWeek(null)
    setEditingMessage(`Editing entry for week of ${entry.weekStart}`)
    setStatus({ success: `Editing entry for week of ${entry.weekStart}` })
    // Ensure form doesn't get reset while editing
    setSkipNextLoad(false)
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="form-container">
      <div className="card">
        <h3>Welcome, {employee.name} {employee.role === 'manager' ? `(${employee.homeStore})` : ''}</h3>
        <button type="button" onClick={onLogout} className="secondary">Not you? Logout</button>
      </div>
      <form ref={formRef} onSubmit={handleSubmit} className="card">
        <label>Week starting (Monday)</label>
        <input type="date" name="weekStart" value={form.weekStart} onChange={handleChange} required />

        {editingMessage && <div className="alert success">{editingMessage}</div>}

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

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" className="primary">Submit restrictions</button>
        </div>

        {status?.error && <div className="alert error">{status.error}</div>}
        {status?.success && <div className="alert success">{status.success}</div>}
      </form>

      <div className="card">
        <h3>My Entries (Last 10)</h3>
        <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '8px' }}>
          {employeeEntries.length === 0 && <p>No entries yet.</p>}
          {employeeEntries.slice(0, 10).map(entry => (
            <div key={entry.id} className="card small" style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>Week of {entry.weekStart}</strong>
                <span className={`badge ${entry.status || 'pending'}`}>{entry.status || 'pending'}</span>
              </div>
              <div>{entry.offDay ? `Off day: ${entry.offDay}` : 'No off day set'}</div>
              {entry.storePreference && <div>Store preference: {entry.storePreference}</div>}
              {entry.notes && <div className="muted">Notes: {entry.notes}</div>}
              {entry.managerNote && <div className="muted">Manager note: {entry.managerNote}</div>}
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                {(entry.status === 'pending' || !entry.status) && (
                  <button type="button" className="secondary" onClick={() => handleEdit(entry)}>Edit</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
