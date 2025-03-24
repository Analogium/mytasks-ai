import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import Login from './components/auth/Login'
import Register from './components/auth/Register'
import Dashboard from './components/Dashboard'
import AddTask from './components/AddTask'
import Layout from './components/Layout'

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
export const supabase = createClient(supabaseUrl, supabaseKey)

function App() {
  const [session, setSession] = useState<any>(null)

  useEffect(() => {
    // Check active sessions and set up auth listener
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            !session ? (
              <Navigate to="/login" replace />
            ) : (
              <Layout>
                <Dashboard session={session} />
              </Layout>
            )
          }
        />
        <Route
          path="/add-task"
          element={
            !session ? (
              <Navigate to="/login" replace />
            ) : (
              <Layout>
                <AddTask session={session} />
              </Layout>
            )
          }
        />
        <Route
          path="/login"
          element={
            session ? (
              <Navigate to="/" replace />
            ) : (
              <Layout>
                <Login />
              </Layout>
            )
          }
        />
        <Route
          path="/register"
          element={
            session ? (
              <Navigate to="/" replace />
            ) : (
              <Layout>
                <Register />
              </Layout>
            )
          }
        />
      </Routes>
    </Router>
  )
}

export default App
