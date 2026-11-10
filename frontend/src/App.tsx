import { useEffect, useState } from 'react'
import { PpManualPage } from './pages/PpManualPage'
import { LoginPage } from './pages/LoginPage'
import { THEMES, getStoredTheme, storeTheme } from './theme/theme'
import { clearAuth, getAuth, initAxiosAuth } from './data/auth'

/** One-page app: the NDP export setup, behind the optional login. */
export function App() {
  const [theme, setTheme] = useState<string>(() => getStoredTheme(window.localStorage))
  const [authEnabled, setAuthEnabled] = useState<boolean | null>(null)
  const [authUser, setAuthUser] = useState<string | null>(null)
  const [authRole, setAuthRole] = useState<string | null>(null)

  useEffect(() => {
    initAxiosAuth(window.localStorage)
    const stored = getAuth(window.localStorage)
    if (stored) {
      setAuthUser(stored.u)
      setAuthRole(stored.role)
    }
    fetch('/api/auth/status')
      .then(r => (r.ok ? (r.json() as Promise<{ enabled: boolean }>) : { enabled: false }))
      .then(data => setAuthEnabled(data.enabled))
      .catch(() => setAuthEnabled(false))
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  function changeTheme(id: string) {
    setTheme(id)
    storeTheme(window.localStorage, id)
  }

  function loggedIn() {
    const stored = getAuth(window.localStorage)
    if (stored) {
      setAuthUser(stored.u)
      setAuthRole(stored.role)
    }
  }

  function logout() {
    clearAuth(window.localStorage)
    setAuthUser(null)
    setAuthRole(null)
  }

  if (authEnabled === true && !authUser) return <LoginPage onSuccess={loggedIn} />

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="app-header text-white shadow-md">
        <div className="px-6 py-3 flex items-center gap-3">
          <h1 className="flex-1 text-lg font-bold leading-tight">ระบบตั้งค่าเพื่อส่งออก NDP</h1>
          {authUser && (
            <span className="bg-white/15 text-xs rounded px-2 py-1 flex items-center gap-1.5">
              {authUser} ({authRole})
              <button onClick={logout} className="ml-1 underline hover:no-underline text-white/80 hover:text-white">
                ออกจากระบบ
              </button>
            </span>
          )}
          <select
            value={theme}
            onChange={e => changeTheme(e.target.value)}
            className="text-xs bg-white/15 text-white border border-white/30 rounded px-2 py-1 cursor-pointer"
            title="เปลี่ยนสีธีม"
          >
            {THEMES.map(t => (
              <option key={t.id} value={t.id} className="text-gray-900 bg-white">{t.label}</option>
            ))}
          </select>
        </div>
      </header>
      <main className="flex-1 p-6">
        <PpManualPage />
      </main>
    </div>
  )
}
