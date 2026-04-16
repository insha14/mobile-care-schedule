import React, { useState } from 'react'
import EmployeeForm from './components/EmployeeForm'
import EmployeeLogin from './components/EmployeeLogin'
import ManagerDashboard from './components/ManagerDashboard'
import ManagerLogin from './components/ManagerLogin'
import Schedule from './components/Schedule'

export default function App() {
  const [view, setView] = useState('form')
  const [managerPasscode, setManagerPasscode] = useState(null)
  const [employee, setEmployee] = useState(null)

  return (
    <div className="app">
      <header className="topbar">
        <h1>Mobile Care Schedule</h1>
        <nav>
          <button onClick={() => setView('form')} className={view === 'form' ? 'active' : ''}>Employee Form</button>
          <button onClick={() => setView('dashboard')} className={view === 'dashboard' ? 'active' : ''}>Manager Dashboard</button>
          <button onClick={() => setView('schedule')} className={view === 'schedule' ? 'active' : ''}>Schedule</button>
        </nav>
      </header>

      <main>
        {view === 'form' ? (
          employee ? <EmployeeForm employee={employee} onLogout={() => setEmployee(null)} /> : <EmployeeLogin onSuccess={(employee, pin) => setEmployee({ ...employee, pin })} />
        ) : view === 'dashboard' ? (
          managerPasscode ? <ManagerDashboard managerPasscode={managerPasscode} /> : <ManagerLogin onSuccess={p => setManagerPasscode(p)} />
        ) : (
          <Schedule />
        )}
      </main>

      <footer className="footer">Designed for mobile use — share the form link via WhatsApp</footer>
    </div>
  )
}
