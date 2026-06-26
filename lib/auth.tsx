"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { API_BASE_URL } from "./config"
import { setAccessToken, getAccessToken, setRefreshHandler, ApiError } from "./api"

export interface AuthUser {
  id: string
  email: string
  name?: string
  account_id: string
  role: string
}

export interface AuthAccount {
  id: string
  name: string
  slug: string
}

interface AuthResponse {
  access_token: string
  user: AuthUser
  account: AuthAccount
}

type AuthStatus = "loading" | "authenticated" | "guest"

interface AuthContextValue {
  status: AuthStatus
  user: AuthUser | null
  account: AuthAccount | null
  login: (email: string, password: string) => Promise<void>
  signup: (input: { name: string; email: string; password: string; accountName?: string }) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function postAuth(path: string, body?: unknown): Promise<Response> {
  return fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
}

async function readError(res: Response, fallback: string): Promise<string> {
  const text = (await res.text().catch(() => "")).trim()
  if (!text) return fallback
  try {
    const parsed = JSON.parse(text)
    return parsed.error || parsed.message || text
  } catch {
    return text
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading")
  const [user, setUser] = useState<AuthUser | null>(null)
  const [account, setAccount] = useState<AuthAccount | null>(null)

  const applySession = useCallback((data: AuthResponse) => {
    setAccessToken(data.access_token)
    setUser(data.user)
    setAccount(data.account)
    setStatus("authenticated")
  }, [])

  const clearSession = useCallback(() => {
    setAccessToken(null)
    setUser(null)
    setAccount(null)
    setStatus("guest")
  }, [])

  // Exchange the HttpOnly refresh cookie for a fresh in-memory access token.
  const refresh = useCallback(async (): Promise<boolean> => {
    try {
      const res = await postAuth("/auth/refresh")
      if (!res.ok) {
        clearSession()
        return false
      }
      applySession((await res.json()) as AuthResponse)
      return true
    } catch {
      clearSession()
      return false
    }
  }, [applySession, clearSession])

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await postAuth("/auth/login", { email, password })
      if (!res.ok) throw new ApiError(res.status, await readError(res, "Invalid email or password"))
      applySession((await res.json()) as AuthResponse)
    },
    [applySession]
  )

  const signup = useCallback(
    async (input: { name: string; email: string; password: string; accountName?: string }) => {
      const res = await postAuth("/auth/signup", {
        name: input.name,
        email: input.email,
        password: input.password,
        account_name: input.accountName,
      })
      if (!res.ok) throw new ApiError(res.status, await readError(res, "Could not create account"))
      applySession((await res.json()) as AuthResponse)
    },
    [applySession]
  )

  const logout = useCallback(async () => {
    try {
      await postAuth("/auth/logout")
    } finally {
      clearSession()
    }
  }, [clearSession])

  // Register the silent-refresh handler used by apiFetch on 401, and restore
  // any existing session once on mount.
  const refreshRef = useRef(refresh)
  refreshRef.current = refresh
  useEffect(() => {
    setRefreshHandler(async () => {
      const ok = await refreshRef.current()
      return ok ? getAccessToken() : null
    })
    void refresh()
    return () => setRefreshHandler(null)
  }, [refresh])

  return (
    <AuthContext.Provider value={{ status, user, account, login, signup, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider")
  return ctx
}
