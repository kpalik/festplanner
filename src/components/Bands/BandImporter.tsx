import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, Upload, AlertCircle, Check, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BandImportItem {
    name: string;
    origin_country?: string;
    website_url?: string;
    spotify_url?: string;
    apple_music_url?: string;
    image_url?: string;
}

interface ProcessedBand extends BandImportItem {
    status: 'ready' | 'error' | 'downloading_image' | 'image_done';
    message?: string;
    is_new: boolean;
    existing_id?: string;
    local_image_path?: string;
}

interface BandImporterProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function BandImporter({ isOpen, onClose, onSuccess }: BandImporterProps) {
    const [jsonInput, setJsonInput] = useState('');
    const [items, setItems] = useState<ProcessedBand[]>([]);
    const [step, setStep] = useState<'input' | 'preview' | 'processing'>('input');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [logs, setLogs] = useState<string[]>([]);

    const addLog = (msg: string) => setLogs(prev => [...prev, msg]);

    const handleParse = async () => {
        setError(null);
        setLoading(true);
        try {
            const parsed = JSON.parse(jsonInput);
            if (!Array.isArray(parsed)) throw new Error('Root element must be an array');

            // Quick validation & Check duplicates
            const { data: existingBands } = await (supabase as any).from('bands').select('id, name, origin_country');
            const processed: ProcessedBand[] = [];

            for (const item of parsed) {
                if (!item.name) continue;

                // Match by name AND country (if provided), or just name if country missing?
                // User said "Key should be name and country"
                const existing = existingBands?.find((b: any) =>
                    b.name.toLowerCase() === item.name.toLowerCase() &&
                    ((!item.origin_country && !b.origin_country) || (b.origin_country === item.origin_country))
                );

                processed.push({
                    name: item.name,
                    origin_country: item.origin_country,
                    website_url: item.website_url,
                    spotify_url: item.spotify_url,
                    apple_music_url: item.apple_music_url,
                    image_url: item.image_url,
                    status: 'ready',
                    is_new: !existing,
                    existing_id: existing?.id
                });
            }

            if (processed.length === 0) throw new Error('No valid items found');
            setItems(processed);
            setStep('preview');
        } catch (err: any) {
            setError('Invalid JSON: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const uploadImageFromUrl = async (url: string, bandName: string): Promise<string | null> => {
        try {
            // Fetch the image
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch image');

            const blob = await response.blob();
            const ext = url.split('.').pop()?.split('?')[0] || 'jpg';
            const fileName = `${bandName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}.${ext}`;
            const filePath = `bands/${fileName}`;

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('fest-images') // Assuming this bucket exists
                .upload(filePath, blob);

            if (uploadError) throw uploadError;

            // Get Public URL
            const { data } = supabase.storage
                .from('fest-images')
                .getPublicUrl(filePath);

            return data.publicUrl;
        } catch (e) {
            console.warn(`Image upload failed for ${bandName}:`, e);
            return null;
        }
    };

    const executeImport = async () => {
        setLoading(true);
        setStep('processing');
        setLogs([]);

        try {
            addLog('Starting import...');
            let processedCount = 0;

            for (const item of items) {
                addLog(`Processing ${item.name}...`);

                let startImage = item.image_url;
                if (startImage) {
                    addLog(`  Downloading image...`);
                    const localUrl = await uploadImageFromUrl(startImage, item.name);
                    if (localUrl) {
                        startImage = localUrl;
                        addLog(`  Image saved to storage.`);
                    } else {
                        addLog(`  Image download failed, keeping original URL.`);
                    }
                }

                const payload = {
                    name: item.name,
                    origin_country: item.origin_country,
                    website_url: item.website_url,
                    spotify_url: item.spotify_url,
                    apple_music_url: item.apple_music_url,
                    image_url: startImage
                };

                if (item.is_new) {
                    const { error } = await (supabase as any).from('bands').insert(payload);
                    if (error) throw error;
                    addLog(`  Created new entry.`);
                } else {
                    const { error } = await (supabase as any)
                        .from('bands')
                        .update(payload)
                        .eq('id', item.existing_id);
                    if (error) throw error;
                    addLog(`  Updated existing entry.`);
                }
                processedCount++;
            }

            addLog(`Success! Processed ${processedCount} bands.`);
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 1000);

        } catch (err: any) {
            addLog(`Error: ${err.message}`);
            setError(err.message);
        } finally {
            setLoading(false);
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
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
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
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Upload className="w-5 h-5 text-purple-500" />
                                    Import Bands JSON
                                </h2>
                                <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition">
                                    <Check className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-6 flex-1 overflow-y-auto">
                                {step === 'input' && (
                                    <div className="space-y-4">
                                        <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 text-sm text-slate-400">
                                            <p className="mb-2 font-semibold text-slate-300">Expected Format (Array of Objects):</p>
                                            <pre className="font-mono text-xs bg-slate-950 p-3 rounded border border-slate-800 overflow-x-auto text-green-400">
                                                {`[
  {
    "name": "Metallica",
    "origin_country": "USA",
    "website_url": "https://...",
    "spotify_url": "https://...",
    "image_url": "https://...",
    "bio": "...",
    "apple_music_url": "https://..."
  }
]`}
                                            </pre>
                                        </div>
                                        <textarea
                                            className="w-full h-64 bg-slate-950 border border-slate-700 rounded-lg p-4 font-mono text-sm text-slate-300 focus:ring-2 focus:ring-purple-500 outline-none"
                                            placeholder="Paste JSON here..."
                                            value={jsonInput}
                                            onChange={e => setJsonInput(e.target.value)}
                                        />
                                        {error && (
                                            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg flex items-center gap-2">
                                                <AlertCircle className="w-5 h-5" />
                                                {error}
                                            </div>
                                        )}
                                        <div className="flex justify-end">
                                            <button
                                                onClick={handleParse}
                                                disabled={loading || !jsonInput.trim()}
                                                className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition flex items-center gap-2 disabled:opacity-50"
                                            >
                                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                                Preview Import
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {step === 'preview' && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="text-sm text-slate-400">
                                                Found <strong className="text-white">{items.length}</strong> items.
                                                <span className="ml-2">
                                                    New: <strong className="text-green-400">{items.filter(i => i.is_new).length}</strong>
                                                </span>
                                            </div>
                                            <button onClick={() => setStep('input')} className="text-sm text-purple-400 hover:text-purple-300">
                                                Edit JSON
                                            </button>
                                        </div>

                                        <div className="border border-slate-700 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                                            <table className="w-full text-sm text-left">
                                                <thead className="bg-slate-800 text-slate-400 font-medium">
                                                    <tr>
                                                        <th className="p-3">Band Name</th>
                                                        <th className="p-3">Country</th>
                                                        <th className="p-3">Info</th>
                                                        <th className="p-3">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-800 bg-slate-900">
                                                    {items.map((item, i) => (
                                                        <tr key={i} className="hover:bg-slate-800/50">
                                                            <td className="p-3 font-medium text-white">
                                                                {item.name}
                                                                {item.image_url && <ImageIcon className="w-3 h-3 inline ml-2 text-slate-500" />}
                                                            </td>
                                                            <td className="p-3 text-slate-400">{item.origin_country || '-'}</td>
                                                            <td className="p-3 text-slate-400">
                                                                <div className="flex gap-1">
                                                                    {item.spotify_url && <div className="w-2 h-2 rounded-full bg-green-500"></div>}
                                                                    {item.website_url && <div className="w-2 h-2 rounded-full bg-blue-500"></div>}
                                                                </div>
                                                            </td>
                                                            <td className="p-3">
                                                                {item.is_new ? (
                                                                    <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded border border-green-500/30">Create</span>
                                                                ) : (
                                                                    <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded border border-yellow-500/30">Update</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        <div className="flex justify-end gap-3 pt-4">
                                            <button
                                                onClick={() => setStep('input')}
                                                className="px-4 py-2 text-slate-400 hover:text-white"
                                            >
                                                Back
                                            </button>
                                            <button
                                                onClick={executeImport}
                                                className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition shadow-lg shadow-green-900/20"
                                            >
                                                Confirm & Import
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {step === 'processing' && (
                                    <div className="space-y-4">
                                        <div className="bg-slate-950 rounded-lg p-4 font-mono text-xs text-slate-400 h-64 overflow-y-auto border border-slate-800">
                                            {logs.map((log, i) => (
                                                <div key={i} className="mb-1">
                                                    <span className="text-slate-600 mr-2">[{new Date().toLocaleTimeString()}]</span>
                                                    {log}
                                                </div>
                                            ))}
                                            {loading && <div className="animate-pulse text-purple-500">Processing...</div>}
                                        </div>
                                        {error && (
                                            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg">
                                                {error}
                                                <button onClick={() => setStep('input')} className="ml-2 underline">Try Again</button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
