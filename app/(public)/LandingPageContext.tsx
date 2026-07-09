'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

type LandingPageContextValue = {
  selectedProgramme: string | null
  setSelectedProgramme: (programme: string) => void
}

const LandingPageContext = createContext<LandingPageContextValue | null>(null)

export function LandingPageProvider({ children }: { children: ReactNode }) {
  const [selectedProgramme, setSelectedProgramme] = useState<string | null>(null)
  return (
    <LandingPageContext.Provider value={{ selectedProgramme, setSelectedProgramme }}>
      {children}
    </LandingPageContext.Provider>
  )
}

export function useLandingPage() {
  const ctx = useContext(LandingPageContext)
  if (!ctx) throw new Error('useLandingPage must be used within LandingPageProvider')
  return ctx
}
