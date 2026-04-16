import React, { useEffect, useState } from 'react'
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'

function formatOffDay(r) {
  if (!r.offDay) return 'No off day selected'
  try {
    const d = new Date(r.offDay)
    const weekday = d.toLocaleDateString(undefined, { weekday: 'long' })
    return `Off on ${weekday}`
  } catch (e) {
    return `Off on ${r.offDay}`
  }
}

function groupByStatus(restrictions) {
  const groups = { pending: [], approved: [], denied: [] }
  restrictions.forEach(r => {
    const status = r.status || 'pending'
    groups[status].push(r)
  })
  return groups
}

export default function ManagerDashboard({ managerPasscode }) {
  const [week, setWeek] = useState('')
  const [restrictions, setRestrictions] = useState([])
  const [missing, setMissing] = useState([])

  useEffect(() => {
    // default week: next Monday
    const d = new Date()
    const day = d.getDay()
    const daysUntilMonday = (8 - day) % 7 || 7
    d.setDate(d.getDate() + daysUntilMonday)
    setWeek(d.toISOString().slice(0, 10))
  }, [])

  useEffect(() => {
    if (!week) return
    fetch(`${API_BASE}/api/restrictions?week=${week}&passcode=${encodeURIComponent(managerPasscode)}`)
      .then(r => r.json())
      .then(setRestrictions)
      .catch(() => setRestrictions([]))
    fetch(`${API_BASE}/api/missing?week=${week}`)
      .then(r => r.json())
      .then(setMissing)
      .catch(() => setMissing([]))
  }, [week, managerPasscode])

  async function handleApprove(id) {
    const res = await fetch(`${API_BASE}/api/restrictions/${id}/approve?passcode=${encodeURIComponent(managerPasscode)}`, { method: 'PUT' })
    if (!res.ok) {
      alert('Approve failed')
      return
    }
    // refresh
    fetch(`${API_BASE}/api/restrictions?week=${week}&passcode=${encodeURIComponent(managerPasscode)}`)
      .then(r => r.json())
      .then(setRestrictions)
  }

  async function handleDeny(id) {
    const res = await fetch(`${API_BASE}/api/restrictions/${id}/deny?passcode=${encodeURIComponent(managerPasscode)}`, { method: 'PUT' })
    if (!res.ok) {
      alert('Deny failed')
      return
    }
    // refresh
    fetch(`${API_BASE}/api/restrictions?week=${week}&passcode=${encodeURIComponent(managerPasscode)}`)
      .then(r => r.json())
      .then(setRestrictions)
  }

  const groups = groupByStatus(restrictions)

  return (
    <div className="dashboard">
      <div className="controls card">
        <label>Select week (Monday)</label>
        <input type="date" value={week} onChange={e => setWeek(e.target.value)} />
      </div>

      <div className="card">
        <h3>Pending Requests</h3>
        {groups.pending.length === 0 && <p>No pending requests.</p>}
        <div className="grid">
          {groups.pending.map(r => (
            <div key={r.id} className="card small">
              <strong>{r.employeeName}</strong>
              <div className="muted">{formatOffDay(r)}</div>
              {r.storePreference && <div>Store pref: {r.storePreference}</div>}
              {r.notes && <div className="muted">Notes: {r.notes}</div>}
              <div style={{ marginTop: '8px', display: 'flex', gap: 8 }}>
                <button className="primary" style={{ flex: 1 }} onClick={() => handleApprove(r.id)}>Approve</button>
                <button className="danger" style={{ flex: 1 }} onClick={() => handleDeny(r.id)}>Deny</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>Approved Requests</h3>
        {groups.approved.length === 0 && <p>No approved requests.</p>}
        <div className="grid">
          {groups.approved.map(r => (
            <div key={r.id} className="card small">
              <strong>{r.employeeName}</strong>
              <div className="muted">{formatOffDay(r)}</div>
              {r.storePreference && <div>Store pref: {r.storePreference}</div>}
              {r.notes && <div className="muted">Notes: {r.notes}</div>}
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>Denied Requests</h3>
        {groups.denied.length === 0 && <p>No denied requests.</p>}
        <div className="grid">
          {groups.denied.map(r => (
            <div key={r.id} className="card small">
              <strong>{r.employeeName}</strong>
              <div className="muted">{formatOffDay(r)}</div>
              {r.storePreference && <div>Store pref: {r.storePreference}</div>}
              {r.notes && <div className="muted">Notes: {r.notes}</div>}
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>Missing submissions</h3>
        {missing.length === 0 && <p>All employees submitted for this week.</p>}
        <ul>
          {missing.map(m => (
            <li key={m.id}>{m.name} {m.role === 'manager' ? `(${m.homeStore})` : ''}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
