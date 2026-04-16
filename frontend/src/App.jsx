import React, { useState } from 'react'
import EmployeeForm from './components/EmployeeForm'
import EmployeeLogin from './components/EmployeeLogin'
import ManagerDashboard from './components/ManagerDashboard'
import ManagerLogin from './components/ManagerLogin'

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
        </nav>
      </header>

      <main>
        {view === 'form' ? (
          employee ? <EmployeeForm employee={employee} onLogout={() => setEmployee(null)} /> : <EmployeeLogin onSuccess={(employee, pin) => setEmployee({ ...employee, pin })} />
        ) : (
          managerPasscode ? <ManagerDashboard managerPasscode={managerPasscode} /> : <ManagerLogin onSuccess={p => setManagerPasscode(p)} />
        )}
      </main>

      <footer className="footer">Designed for mobile use — share the form link via WhatsApp</footer>
    </div>
  )
}
