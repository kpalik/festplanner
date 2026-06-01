import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Plus, Search, Loader2, X, Edit, RefreshCw, Unlink, Trash2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ImageUpload } from '../components/ImageUpload';
import { EditBandModal, type Band } from '../components/EditBandModal';
import { BandCard } from '../components/BandCard';
import { BandImporter } from '../components/Bands/BandImporter';
import { SpotifyPlayerModal } from '../components/SpotifyPlayerModal';

export default function Bands() {
    const navigate = useNavigate();
    const { isAdmin } = useAuth();
    const [bands, setBands] = useState<Band[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [isOrphansOpen, setIsOrphansOpen] = useState(false);
    const [selectedBand, setSelectedBand] = useState<Band | null>(null);
    const [playingBand, setPlayingBand] = useState<Band | null>(null);

    useEffect(() => {
        fetchBands();
    }, []);

    const fetchBands = async () => {
        try {
            const { data, error } = await supabase.from('bands').select('*').order('name');
            if (error) throw error;
            setBands(data || []);
        } catch (error) {
            console.error('Error fetching bands:', error);
        } finally {
            setLoading(false);
        }
    };


    const fetchSpotifyData = async (band: Band) => {
        //if (!confirm(`Fetch Spotify data for ${band.name}? This will overwrite image and Spotify URL.`)) return;

        const rapidKey = import.meta.env.VITE_RAPIDAPI_KEY;
        const rapidHost = import.meta.env.VITE_RAPIDAPI_HOST;

        if (!rapidKey || !rapidHost) {
            alert('Missing RapidAPI credentials in .env');
            return;
        }

        try {
            setLoading(true);
            const encodedName = encodeURIComponent(band.name);
            const url = `https://${rapidHost}/search/?q=${encodedName}&type=artists&offset=0&limit=1&numberOfTopResults=1`;

            console.log('[Spotify Sync] Requesting:', url, { headers: { 'X-Rapidapi-Key': 'HIDDEN', 'X-Rapidapi-Host': rapidHost } });

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'X-Rapidapi-Key': rapidKey,
                    'X-Rapidapi-Host': rapidHost
                }
            });

            console.log('[Spotify Sync] Status:', response.status, response.statusText);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[Spotify Sync] Error response:', errorText);
                throw new Error(`RapidAPI request failed: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const data = await response.json();
            const artistItem = data?.artists?.items?.[0]?.data;

            if (!artistItem) {
                alert('No artist found on Spotify for: ' + band.name);
                return;
            }

            // Extract contents
            const uri = artistItem.uri; // "spotify:artist:..."
            const spotifyId = uri.split(':')[2];
            const spotifyUrl = `https://open.spotify.com/artist/${spotifyId}`;

            const images: any[] = artistItem.visuals?.avatarImage?.sources || [];
            // Sort by width desc
            images.sort((a: any, b: any) => b.width - a.width);
            const imageUrl = images[0]?.url;

            // Update Supabase
            const updatePayload: any = { spotify_url: spotifyUrl };
            if (imageUrl) updatePayload.image_url = imageUrl;

            const { error } = await (supabase as any).from('bands').update(updatePayload).eq('id', band.id);
            if (error) throw error;

            //alert('Successfully updated band data from Spotify!');
            fetchBands(); // Refresh UI


        } catch (error: any) {
            console.error('Error fetching Spotify data:', error);
            alert('Error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchMissingSpotifyData = async () => {
        const missingDataBands = bands.filter(b => !b.image_url || !b.spotify_url || !b.bio);

        if (missingDataBands.length === 0) {
            alert("All bands already have image, bio and Spotify URL!");
            return;
        }

        if (!confirm(`Found ${missingDataBands.length} bands with missing data (image, bio, or url). Fetch from Spotify? This might take a while.`)) return;

        const rapidKey = import.meta.env.VITE_RAPIDAPI_KEY;
        const rapidHost = import.meta.env.VITE_RAPIDAPI_HOST;

        if (!rapidKey || !rapidHost) {
            alert('Missing RapidAPI credentials in .env');
            return;
        }

        setLoading(true);
        let updatedCount = 0;
        let errors = 0;

        for (const band of missingDataBands) {
            try {
                let spotifyUrl = band.spotify_url;
                let imageUrl = band.image_url;
                let bio = band.bio;
                const updatePayload: any = {};

                // 1. Search if we miss fundamental identifiers or image
                if (!spotifyUrl || !imageUrl) {
                    const encodedName = encodeURIComponent(band.name);
                    const url = `https://${rapidHost}/search/?q=${encodedName}&type=artists&offset=0&limit=1&numberOfTopResults=1`;

                    const response = await fetch(url, {
                        method: 'GET',
                        headers: { 'X-Rapidapi-Key': rapidKey, 'X-Rapidapi-Host': rapidHost }
                    });

                    if (response.ok) {
                        const data = await response.json();
                        const artistItem = data?.artists?.items?.[0]?.data;

                        if (artistItem) {
                            const uri = artistItem.uri;
                            const spotifyId = uri.split(':')[2];
                            const foundSpotifyUrl = `https://open.spotify.com/artist/${spotifyId}`;

                            if (!spotifyUrl) {
                                spotifyUrl = foundSpotifyUrl;
                                updatePayload.spotify_url = spotifyUrl;
                            }

                            if (!imageUrl) {
                                const images: any[] = artistItem.visuals?.avatarImage?.sources || [];
                                images.sort((a: any, b: any) => b.width - a.width);
                                if (images.length > 0) {
                                    imageUrl = images[0]?.url;
                                    updatePayload.image_url = imageUrl;
                                }
                            }
                        }
                    }
                }

                // 2. Fetch Bio if we have URL but no bio
                if (spotifyUrl && !bio) {
                    let artistId = '';
                    if (spotifyUrl.includes('open.spotify.com/artist/')) {
                        const parts = spotifyUrl.split('open.spotify.com/artist/');
                        artistId = parts[1].split('?')[0].split('/')[0];
                    } else if (spotifyUrl.includes('spotify:artist:')) {
                        artistId = spotifyUrl.split(':')[2];
                    }

                    if (artistId) {
                        const overviewUrl = `https://${rapidHost}/artist_overview/?id=${artistId}`;
                        const or = await fetch(overviewUrl, {
                            headers: { 'X-Rapidapi-Key': rapidKey, 'X-Rapidapi-Host': rapidHost }
                        });

                        if (or.ok) {
                            const overviewData = await or.json();
                            const bioText = overviewData?.data?.artist?.profile?.biography?.text;

                            if (bioText) {
                                let content = bioText.replace(/<[^>]*>?/gm, '');
                                const textarea = document.createElement('textarea');
                                textarea.innerHTML = content;
                                content = textarea.value;

                                bio = content;
                                updatePayload.bio = content;
                            }
                        }
                    }
                }

                if (Object.keys(updatePayload).length > 0) {
                    const { error } = await (supabase as any).from('bands').update(updatePayload).eq('id', band.id);
                    if (!error) updatedCount++;
                }

            } catch (error) {
                console.error(`Error fetching for ${band.name}:`, error);
                errors++;
            }
            // Small delay to be nice to API
            await new Promise(r => setTimeout(r, 600));
        }

        setLoading(false);
        fetchBands();
        alert(`Bulk sync finished.\nUpdated: ${updatedCount}\nErrors/Not Found: ${errors}`);
    };

    const filteredBands = bands.filter(band =>
        band.name.toLowerCase().includes(search.toLowerCase()) ||
        (band.origin_country && band.origin_country.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Bands & Artists</h1>
                    <p className="text-slate-400">Manage the lineup database.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="w-5 h-5 text-slate-500 absolute left-3 top-2.5" />
                        <input
                            type="text"
                            placeholder="Search bands..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 outline-none w-full md:w-64"
                        />
                    </div>
                    {isAdmin && (
                        <>
                            <button
                                onClick={() => setIsImportOpen(true)}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-all font-medium whitespace-nowrap hidden sm:block"
                            >
                                Import JSON
                            </button>
                            <button
                                onClick={fetchMissingSpotifyData}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-all font-medium whitespace-nowrap hidden sm:flex items-center gap-2"
                                title="Fetch data for bands without image/spotify url"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Bulk Sync
                            </button>
                            <button
                                onClick={() => setIsOrphansOpen(true)}
                                className="px-4 py-2 bg-slate-800 hover:bg-red-900/40 text-slate-400 hover:text-red-400 border border-transparent hover:border-red-500/30 rounded-lg transition-all font-medium whitespace-nowrap hidden sm:flex items-center gap-2"
                                title="Show bands with no shows in any festival"
                            >
                                <Unlink className="w-4 h-4" />
                                Orphans
                            </button>
                            <button
                                onClick={() => setIsCreateOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-lg transition-all font-medium shadow-lg shadow-purple-500/20 whitespace-nowrap"
                            >
                                <Plus className="w-5 h-5" />
                                Add Band
                            </button>
                        </>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">


                    {filteredBands.map((band) => (
                        <BandCard
                            key={band.id}
                            band={band}
                            imageHeight="h-48"
                            onCardClick={() => navigate(`/bands/${band.id}`)}
                            onPlayClick={() => setPlayingBand(band)}
                            topRightActions={isAdmin && (
                                <>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); fetchSpotifyData(band); }}
                                        className="p-1.5 bg-black/40 hover:bg-black/60 backdrop-blur rounded-full text-green-400 hover:text-green-300 transition-all border border-white/10"
                                        title="Fetch Spotify Data"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setSelectedBand(band); }}
                                        className="p-1.5 bg-black/40 hover:bg-black/60 backdrop-blur rounded-full text-white transition-all border border-white/10"
                                        title="Edit Band"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                </>
                            )}
                            footer={
                                (band.spotify_url || band.website_url) && (
                                    <div className="flex gap-2 text-xs">
                                        {band.spotify_url && <a href={band.spotify_url} target="_blank" rel="noreferrer" className="bg-[#1DB954]/10 text-[#1DB954] px-2 py-1 rounded hover:bg-[#1DB954]/20 transition" onClick={e => e.stopPropagation()}>Spotify</a>}
                                        {band.website_url && <a href={band.website_url} target="_blank" rel="noreferrer" className="bg-slate-800 text-slate-300 px-2 py-1 rounded hover:bg-slate-700 transition" onClick={e => e.stopPropagation()}>Web</a>}
                                    </div>
                                )
                            }
                        />
                    ))}
                    {filteredBands.length === 0 && (
                        <div className="col-span-full py-12 text-center text-slate-500">
                            No bands found matching your search.
                        </div>
                    )}
                </div>
            )}

            <CreateBandModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} onCreated={fetchBands} />
            <BandImporter isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} onSuccess={fetchBands} />
            {selectedBand && (
                <EditBandModal
                    isOpen={!!selectedBand}
                    onClose={() => setSelectedBand(null)}
                    band={selectedBand}
                    onUpdated={fetchBands}
                />
            )}
            <SpotifyPlayerModal
                isOpen={!!playingBand}
                onClose={() => setPlayingBand(null)}
                band={playingBand}
            />
            <OrphansModal
                isOpen={isOrphansOpen}
                onClose={() => setIsOrphansOpen(false)}
                onDeleted={fetchBands}
            />

        </div>
    );
}



function OrphansModal({ isOpen, onClose, onDeleted }: { isOpen: boolean; onClose: () => void; onDeleted: () => void }) {
    const [orphans, setOrphans] = useState<Band[]>([]);
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (isOpen) fetchOrphans();
    }, [isOpen]);

    const fetchOrphans = async () => {
        setLoading(true);
        try {
            // Get all band IDs that have at least one show
            const { data: showBands } = await (supabase as any)
                .from('shows')
                .select('band_id');

            const usedIds = new Set((showBands || []).map((s: any) => s.band_id));

            const { data: allBands } = await (supabase as any)
                .from('bands')
                .select('*')
                .order('name');

            setOrphans((allBands || []).filter((b: Band) => !usedIds.has(b.id)));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const deleteAll = async () => {
        if (!confirm(`Permanently delete ${orphans.length} bands with no shows? This cannot be undone.`)) return;
        setDeleting(true);
        try {
            const ids = orphans.map(b => b.id);
            const { error } = await (supabase as any)
                .from('bands')
                .delete()
                .in('id', ids);
            if (error) throw error;
            onDeleted();
            onClose();
        } catch (err: any) {
            alert('Error: ' + err.message);
        } finally {
            setDeleting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none p-4"
                    >
                        <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl pointer-events-auto flex flex-col max-h-[80vh]">
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-slate-800">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Unlink className="w-5 h-5 text-red-400" />
                                    Orphan Bands
                                </h2>
                                <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="flex-1 overflow-y-auto p-6">
                                {loading ? (
                                    <div className="flex justify-center py-8">
                                        <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
                                    </div>
                                ) : orphans.length === 0 ? (
                                    <div className="text-center py-8 text-slate-400">
                                        <Unlink className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                        <p>No orphan bands found. All bands have at least one show.</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-2 mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                                            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                                            <span>{orphans.length} band{orphans.length !== 1 ? 's' : ''} with no shows in any festival.</span>
                                        </div>
                                        <div className="space-y-1">
                                            {orphans.map(band => (
                                                <div key={band.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800/50 transition">
                                                    {band.image_url ? (
                                                        <img src={band.image_url} alt={band.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0 text-slate-500 text-xs font-bold">
                                                            {band.name.charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                    <span className="text-slate-200 text-sm font-medium flex-1 truncate">{band.name}</span>
                                                    {band.origin_country && (
                                                        <span className="text-xs text-slate-500 flex-shrink-0">{band.origin_country}</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Footer */}
                            {!loading && orphans.length > 0 && (
                                <div className="p-6 border-t border-slate-800 flex justify-end gap-3">
                                    <button
                                        onClick={onClose}
                                        className="px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={deleteAll}
                                        disabled={deleting}
                                        className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {deleting
                                            ? <Loader2 className="w-4 h-4 animate-spin" />
                                            : <Trash2 className="w-4 h-4" />
                                        }
                                        Delete all {orphans.length}
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

function CreateBandModal({ isOpen, onClose, onCreated }: { isOpen: boolean; onClose: () => void; onCreated: () => void }) {
    const [formData, setFormData] = useState({
        name: '',
        bio: '',
        origin_country: '',
        image_url: '',
        website_url: '',
        spotify_url: '',
        apple_music_url: ''
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase.from('bands').insert([formData] as any);
            if (error) throw error;

            onCreated();
            onClose();
            setFormData({ name: '', bio: '', origin_country: '', image_url: '', website_url: '', spotify_url: '', apple_music_url: '' });
        } catch (err: any) {
            console.error(err);
            alert(err.message);
        } finally {
            setLoading(false);
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
                                <h2 className="text-xl font-bold text-white">Add New Band</h2>
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

                                <div className="pt-4 flex justify-end gap-3">
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
                                        Save Band
                                    </button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
