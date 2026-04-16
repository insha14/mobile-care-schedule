import React, { useState } from 'react'
const API_BASE = import.meta.env.VITE_API_URL || '${API_BASE}'

function nextMondayISO() {
  const d = new Date()
  const day = d.getDay()
  const daysUntilMonday = (8 - day) % 7 || 7
  d.setDate(d.getDate() + daysUntilMonday)
  d.setHours(0, 0, 0, 0)
  return d.toISOString().slice(0, 10)
}

export default function ManagerLogin({ onSuccess }) {
  const [passcode, setPasscode] = useState('')
  const [error, setError] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setError(null)
    const week = nextMondayISO()
    try {
      const res = await fetch(`${API_BASE}/api/restrictions?week=${week}&passcode=${encodeURIComponent(passcode)}`)
      if (!res.ok) {
        setError('Incorrect passcode')
        return
      }
      // success
      onSuccess(passcode)
    } catch (err) {
      setError('Unable to validate passcode')
    }
  }

  return (
    <div className="card">
      <h3>Manager access</h3>
      <form onSubmit={submit}>
        <label>Enter manager passcode</label>
        <input type="password" value={passcode} onChange={e => setPasscode(e.target.value)} />
        <div style={{ marginTop: 8 }}>
          <button type="submit" className="primary">Unlock dashboard</button>
        </div>
        {error && <div className="alert error" style={{ marginTop: 8 }}>{error}</div>}
      </form>
    </div>
  )
}
