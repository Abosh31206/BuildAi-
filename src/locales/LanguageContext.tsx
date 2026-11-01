import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import ruJson from './ru.json';
import kkJson from './kk.json';
import { Language } from '../types/calculator';

type Translations = typeof ruJson;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (path: string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Record<Language, any> = {
  ru: ruJson,
  kk: kkJson,
};

const LANG_STORAGE_KEY = 'buildai_kz_selected_language';

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(LANG_STORAGE_KEY);
      if (saved === 'ru' || saved === 'kk') return saved;
      return 'ru';
    } catch {
      return 'ru';
    }
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
      document.documentElement.lang = lang;
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = (path: string, fallback?: string): string => {
    const keys = path.split('.');
    let current: any = translations[language];

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        // Fallback to ru if kk is missing key
        let ruFallback: any = translations.ru;
        for (const rk of keys) {
          if (ruFallback && typeof ruFallback === 'object' && rk in ruFallback) {
            ruFallback = ruFallback[rk];
          } else {
            return fallback || path;
          }
        }
        return typeof ruFallback === 'string' ? ruFallback : (fallback || path);
      }
    }

    return typeof current === 'string' ? current : (fallback || path);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
