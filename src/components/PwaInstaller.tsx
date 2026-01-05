import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PwaInstaller() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showInstaller, setShowInstaller] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        // Check if running in standalone mode (already installed)
        const isRunningStandalone = window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as any).standalone ||
            document.referrer.includes('android-app://');

        setIsStandalone(isRunningStandalone);

        const handleBeforeInstallPrompt = (e: any) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setDeferredPrompt(e);
            // Update UI notify the user they can install the PWA
            if (!isRunningStandalone) {
                setShowInstaller(true);
            }
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        // Show the install prompt
        deferredPrompt.prompt();

        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            console.log('User accepted the install prompt');
            setShowInstaller(false);
        } else {
            console.log('User dismissed the install prompt');
        }

        setDeferredPrompt(null);
    };

    if (isStandalone || !showInstaller) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="fixed bottom-20 left-4 right-4 md:bottom-4 md:left-auto md:right-4 md:w-96 z-50 pointer-events-none"
            >
                <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl shadow-2xl flex items-center gap-4 pointer-events-auto">
                    <div className="bg-purple-500/20 p-3 rounded-lg">
                        <Download className="w-6 h-6 text-purple-400" />
                    </div>
                    <div className="flex-1">
                        <h4 className="font-bold text-white text-sm">Install App</h4>
                        <p className="text-slate-400 text-xs">Add FestPlanner to your home screen for quick access.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowInstaller(false)}
                            className="p-2 text-slate-400 hover:text-white transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                        <button
                            onClick={handleInstallClick}
                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg transition-colors shadow-lg shadow-purple-500/20"
                        >
                            Install
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
