"use client"

import React, { createContext, useContext, useState, ReactNode } from "react"
import zhMessages from "@/messages/zh.json"
import enMessages from "@/messages/en.json"

type Language = "zh" | "en"
type Messages = typeof enMessages

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  messages: Messages
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("zh")

  const messages = language === "zh" ? zhMessages : enMessages

  return (
    <LanguageContext.Provider value={{ language, setLanguage, messages }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}
