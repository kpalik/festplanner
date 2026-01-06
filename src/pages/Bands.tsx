import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Plus, Search, Loader2, X, Edit, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ImageUpload } from '../components/ImageUpload';
import { EditBandModal, type Band } from '../components/EditBandModal';
import { BandCard } from '../components/BandCard';
import { BandImporter } from '../components/Bands/BandImporter';

export default function Bands() {
    const navigate = useNavigate();
    const { isAdmin } = useAuth();
    const [bands, setBands] = useState<Band[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [selectedBand, setSelectedBand] = useState<Band | null>(null);

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
        const missingDataBands = bands.filter(b => !b.image_url || !b.spotify_url);

        if (missingDataBands.length === 0) {
            alert("All bands already have image and Spotify URL!");
            return;
        }

        if (!confirm(`Found ${missingDataBands.length} bands with missing data. Fetch from Spotify? This might take a while.`)) return;

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
                const encodedName = encodeURIComponent(band.name);
                const url = `https://${rapidHost}/search/?q=${encodedName}&type=artists&offset=0&limit=1&numberOfTopResults=1`;

                const response = await fetch(url, {
                    method: 'GET',
                    headers: { 'X-Rapidapi-Key': rapidKey, 'X-Rapidapi-Host': rapidHost }
                });

                if (!response.ok) throw new Error('RapidAPI failed');

                const data = await response.json();
                const artistItem = data?.artists?.items?.[0]?.data;

                if (artistItem) {
                    const uri = artistItem.uri;
                    const spotifyId = uri.split(':')[2];
                    const spotifyUrl = `https://open.spotify.com/artist/${spotifyId}`;

                    const images: any[] = artistItem.visuals?.avatarImage?.sources || [];
                    images.sort((a: any, b: any) => b.width - a.width);
                    const imageUrl = images[0]?.url;

                    const updatePayload: any = { spotify_url: spotifyUrl };
                    if (imageUrl) updatePayload.image_url = imageUrl;

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

        </div>
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
