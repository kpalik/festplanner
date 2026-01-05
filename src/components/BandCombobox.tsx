import React, { useState, useEffect, useRef } from 'react';
import { Check, ChevronsUpDown, Plus, Loader2, Music } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Band {
    id: string;
    name: string;
}

interface BandComboboxProps {
    bands: Band[];
    value: string | null;  // CURRENT selected band ID
    onChange: (bandId: string) => void;
    onCreate: (bandName: string) => Promise<string | null>; // Returns the new ID
}

export function BandCombobox({ bands, value, onChange, onCreate }: BandComboboxProps) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [creating, setCreating] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Derive selected name from ID
    const selectedBand = bands.find(b => b.id === value);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Filter bands
    const filteredBands = query === ''
        ? bands
        : bands.filter((band) =>
            band.name.toLowerCase().includes(query.toLowerCase())
        );

    const exactMatch = filteredBands.some(b => b.name.toLowerCase() === query.toLowerCase());

    const handleCreate = async () => {
        if (!query.trim()) return;
        setCreating(true);
        try {
            const newId = await onCreate(query);
            if (newId) {
                onChange(newId);
                setQuery('');
                setOpen(false);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setCreating(false);
        }
    }

    return (
        <div className="relative" ref={wrapperRef}>
            <div
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white flex items-center justify-between cursor-pointer hover:border-slate-600 focus-within:ring-2 focus-within:ring-purple-500 transition-all"
                onClick={() => setOpen(!open)}
            >
                <div className="flex items-center gap-2 flex-1 overflow-hidden">
                    <Music className="w-4 h-4 text-purple-500 shrink-0" />
                    <span className={selectedBand ? "text-white" : "text-slate-400"}>
                        {selectedBand ? selectedBand.name : "Select or create a band..."}
                    </span>
                </div>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </div>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-80 overflow-hidden flex flex-col"
                    >
                        <div className="p-2 border-b border-slate-700">
                            <input
                                type="text"
                                className="w-full bg-slate-900 border-none rounded px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:ring-1 focus:ring-purple-500 outline-none"
                                placeholder="Search bands..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>

                        <div className="overflow-y-auto flex-1 p-1 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-slate-600 [&::-webkit-scrollbar-track]:bg-slate-800/50">
                            {filteredBands.length === 0 && query !== '' && !creating && !exactMatch && (
                                <button
                                    type="button"
                                    className="w-full text-left px-2 py-2 text-sm text-purple-400 hover:bg-slate-700 rounded flex items-center gap-2"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleCreate();
                                    }}
                                >
                                    <Plus className="w-4 h-4" />
                                    Create "{query}"
                                </button>
                            )}

                            {creating && (
                                <div className="px-2 py-2 text-sm text-slate-400 flex items-center gap-2 justify-center">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Creating band...
                                </div>
                            )}

                            {filteredBands.map((band) => (
                                <button
                                    type="button"
                                    key={band.id}
                                    className={`w-full text-left px-2 py-2 text-sm rounded flex items-center justify-between group ${value === band.id ? 'bg-purple-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onChange(band.id);
                                        setOpen(false);
                                        setQuery('');
                                    }}
                                >
                                    <span>{band.name}</span>
                                    {value === band.id && <Check className="w-4 h-4" />}
                                </button>
                            ))}

                            {filteredBands.length === 0 && query === '' && bands.length === 0 && (
                                <div className="text-center py-4 text-xs text-slate-500">
                                    No bands found. Type to create one.
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
