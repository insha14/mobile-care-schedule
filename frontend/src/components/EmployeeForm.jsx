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
    if (skipNextLoad) {
      setSkipNextLoad(false)
      return
    }
    if (!form.weekStart || !employee.pin) return
    const existing = employeeEntries.find(r => r.weekStart === form.weekStart)
    if (existing) {
      setForm({
        weekStart: existing.weekStart,
        offDay: existing.offDay || '',
        notes: existing.notes || '',
        storePreference: existing.storePreference || ''
      })
      setExistingId(existing.id)
      if (currentEntryId !== existing.id) {
        if (form.weekStart !== justCreatedWeek) {
          setEditingMessage(`Editing entry for week of ${existing.weekStart}`)
          setStatus({ success: 'Existing entry loaded' })
        } else {
          // Just created, keep the success message from submit, don't set editing mode
          setEditingMessage('')
          // Do not set status here to preserve the success message
        }
      }
      setCurrentEntryId(existing.id)
    } else {
      setExistingId(null)
      setCurrentEntryId(null)
      setEditingMessage('')
      setStatus(null)
      setForm(prev => ({ ...prev, offDay: '', notes: '', storePreference: '' }))
    }
  }, [form.weekStart, employee.pin, employeeEntries, skipNextLoad, justCreatedWeek, currentEntryId])

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (name === 'weekStart') {
      setJustCreatedWeek(null)
    }
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

    const payload = { ...form, employeeId: employee.id, pin: employee.pin }
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
        // Update existing
        const updated = [...prev]
        updated[existingIndex] = newRestriction
        return updated.sort((a, b) => b.weekStart.localeCompare(a.weekStart))
      } else {
        // Add new
        return [newRestriction, ...prev].sort((a, b) => b.weekStart.localeCompare(a.weekStart))
      }
    })
    if (wasNew) {
      setJustCreatedWeek(form.weekStart)
    }
    // Refetch in background for consistency
    fetchEntries()
    setExistingId(data.restriction?.id || null)
    setCurrentEntryId(data.restriction?.id || null)
    setSkipNextLoad(true)
  }

  async function handleSelfDelete(weekToDelete) {
    const week = weekToDelete || form.weekStart
    if (!week) {
      setStatus({ error: 'Select week to delete.' })
      return
    }
    const ok = window.confirm('Delete your entry for this week? This cannot be undone.')
    if (!ok) return
    try {
      const res = await fetch(`${API_BASE}/api/restrictions/self?employeeId=${encodeURIComponent(employee.id)}&week=${encodeURIComponent(week)}&pin=${encodeURIComponent(employee.pin)}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) {
        setStatus({ error: data.error || 'Delete failed' })
        return
      }
      setStatus({ success: 'Your entry was deleted' })
      setEditingMessage('')
      // Immediately update local state for instant UI feedback
      setEmployeeEntries(prev => prev.filter(e => !(e.employeeId === employee.id && e.weekStart === week)))
      // Refetch in background for consistency
      fetchEntries()
      if (week === form.weekStart) {
        setForm(prev => ({ ...prev, offDay: '', notes: '', storePreference: '' }))
        setExistingId(null)
        setCurrentEntryId(null)
      }
    } catch (err) {
      setStatus({ error: 'Network error' })
    }
  }

  function handleEdit(entry) {
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
        <h3>My Entries</h3>
        <div style={{ maxHeight: '320px', overflowY: 'auto', paddingRight: '8px' }}>
          {employeeEntries.length === 0 && <p>No entries yet.</p>}
          {employeeEntries.map(entry => (
            <div key={entry.id} className="card small" style={{ marginBottom: 10 }}>
              <strong>Week of {entry.weekStart}</strong>
              <div>{entry.offDay ? `Off day: ${entry.offDay}` : 'No off day set'}</div>
              {entry.storePreference && <div>Store preference: {entry.storePreference}</div>}
              {entry.notes && <div className="muted">Notes: {entry.notes}</div>}
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <button type="button" className="secondary" onClick={() => handleEdit(entry)}>Edit</button>
                <button type="button" className="danger" onClick={() => handleSelfDelete(entry.weekStart)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
