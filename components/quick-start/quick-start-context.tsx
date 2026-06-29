"use client"

import React, { createContext, useCallback, useContext, useState } from "react"

interface QuickStartContextValue {
  isOpen: boolean
  open: () => void
  close: () => void
}

const QuickStartContext = createContext<QuickStartContextValue>({
  isOpen: false,
  open: () => {},
  close: () => {},
})

export function QuickStartProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const open  = useCallback(() => setIsOpen(true),  [])
  const close = useCallback(() => setIsOpen(false), [])

  return (
    <QuickStartContext.Provider value={{ isOpen, open, close }}>
      {children}
    </QuickStartContext.Provider>
  )
}

export function useQuickStart() {
  return useContext(QuickStartContext)
}
