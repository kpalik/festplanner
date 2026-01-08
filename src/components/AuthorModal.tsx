import { X, Mail, Coffee } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';

interface AuthorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthorModal({ isOpen, onClose }: AuthorModalProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-slate-800/50 hover:bg-slate-700 text-slate-400 hover:text-white rounded-full transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="p-8 text-center">
            <div className="w-32 h-32 mx-auto mb-6 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full blur opacity-50 animate-pulse"></div>
              <div className="relative w-full h-full rounded-full overflow-hidden border-4 border-slate-800 bg-slate-800 flex items-center justify-center">
                 {/* Placeholder for Author Photo - currently App Logo or generic */}
                <img src="/logo.png" alt="Author" className="w-full h-full object-cover" />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">{t('author_modal.title')}</h2>
            
            <div className="space-y-4 text-slate-300 leading-relaxed text-sm pt-2">
              <p>{t('author_modal.content_p1')}</p>
              
              <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                <p className="mb-3">{t('author_modal.content_p2')}</p>
                <a 
                  href="https://buycoffee.to/palik" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-green-900/20"
                >
                    <Coffee className="w-5 h-5" />
                    {t('author_modal.buy_coffee')}
                </a>
              </div>

              <div className="flex flex-col items-center gap-1">
                <p>{t('author_modal.content_p3')}</p>
                <a 
                    href={`mailto:kpalik@gmail.com?subject=${t('author_modal.email_subject')}`}
                    className="text-purple-400 hover:text-purple-300 font-medium inline-flex items-center gap-1.5 transition-colors"
                >
                    <Mail className="w-4 h-4" />
                    kpalik@gmail.com
                </a>
              </div>

              <p className="text-white font-medium pt-2 animate-pulse">
                {t('author_modal.content_p4')}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
