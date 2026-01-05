import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, Upload, AlertCircle, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ImportItem {
    artist_name: string;
    date?: string; // YYYY-MM-DD
    start_time?: string; // HH:MM
    end_time?: string; // HH:MM
    date_tbd?: boolean;
    stage_name?: string;
    origin_country?: string; // Optional: create band with country
}

interface ProcessedItem extends ImportItem {
    status: 'ready' | 'error';
    message?: string;
    is_new_artist: boolean;
    artist_id?: string;
    resolved_stage_id?: string;
    resolved_stage_name?: string;
    is_new_stage?: boolean;
}

interface LineupImporterProps {
    isOpen: boolean;
    onClose: () => void;
    festivalId: string;
    onSuccess: () => void;
}

export function LineupImporter({ isOpen, onClose, festivalId, onSuccess }: LineupImporterProps) {
    const [jsonInput, setJsonInput] = useState('');
    const [items, setItems] = useState<ProcessedItem[]>([]);
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

            // Quick validation
            const processed: ProcessedItem[] = [];

            // Fetch existing artists to check matches
            const { data: existingBands } = await (supabase as any).from('bands').select('id, name');

            // Fetch stages for this festival
            const { data: festStages } = await (supabase as any).from('stages').select('id, name').eq('festival_id', festivalId);
            // setStages(festStages || []); // Unused state
            const stageMap = new Map<string, any>(festStages?.map((s: any) => [s.name.toLowerCase(), s]));

            for (const item of parsed) {
                if (!item.artist_name) continue;

                const existing = existingBands?.find((b: any) => b.name.toLowerCase() === item.artist_name.toLowerCase());

                let resolvedStage = null;
                if (item.stage_name) {
                    resolvedStage = stageMap.get(item.stage_name.toLowerCase());
                }

                processed.push({
                    artist_name: item.artist_name,
                    date: item.date,
                    start_time: item.start_time,
                    end_time: item.end_time,
                    date_tbd: item.date_tbd ?? (!item.date),
                    stage_name: item.stage_name,
                    origin_country: item.origin_country,
                    status: 'ready',
                    is_new_artist: !existing,
                    artist_id: existing?.id,
                    resolved_stage_id: resolvedStage?.id,
                    resolved_stage_name: resolvedStage?.name,
                    is_new_stage: !!(item.stage_name && !resolvedStage)
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

    const executeImport = async () => {
        setLoading(true);
        setStep('processing');
        setLogs([]);

        try {
            addLog('Starting import...');

            // 1. Create missing artists
            const newArtists = items.filter(i => i.is_new_artist);
            // Deduplicate names
            const uniqueNewNames = Array.from(new Set(newArtists.map(i => i.artist_name)));

            if (uniqueNewNames.length > 0) {
                addLog(`Creating ${uniqueNewNames.length} new artists...`);

                // Prepare payloads
                // We need to map back to original item to get country if available
                const payloads = uniqueNewNames.map(name => {
                    const source = newArtists.find(i => i.artist_name === name);
                    return {
                        name: name, // Supabase should handle this if unique constraint exists, but assuming simple insert
                        origin_country: source?.origin_country || null
                    };
                });

                const { data: createdArtists, error: createError } = await (supabase as any)
                    .from('bands')
                    .insert(payloads)
                    .select('id, name');

                if (createError) throw createError;
                addLog(`Created ${createdArtists?.length} artists.`);
            }

            // 2. Refresh bands to get all IDs
            addLog('Resolving artist IDs...');
            const { data: allBands } = await (supabase as any).from('bands').select('id, name');
            const bandMap = new Map(allBands?.map((b: any) => [b.name.toLowerCase(), b.id]));

            // 2b. Create missing stages
            const newStages = items.filter(i => i.is_new_stage);
            const uniqueNewStages = Array.from(new Set(newStages.map(i => i.stage_name!)));

            if (uniqueNewStages.length > 0) {
                addLog(`Creating ${uniqueNewStages.length} new stages...`);
                const { error: stageError } = await (supabase as any).from('stages').insert(
                    uniqueNewStages.map(name => ({
                        name: name,
                        festival_id: festivalId
                    }))
                );
                if (stageError) throw stageError;
            }

            // 3. Resolve Stages (Refresh to get IDs including new ones)
            const { data: refreshedStages } = await (supabase as any).from('stages').select('id, name').eq('festival_id', festivalId);
            const stageMap = new Map(refreshedStages?.map((s: any) => [s.name.toLowerCase(), s.id]));

            // 4. Create Shows
            addLog(`Creating ${items.length} shows...`);
            const showPayloads = items.map(item => {
                const bandId = bandMap.get(item.artist_name.toLowerCase());
                if (!bandId) return null; // Should not happen if creation worked

                // Resolve Stage ID again (now including newly created ones)
                const stageId = item.stage_name ? stageMap.get(item.stage_name.toLowerCase()) : null;

                let start_time = null;
                let end_time = null;
                let is_late_night = false;

                if (!item.date_tbd && item.date) {
                    // Logic to build timestamp
                    // Assuming date is YYYY-MM-DD
                    const dateStr = item.date;

                    if (item.start_time) {
                        // HH:MM
                        const [h] = item.start_time.split(':').map(Number);
                        const d = new Date(`${dateStr}T${item.start_time}:00`);

                        // Detect late night (00:00 - 05:00)
                        // If user says date is 12.06 and time is 01:00, usually they mean night after 12.06
                        // In FestivalDetails logic: "if is_late_night, showDate.setDate(showDate.getDate() - 1);"
                        // So if the stored date is 2026-06-13 01:00, and is_late_night=true, it shows up on 12th.

                        // Here we just store strict date provided. If time is 01:00, checks if it is late night.
                        if (h < 6) is_late_night = true;

                        // Important: If input JSON says "Date: 2026-06-12", "Time: 01:00", 
                        // Does that mean 12th night (technically 13th morning)?
                        // Usually existing tools might format it strictly. 
                        // Let's assume input date is the "Festival Day". 
                        // If time is 01:00, we add 1 day to calendar date.
                        if (is_late_night) {
                            d.setDate(d.getDate() + 1);
                        }

                        start_time = d.toISOString();

                        if (item.end_time) {
                            const dEnd = new Date(`${dateStr}T${item.end_time}:00`);
                            if (is_late_night) dEnd.setDate(dEnd.getDate() + 1);
                            // Handle crossing midnight manually if end < start?
                            // Simple approach: Use strict input
                            end_time = dEnd.toISOString();
                        }
                    } else {
                        // Date only
                        const d = new Date(dateStr);
                        d.setHours(12, 0, 0, 0); // Noon default
                        start_time = d.toISOString();
                    }
                }

                return {
                    festival_id: festivalId,
                    band_id: bandId,
                    stage_id: stageId || null,
                    start_time,
                    end_time,
                    is_late_night,
                    date_tbd: item.date_tbd,
                    time_tbd: !item.start_time
                };
            }).filter(Boolean);

            const { error: showsError } = await (supabase as any).from('shows').insert(showPayloads);
            if (showsError) throw showsError;

            addLog('Success! All shows imported.');
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
                                    Import Lineup JSON
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
    "artist_name": "Band Name",
    "date": "2026-06-10",
    "start_time": "18:00",
    "stage_name": "Main Stage",
    "date_tbd": false
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
                                                    New Artists: <strong className="text-green-400">{items.filter(i => i.is_new_artist).length}</strong>
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
                                                        <th className="p-3">Artist</th>
                                                        <th className="p-3">Stage</th>
                                                        <th className="p-3">Date</th>
                                                        <th className="p-3">Time</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-800 bg-slate-900">
                                                    {items.map((item, i) => (
                                                        <tr key={i} className="hover:bg-slate-800/50">
                                                            <td className="p-3 font-medium text-white">
                                                                {item.artist_name}
                                                                {item.is_new_artist && <span className="ml-2 text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded border border-green-500/30">NEW</span>}
                                                            </td>
                                                            <td className="p-3 text-slate-400">
                                                                {item.stage_name ? (
                                                                    item.resolved_stage_name ? (
                                                                        <span className="text-purple-400">{item.resolved_stage_name}</span>
                                                                    ) : (
                                                                        <span className="text-green-400 flex items-center gap-1">
                                                                            {item.stage_name}
                                                                            <span className="ml-1 text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded border border-green-500/30">NEW</span>
                                                                        </span>
                                                                    )
                                                                ) : (
                                                                    <span className="text-slate-600">-</span>
                                                                )}
                                                            </td>
                                                            <td className="p-3 text-slate-400">{item.date || 'TBD'}</td>
                                                            <td className="p-3 text-slate-400">{item.start_time || '-'}</td>
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
