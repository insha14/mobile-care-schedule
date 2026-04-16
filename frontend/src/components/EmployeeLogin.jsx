import React, { useState } from 'react'
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export default function EmployeeLogin({ onSuccess }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/auth/employee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Invalid PIN')
        return
      }
      const employee = await res.json()
      onSuccess(employee, pin)
    } catch (err) {
      setError('Unable to authenticate')
    }
  }

  return (
    <div className="card">
      <h3>Employee access</h3>
      <form onSubmit={submit}>
        <label>Enter your employee PIN</label>
        <input type="password" value={pin} onChange={e => setPin(e.target.value)} />
        <div style={{ marginTop: 8 }}>
          <button type="submit" className="primary">Access your form</button>
        </div>
        {error && <div className="alert error" style={{ marginTop: 8 }}>{error}</div>}
      </form>
    </div>
  )
}