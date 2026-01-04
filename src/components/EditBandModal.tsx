import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, Trash2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ImageUpload } from './ImageUpload';

export interface Band {
    id: string;
    name: string;
    bio: string | null;
    origin_country: string | null;
    image_url: string | null;
    website_url: string | null;
    spotify_url: string | null;
    apple_music_url: string | null;
}

export function EditBandModal({ isOpen, onClose, band, onUpdated }: { isOpen: boolean; onClose: () => void; band: Band; onUpdated: () => void }) {
    const [formData, setFormData] = useState({
        name: band.name,
        bio: band.bio || '',
        origin_country: band.origin_country || '',
        image_url: band.image_url || '',
        website_url: band.website_url || '',
        spotify_url: band.spotify_url || '',
        apple_music_url: band.apple_music_url || ''
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Use type assertion since Supabase types inference might improperly intersect with our manual types sometimes
            const { error } = await (supabase as any).from('bands').update(formData).eq('id', band.id);
            if (error) throw error;

            onUpdated();
            onClose();
        } catch (err: any) {
            console.error(err);
            alert(err.message);
        } finally {
            setLoading(false);
        }
    }

    const handleDelete = async () => {
        if (confirm(`Are you sure you want to delete "${band.name}"? This will remove them from all lineups.`)) {
            setLoading(true);
            try {
                const { error } = await supabase.from('bands').delete().eq('id', band.id);
                if (error) throw error;
                onClose();
                onUpdated();
            } catch (err: any) {
                console.error(err);
                alert(err.message);
                setLoading(false);
            }
        }
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none p-4"
                    >
                        <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl pointer-events-auto flex flex-col max-h-[90vh]">
                            <div className="flex items-center justify-between p-6 border-b border-slate-800">
                                <h2 className="text-xl font-bold text-white">Edit Band</h2>
                                <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Band Name</label>
                                        <input
                                            type="text"
                                            required
                                            className="w-full bg-slate-800 border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Origin Country</label>
                                        <input
                                            type="text"
                                            className="w-full bg-slate-800 border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                                            value={formData.origin_country}
                                            onChange={e => setFormData({ ...formData, origin_country: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Band Image</label>
                                    <ImageUpload
                                        value={formData.image_url}
                                        onChange={url => setFormData({ ...formData, image_url: url })}
                                        folder="bands"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Bio</label>
                                    <textarea
                                        rows={3}
                                        className="w-full bg-slate-800 border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                                        value={formData.bio}
                                        onChange={e => setFormData({ ...formData, bio: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Website</label>
                                        <input
                                            type="url"
                                            className="w-full bg-slate-800 border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                                            value={formData.website_url}
                                            onChange={e => setFormData({ ...formData, website_url: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Spotify URL</label>
                                        <input
                                            type="url"
                                            className="w-full bg-slate-800 border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                                            value={formData.spotify_url}
                                            onChange={e => setFormData({ ...formData, spotify_url: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Apple Music</label>
                                        <input
                                            type="url"
                                            className="w-full bg-slate-800 border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                                            value={formData.apple_music_url}
                                            onChange={e => setFormData({ ...formData, apple_music_url: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 flex items-center justify-between">
                                    <button
                                        type="button"
                                        onClick={handleDelete}
                                        className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Delete Band
                                    </button>
                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-lg font-medium transition flex items-center gap-2"
                                        >
                                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                            Save Changes
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
