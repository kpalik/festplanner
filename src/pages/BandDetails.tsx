import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Globe, Music, ExternalLink, Edit, Loader2 } from 'lucide-react';
import { EditBandModal, type Band } from '../components/EditBandModal';

export default function BandDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { isAdmin } = useAuth();
    const [band, setBand] = useState<Band | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEditOpen, setIsEditOpen] = useState(false);

    useEffect(() => {
        if (id) fetchBand();
    }, [id]);

    const fetchBand = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('bands')
                .select('*')
                .eq('id', id!)
                .single();

            if (error) throw error;
            setBand(data);
        } catch (error) {
            console.error('Error fetching band:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="flex justify-center items-center h-96">
            <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
        </div>
    );

    if (!band) return (
        <div className="text-center py-12 text-slate-400">Band not found.</div>
    );

    return (
        <div className="max-w-4xl mx-auto">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
                <ArrowLeft className="w-5 h-5" />
                Back
            </button>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="h-64 sm:h-80 relative">
                    {band.image_url ? (
                        <img src={band.image_url} alt={band.name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-800">
                            <Music className="w-20 h-20 text-slate-700" />
                        </div>
                    )}

                    {isAdmin && (
                        <div className="absolute top-4 right-4">
                            <button
                                onClick={() => setIsEditOpen(true)}
                                className="p-2 bg-slate-900/60 hover:bg-slate-900 backdrop-blur rounded-full text-white transition-all border border-white/10"
                            >
                                <Edit className="w-5 h-5" />
                            </button>
                        </div>
                    )}

                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent p-8">
                        <h1 className="text-4xl font-bold text-white mb-2">{band.name}</h1>
                        <div className="flex items-center gap-2 text-slate-300">
                            <Globe className="w-4 h-4 text-purple-400" />
                            {band.origin_country || 'Unknown Origin'}
                        </div>
                    </div>
                </div>

                <div className="p-8 space-y-8">
                    {/* Bio */}
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-3">About</h3>
                        <p className="text-slate-400 leading-relaxed whitespace-pre-wrap">
                            {band.bio || "No biography available for this artist."}
                        </p>
                    </div>

                    {/* Links */}
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-3">Links & Socials</h3>
                        <div className="flex flex-wrap gap-4">
                            {band.website_url && (
                                <a href={band.website_url} target="_blank" rel="noreferrer"
                                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition">
                                    <ExternalLink className="w-4 h-4" />
                                    Website
                                </a>
                            )}
                            {band.spotify_url && (
                                <a href={band.spotify_url} target="_blank" rel="noreferrer"
                                    className="flex items-center gap-2 px-4 py-2 bg-[#1DB954]/10 hover:bg-[#1DB954]/20 border border-[#1DB954]/20 rounded-lg text-[#1DB954] transition">
                                    <Music className="w-4 h-4" />
                                    Spotify
                                </a>
                            )}
                            {band.apple_music_url && (
                                <a href={band.apple_music_url} target="_blank" rel="noreferrer"
                                    className="flex items-center gap-2 px-4 py-2 bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/20 rounded-lg text-pink-400 transition">
                                    <Music className="w-4 h-4" />
                                    Apple Music
                                </a>
                            )}

                            {!band.website_url && !band.spotify_url && !band.apple_music_url && (
                                <span className="text-slate-500 italic">No links provided.</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <EditBandModal
                isOpen={isEditOpen}
                onClose={() => setIsEditOpen(false)}
                band={band}
                onUpdated={fetchBand}
            />
        </div>
    );
}
