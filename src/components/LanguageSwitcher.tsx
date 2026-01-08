
import { useTranslation } from 'react-i18next';
import { Globe, Check } from 'lucide-react';
import clsx from 'clsx';
import { useState, useRef, useEffect } from 'react';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    setIsOpen(false);
  };

  const currentLang = i18n.language.split('-')[0].toUpperCase();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 p-2 text-slate-400 hover:text-white rounded-lg transition-colors"
        aria-label="Change Language"
      >
        <Globe size={20} />
        <span className="text-sm font-medium">{currentLang}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-32 bg-slate-900 border border-slate-800 rounded-lg shadow-xl py-1 z-50">
          <button
            onClick={() => changeLanguage('en')}
            className={clsx(
              "w-full px-4 py-2 text-sm text-left flex items-center justify-between hover:bg-slate-800 transition-colors",
              currentLang === 'EN' ? "text-purple-400" : "text-slate-300"
            )}
          >
            <span>English</span>
            {currentLang === 'EN' && <Check size={14} />}
          </button>
          <button
            onClick={() => changeLanguage('pl')}
            className={clsx(
              "w-full px-4 py-2 text-sm text-left flex items-center justify-between hover:bg-slate-800 transition-colors",
              currentLang === 'PL' ? "text-purple-400" : "text-slate-300"
            )}
          >
            <span>Polski</span>
            {currentLang === 'PL' && <Check size={14} />}
          </button>
          <button
            onClick={() => changeLanguage('cs')}
            className={clsx(
              "w-full px-4 py-2 text-sm text-left flex items-center justify-between hover:bg-slate-800 transition-colors",
              currentLang === 'CS' ? "text-purple-400" : "text-slate-300"
            )}
          >
            <span>Čeština</span>
            {currentLang === 'CS' && <Check size={14} />}
          </button>
        </div>
      )}
    </div>
  );
}
