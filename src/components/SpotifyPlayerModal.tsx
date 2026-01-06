import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SpotifyEmbed } from './SpotifyEmbed';
import { type Band } from './EditBandModal'; // Using Band type

interface SpotifyPlayerModalProps {
    isOpen: boolean;
    onClose: () => void;
    band: Band | null;
}

export function SpotifyPlayerModal({ isOpen, onClose, band }: SpotifyPlayerModalProps) {
    if (!band?.spotify_url) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none p-4"
                    >
                        <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl pointer-events-auto overflow-hidden">
                            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50">
                                <h3 className="font-bold text-white truncate pr-4">Listening to {band.name}</h3>
                                <button
                                    onClick={onClose}
                                    className="p-1.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-4 bg-slate-950">
                                <SpotifyEmbed spotifyUrl={band.spotify_url} height={352} />
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
