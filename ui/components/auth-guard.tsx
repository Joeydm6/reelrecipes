"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    let mounted = true
    async function check() {
      if (!supabase) {
        // If client isn't configured, allow navigation so user can set up env or login
        setAuthed(false)
        setChecking(false)
        router.replace("/login")
        return
      }
      const { data } = await supabase.auth.getSession()
      const isLoggedIn = !!data.session
      if (mounted) {
        setAuthed(isLoggedIn)
        setChecking(false)
        if (!isLoggedIn) router.replace("/login")
      }
    }
    check()
    const { data: sub } = supabase?.auth.onAuthStateChange((_event, session) => {
      setAuthed(!!session)
      if (!session) router.replace("/login")
    }) || { data: { subscription: { unsubscribe() {} } } }
    return () => {
      mounted = false
      // @ts-expect-error: types may vary between sdk versions
      sub?.subscription?.unsubscribe?.()
    }
  }, [router])

  if (checking) {
    return <div className="p-8 text-center text-muted-foreground">Even controleren…</div>
  }
  if (!authed) {
    return null
  }
  return <>{children}</>
}