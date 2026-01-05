import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ImageUpload } from '../components/ImageUpload';
import { LineupImporter } from '../components/Festivals/LineupImporter';
import { BandCombobox } from '../components/BandCombobox';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Plus, Trash2, MapPin, Calendar, Tent, Loader2, Music, X, Edit, CircleHelp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Festival {
    id: string;
    name: string;
    description: string | null;
    start_date: string;
    end_date: string;
    image_url: string | null;
    is_public: boolean;
}

interface Stage {
    id: string;
    name: string;
}

interface Show {
    id: string;
    start_time: string | null;
    end_time: string | null;
    stage_id: string;
    band_id: string;
    bands: {
        name: string;
    };
    duration?: number;
    is_late_night?: boolean;
    date_tbd?: boolean;
    time_tbd?: boolean;
}

export default function FestivalDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user, isAdmin } = useAuth();
    const [festival, setFestival] = useState<Festival | null>(null);
    const [stages, setStages] = useState<Stage[]>([]);
    const [shows, setShows] = useState<Show[]>([]);

    const [selectedDayLineup, setSelectedDayLineup] = useState<string>('all'); // 'all' | 'YYYY-MM-DD'
    const [loading, setLoading] = useState(true);
    const [newStageName, setNewStageName] = useState('');
    const [stageLoading, setStageLoading] = useState(false);
    const [editingShow, setEditingShow] = useState<Show | null>(null);
    const [isShowModalOpen, setIsShowModalOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);

    const festivalDays = React.useMemo(() => {
        if (!festival?.start_date || !festival?.end_date) return [];
        const start = new Date(festival.start_date);
        const end = new Date(festival.end_date);
        const days = [];
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            days.push(new Date(d));
        }
        return days;
    }, [festival]);



    const groupedLineup = React.useMemo(() => {
        const daysToRender = selectedDayLineup === 'all' ? festivalDays : [new Date(selectedDayLineup)];

        return daysToRender.map(day => {
            if (isNaN(day.getTime())) return null;
            const dateStr = day.toISOString().split('T')[0];
            const dayShows = shows.filter(show => {
                // If Date is TBD, skip
                if (show.date_tbd || !show.start_time) return false;

                const showDate = new Date(show.start_time);
                if (show.is_late_night) showDate.setDate(showDate.getDate() - 1);
                return showDate.toISOString().split('T')[0] === dateStr;
            });

            return {
                date: day,
                dateStr,
                stages: stages.map(stage => ({
                    stage,
                    shows: dayShows
                        .filter(s => s.stage_id === stage.id)
                        .sort((a, b) => {
                            if (!a.start_time || !b.start_time) return 0;
                            return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
                        })
                })).filter(g => g.shows.length > 0)
            };
        }).filter((d): d is NonNullable<typeof d> => d !== null && (selectedDayLineup !== 'all' || d.stages.length > 0));

    }, [festivalDays, shows, stages, selectedDayLineup]);

    const unscheduledShows = React.useMemo(() => {
        return shows.filter(s => s.date_tbd);
    }, [shows]);

    useEffect(() => {
        if (id) {
            fetchFestivalData();
        }
    }, [id, user]);





    const fetchFestivalData = async () => {
        try {
            setLoading(true);
            // Fetch festival details
            const { data: festivalData, error: festivalError } = await supabase
                .from('festivals')
                .select('*')
                .eq('id', id!)
                .single();

            if (festivalError) throw festivalError;
            setFestival(festivalData);

            // Fetch stages
            const { data: stagesData, error: stagesError } = await supabase
                .from('stages')
                .select('*')
                .eq('festival_id', id!)
                .order('name');

            if (stagesError) throw stagesError;
            setStages(stagesData || []);

            // Fetch shows
            const { data: showsData, error: showsError } = await supabase
                .from('shows')
                .select(`
            *,
            bands (name)
        `)
                .eq('festival_id', id!);

            if (showsError) throw showsError;
            setShows(showsData || []);

        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteShow = async (showId: string) => {
        if (!confirm('Are you sure you want to delete this show?')) return;
        try {
            const { error } = await supabase.from('shows').delete().eq('id', showId);
            if (error) throw error;
            setShows(shows.filter(s => s.id !== showId));
        } catch (error: any) {
            alert(error.message);
        }
    };

    const handleAddStage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newStageName.trim() || !id) return;
        setStageLoading(true);

        try {
            const { data, error } = await supabase
                .from('stages')
                .insert([{ name: newStageName, festival_id: id }] as any)
                .select()
                .single();

            if (error) throw error;
            setStages([...stages, data]);
            setNewStageName('');
        } catch (error: any) {
            alert(error.message);
        } finally {
            setStageLoading(false);
        }
    };

    const handleDeleteStage = async (stageId: string) => {
        if (!confirm('Are you sure you want to delete this stage?')) return;
        try {
            const { error } = await supabase.from('stages').delete().eq('id', stageId);
            if (error) throw error;
            setStages(stages.filter(s => s.id !== stageId));
        } catch (error: any) {
            alert(error.message);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            </div>
        );
    }

    if (!festival) {
        return <div className="text-center py-10 text-slate-400">Festival not found.</div>;
    }



    return (
        <div className="max-w-4xl mx-auto">
            <button onClick={() => navigate('/festivals')} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
                <ArrowLeft className="w-5 h-5" />
                Back to Festivals
            </button>

            {/* Header */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden mb-8">
                <div className="h-64 relative">
                    {festival.image_url ? (
                        <img src={festival.image_url} alt={festival.name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/50 to-slate-900">
                            <Tent className="w-20 h-20 text-purple-500/30" />
                        </div>
                    )}
                    <div className="absolute top-4 right-4 flex gap-2">
                        {isAdmin && (
                            <button
                                onClick={() => setIsEditOpen(true)}
                                className="p-2 bg-slate-900/60 hover:bg-slate-900 backdrop-blur rounded-full text-white transition-all border border-white/10"
                            >
                                <Edit className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-950 to-transparent p-8">
                        <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
                            {festival.name}
                            {isAdmin && !festival.is_public && (
                                <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded border border-orange-500/50 uppercase tracking-wider font-bold">
                                    Draft
                                </span>
                            )}
                        </h1>
                        <div className="flex gap-6 text-slate-300">
                            <div className="flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-purple-400" />
                                <span>{new Date(festival.start_date).toLocaleDateString()} - {new Date(festival.end_date).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
                {(festival.description) && (
                    <div className="p-8 border-t border-slate-800">
                        <p className="text-slate-300 leading-relaxed">{festival.description}</p>
                    </div>
                )}
            </div>

            <EditFestivalModal
                isOpen={isEditOpen}
                onClose={() => setIsEditOpen(false)}
                festival={festival}
                onUpdated={fetchFestivalData}
            />

            {/* Stages Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <MapPin className="w-6 h-6 text-purple-500" />
                            Stages
                        </h2>
                        <div className="bg-slate-800 px-3 py-1 rounded-full text-xs font-semibold text-slate-400">
                            {stages.length}
                        </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                        {isAdmin && (
                            <div className="p-4 border-b border-slate-800 bg-slate-900/50">
                                <form onSubmit={handleAddStage} className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Add new stage name..."
                                        className="flex-1 bg-slate-800 border-none rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-purple-500 placeholder-slate-500"
                                        value={newStageName}
                                        onChange={e => setNewStageName(e.target.value)}
                                    />
                                    <button
                                        type="submit"
                                        disabled={stageLoading}
                                        className="bg-purple-600 hover:bg-purple-500 text-white p-2 rounded-lg transition-colors"
                                    >
                                        {stageLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                                    </button>
                                </form>
                            </div>
                        )}

                        <div className="divide-y divide-slate-800">
                            <AnimatePresence>
                                {stages.map((stage) => (
                                    <motion.div
                                        key={stage.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        className="p-4 flex items-center justify-between group hover:bg-slate-800/50 transition-colors"
                                    >
                                        <span className="font-medium text-slate-200">{stage.name}</span>
                                        {isAdmin && (
                                            <button
                                                onClick={() => handleDeleteStage(stage.id)}
                                                className="text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                            {stages.length === 0 && (
                                <div className="p-8 text-center text-slate-500 text-sm">
                                    No stages added yet.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2 flex flex-col h-full">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <Music className="w-6 h-6 text-pink-500" />
                            Lineup
                        </h2>
                        {isAdmin && (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setIsImportOpen(true)}
                                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
                                >
                                    Import JSON
                                </button>
                                <button
                                    onClick={() => {
                                        setEditingShow(null);
                                        setIsShowModalOpen(true);
                                    }}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-pink-600 hover:bg-pink-500 text-white rounded-lg text-sm font-medium transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Show
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Day Filter Tabs */}
                    <div className="flex flex-wrap gap-2 mb-6">
                        <button
                            onClick={() => setSelectedDayLineup('all')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${selectedDayLineup === 'all' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}
                        >
                            All Days
                        </button>
                        {festivalDays.map(day => {
                            const dStr = day.toISOString().split('T')[0];
                            return (
                                <button
                                    key={dStr}
                                    onClick={() => setSelectedDayLineup(dStr)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${selectedDayLineup === dStr ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}
                                >
                                    {day.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                </button>
                            )
                        })}
                    </div>

                    <div className="space-y-8">
                        {/* Unscheduled / TBD Section */}
                        {unscheduledShows.length > 0 && selectedDayLineup === 'all' && (
                            <div className="mb-8 p-4 bg-slate-900 border-2 border-dashed border-slate-700 rounded-xl relative">
                                <h3 className="text-lg font-bold text-slate-300 mb-4 flex items-center gap-2">
                                    <CircleHelp className="w-5 h-5 text-slate-500" />
                                    Unscheduled / TBD Date
                                </h3>
                                <div className="space-y-2">
                                    {unscheduledShows.map(show => (
                                        <div key={show.id} className="p-3 bg-slate-800/50 rounded-lg flex items-center justify-between group hover:bg-slate-800 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center text-slate-500 font-mono text-sm border border-slate-700">
                                                    TBD
                                                </div>

                                                <div>
                                                    <div className="font-bold text-white text-lg">{show.bands?.name}</div>
                                                    <div className="text-xs text-slate-500 flex gap-2">
                                                        {stages.find(s => s.id === show.stage_id)?.name || 'Stage TBD'}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                {isAdmin && (
                                                    <>
                                                        <button
                                                            onClick={() => {
                                                                setEditingShow(show);
                                                                setIsShowModalOpen(true);
                                                            }}
                                                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition"
                                                            title="Edit show"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteShow(show.id)}
                                                            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-full transition"
                                                            title="Remove show"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {groupedLineup.length === 0 && unscheduledShows.length === 0 && (
                            <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-xl text-slate-500">
                                <Music className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p>No shows scheduled for this selection.</p>
                            </div>
                        )}

                        {groupedLineup.map(dayGroup => (
                            <div key={dayGroup.dateStr} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {/* Show day header if 'All' is selected */}
                                {(selectedDayLineup === 'all') && (
                                    <div className="flex items-center gap-4 mb-4">
                                        <h3 className="text-lg font-bold text-slate-300">
                                            {dayGroup.date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                                        </h3>
                                        <div className="h-px bg-slate-800 flex-1" />
                                    </div>
                                )}

                                <div className="grid grid-cols-1 gap-4">
                                    {dayGroup.stages.map(stageGroup => (
                                        <div key={stageGroup.stage.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                                            <div className="bg-slate-950/30 px-4 py-2 border-b border-slate-800 flex items-center justify-between">
                                                <h4 className="font-semibold text-slate-200 flex items-center gap-2 text-sm">
                                                    <MapPin className="w-3 h-3 text-slate-500" />
                                                    {stageGroup.stage.name}
                                                </h4>
                                            </div>
                                            <div className="divide-y divide-slate-800/50">
                                                {stageGroup.shows.map(show => (
                                                    <div key={show.id} className="p-3 flex items-center gap-4 hover:bg-slate-800/20 transition group">
                                                        <div className="text-center min-w-[3.5rem]">
                                                            <div className="font-bold text-white text-base leading-tight">
                                                                {show.time_tbd || !show.start_time
                                                                    ? <span className="text-slate-500 text-sm">TBD</span>
                                                                    : new Date(show.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                                }
                                                            </div>
                                                            {show.is_late_night && <span className="text-[10px] text-purple-400 uppercase font-bold tracking-wider">Late</span>}
                                                        </div>

                                                        <div className="flex-1">
                                                            <div className="flex items-center justify-between">
                                                                <h5 className="font-bold text-white group-hover:text-purple-400 transition-colors">
                                                                    {show.bands?.name}
                                                                </h5>
                                                            </div>
                                                            {!show.time_tbd && (
                                                                <div className="text-xs text-slate-500 flex items-center gap-2">
                                                                    <span className="flex items-center gap-1">
                                                                        {show.duration} min
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Interactions & Admin Actions */}
                                                        <div className="flex items-center gap-1">
                                                            {isAdmin && (
                                                                <>
                                                                    <button
                                                                        onClick={() => {
                                                                            setEditingShow(show);
                                                                            setIsShowModalOpen(true);
                                                                        }}
                                                                        className="ml-2 p-2 text-slate-600 hover:text-white hover:bg-slate-700/50 rounded-full transition opacity-0 group-hover:opacity-100"
                                                                        title="Edit show"
                                                                    >
                                                                        <Edit className="w-4 h-4" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteShow(show.id)}
                                                                        className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-full transition opacity-0 group-hover:opacity-100"
                                                                        title="Remove show"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>

            <ShowModal
                isOpen={isShowModalOpen}
                onClose={() => setIsShowModalOpen(false)}
                festival={festival!}
                stages={stages}
                onSuccess={fetchFestivalData}
                showToEdit={editingShow}
            />

            <LineupImporter
                isOpen={isImportOpen}
                onClose={() => setIsImportOpen(false)}
                festivalId={festival.id}
                onSuccess={fetchFestivalData}
            />
        </div>
    );
}

function ShowModal({ isOpen, onClose, festival, stages, onSuccess, showToEdit }: { isOpen: boolean; onClose: () => void; festival: Festival; stages: Stage[]; onSuccess: () => void; showToEdit: Show | null }) {
    const [bands, setBands] = useState<{ id: string, name: string }[]>([]);

    // Form State
    const [bandId, setBandId] = useState('');
    const [stageId, setStageId] = useState('');

    // Schedule State
    const [isDateTbd, setIsDateTbd] = useState(true);
    const [isTimeTbd, setIsTimeTbd] = useState(true);

    const [selectedDate, setSelectedDate] = useState(''); // YYYY-MM-DD
    const [startTime, setStartTime] = useState(''); // HH:mm
    const [endTime, setEndTime] = useState(''); // HH:mm
    const [duration, setDuration] = useState<number>(60); // minutes
    const [isLateNight, setIsLateNight] = useState(false);

    const [loading, setLoading] = useState(false);

    // Derived days from festival duration
    const festivalDays = React.useMemo(() => {
        if (!festival.start_date || !festival.end_date) return [];
        const start = new Date(festival.start_date);
        const end = new Date(festival.end_date);
        const days = [];
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            days.push(new Date(d));
        }
        return days;
    }, [festival]);

    useEffect(() => {
        if (isOpen) {
            fetchBands();
            if (stages.length > 0 && !stageId) setStageId(stages[0].id);
            if (festivalDays.length > 0 && !selectedDate) setSelectedDate(festivalDays[0].toISOString().split('T')[0]);
            setDuration(60);
            updateEndTime();

            if (showToEdit) {
                // Populate form
                setBandId(showToEdit.band_id);
                // Note: band_id binding might fail because showToEdit usually comes with joined band data (name), 
                // but we need band_id. We assumed show object has band_id at top level. 
                // Checking fetchFestivalData: .select('*, bands(name)') -> this usually returns band_id in the root object too? 
                // Supabase returns foreign keys. Yes.

                // setBandId(showToEdit['band_id' as keyof Show] as string); // Explicit check needed or update interface

                setStageId(showToEdit.stage_id || '');
                setIsDateTbd(!!showToEdit.date_tbd);
                setIsTimeTbd(!!showToEdit.time_tbd);

                if (showToEdit.start_time) {
                    const d = new Date(showToEdit.start_time);
                    if (showToEdit.is_late_night) d.setDate(d.getDate() - 1);
                    setSelectedDate(d.toISOString().split('T')[0]);

                    if (!showToEdit.time_tbd) {
                        setStartTime(new Date(showToEdit.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
                    }
                }

                if (showToEdit.duration) setDuration(showToEdit.duration);
                // End time calc handled by effect but we can set it explicitly if needed

                setIsLateNight(!!showToEdit.is_late_night);

            } else {
                // Info: Defaults
                setBandId('');
                setIsDateTbd(true);
                setIsTimeTbd(true);
                setIsLateNight(false);
                if (!startTime) setStartTime('18:00'); // Only set default if not editing
            }
        }
    }, [isOpen, showToEdit]);

    // If Date is TBD, Time must be TBD
    useEffect(() => {
        if (isDateTbd) setIsTimeTbd(true);
    }, [isDateTbd]);

    // Auto-detect Late Night when Start Time changes
    useEffect(() => {
        if (!startTime) return;
        const [hours] = startTime.split(':').map(Number);
        if (hours >= 0 && hours < 6) {
            setIsLateNight(true);
        } else {
            setIsLateNight(false);
        }
    }, [startTime]);

    // Recalculate End Time when Start, Duration or LateNight changes
    useEffect(() => {
        if (startTime && duration) {
            updateEndTime();
        }
    }, [startTime, duration, isLateNight]);

    const updateEndTime = () => {
        // Placeholder for future advanced sync logic
    };

    const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const dur = parseInt(e.target.value) || 0;
        setDuration(dur);
        // Calculate new End Time string
        if (startTime) {
            const [h, m] = startTime.split(':').map(Number);
            const totalMinutes = h * 60 + m + dur;
            const newH = Math.floor(totalMinutes / 60) % 24;
            const newM = totalMinutes % 60;
            setEndTime(`${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`);
        }
    };

    const handleEndTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEndTime(e.target.value);
        // Calculate new Duration
        if (startTime && e.target.value) {
            const [h1, m1] = startTime.split(':').map(Number);
            const [h2, m2] = e.target.value.split(':').map(Number);
            let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
            if (diff < 0) diff += 24 * 60; // Assumes next day if end < start
            setDuration(diff);
        }
    };

    const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newStart = e.target.value;
        setStartTime(newStart);
        // Update End Time based on duration
        if (newStart && duration) {
            const [h, m] = newStart.split(':').map(Number);
            const totalMinutes = h * 60 + m + duration;
            const newH = Math.floor(totalMinutes / 60) % 24;
            const newM = totalMinutes % 60;
            setEndTime(`${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`);
        }
    }

    const fetchBands = async () => {
        const { data } = await supabase.from('bands').select('id, name').order('name');
        setBands(data || []);
    };

    const handleCreateBand = async (name: string): Promise<string | null> => {
        try {
            const { data, error } = await supabase.from('bands').insert([{ name }]).select().single();
            if (error) throw error;
            setBands(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
            return data.id;
        } catch (error: any) {
            alert('Error creating band: ' + error.message);
            return null;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            let finalStartISO = null;
            let finalEndISO = null;

            if (!isDateTbd) {
                // Determine Date
                const dateStr = selectedDate;
                let finalDate = new Date(dateStr);

                if (isLateNight) {
                    finalDate.setDate(finalDate.getDate() + 1);
                }

                if (!isTimeTbd) {
                    const [startH, startM] = startTime.split(':').map(Number);
                    finalDate.setHours(startH, startM, 0, 0);
                    finalStartISO = finalDate.toISOString();

                    // End Time
                    const finalEnd = new Date(finalDate);
                    finalEnd.setMinutes(finalEnd.getMinutes() + duration);
                    finalEndISO = finalEnd.toISOString();
                } else {
                    // Date known, Time TBD
                    // Store strict date at 12:00 to imply middle of day? Or 00:00?
                    // Let's use 12:00 to be safe from TZ shifts to prev day
                    finalDate.setHours(12, 0, 0, 0);
                    finalStartISO = finalDate.toISOString();
                }
            }

            const payload: any = {
                festival_id: festival.id,
                band_id: bandId,
                stage_id: stageId || null, // Stage might be unknown if TBD line up? user said they want drag drop..
                start_time: finalStartISO,
                end_time: finalEndISO,
                is_late_night: isLateNight,
                date_tbd: isDateTbd,
                time_tbd: isTimeTbd
            };

            if (showToEdit) {
                const { error } = await supabase.from('shows').update(payload).eq('id', showToEdit.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('shows').insert([payload]);
                if (error) throw error;
            }

            onSuccess();
            onClose();
            // Reset simplified
            setBandId('');
            setStartTime('18:00');
            setDuration(60);
            setIsLateNight(false);
            setIsDateTbd(true);
        } catch (error: any) {
            alert(error.message);
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
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none p-4"
                    >
                        <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl pointer-events-auto flex flex-col max-h-[90vh] min-h-[600px]">
                            <div className="flex items-center justify-between p-6 border-b border-slate-800">
                                <h2 className="text-xl font-bold text-white">{showToEdit ? 'Edit Show' : 'Add Show'}</h2>
                                <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-track]:bg-slate-900">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-1">
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Select Stage</label>
                                        <select
                                            className="w-full bg-slate-800 border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-purple-500 outline-none appearance-none"
                                            value={stageId}
                                            onChange={e => setStageId(e.target.value)}
                                            required
                                        >
                                            {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Select Band</label>
                                        <BandCombobox
                                            bands={bands}
                                            value={bandId}
                                            onChange={setBandId}
                                            onCreate={handleCreateBand}
                                        />
                                        {/* Hidden input to enforce required validation if needed, though Combobox handles selection */}
                                        <input
                                            type="text"
                                            className="sr-only"
                                            value={bandId}
                                            required
                                            onChange={() => { }}
                                            onInvalid={e => (e.target as HTMLInputElement).setCustomValidity('Please select a band')}
                                            onInput={e => (e.target as HTMLInputElement).setCustomValidity('')}
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 mt-4 mb-2 md:col-span-2">
                                        <input
                                            type="checkbox"
                                            id="dateTbd"
                                            checked={isDateTbd}
                                            onChange={e => setIsDateTbd(e.target.checked)}
                                            className="w-4 h-4 rounded border-slate-600 text-purple-600 focus:ring-purple-500 bg-slate-800"
                                        />
                                        <label htmlFor="dateTbd" className="text-sm text-slate-300 font-medium">
                                            Date To Be Determined (TBD)
                                        </label>
                                    </div>
                                </div>

                                {!isDateTbd && (
                                    <div className="animate-in fade-in slide-in-from-top-2">
                                        <div className="mb-4">
                                            <label className="block text-sm font-medium text-slate-300 mb-1">Select Day</label>
                                            <select
                                                className="w-full bg-slate-800 border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-purple-500 outline-none appearance-none"
                                                value={selectedDate}
                                                onChange={e => setSelectedDate(e.target.value)}
                                                required={!isDateTbd}
                                            >
                                                {festivalDays.map((d, i) => (
                                                    <option key={d.toISOString()} value={d.toISOString().split('T')[0]}>
                                                        Day {i + 1} ({d.toLocaleDateString()})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="flex items-center gap-2 mb-4">
                                            <input
                                                type="checkbox"
                                                id="timeTbd"
                                                checked={isTimeTbd}
                                                onChange={e => setIsTimeTbd(e.target.checked)}
                                                className="w-4 h-4 rounded border-slate-600 text-purple-600 focus:ring-purple-500 bg-slate-800"
                                            />
                                            <label htmlFor="timeTbd" className="text-sm text-slate-300 font-medium">
                                                Time To Be Determined (TBD)
                                            </label>
                                        </div>

                                        {!isTimeTbd && (
                                            <div className="animate-in fade-in slide-in-from-top-2 border-t border-slate-800 pt-4">
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-300 mb-1">Start Time</label>
                                                        <input
                                                            type="time"
                                                            required={!isTimeTbd}
                                                            className="w-full bg-slate-800 border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                                                            value={startTime}
                                                            onChange={handleStartTimeChange}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-300 mb-1">Duration (min)</label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            required={!isTimeTbd}
                                                            className="w-full bg-slate-800 border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                                                            value={duration}
                                                            onChange={handleDurationChange}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-300 mb-1">End Time</label>
                                                        <input
                                                            type="time"
                                                            required={!isTimeTbd}
                                                            className="w-full bg-slate-800 border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                                                            value={endTime}
                                                            onChange={handleEndTimeChange}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 mt-4">
                                                    <input
                                                        type="checkbox"
                                                        id="lateNight"
                                                        checked={isLateNight}
                                                        onChange={e => setIsLateNight(e.target.checked)}
                                                        className="w-4 h-4 rounded border-slate-600 text-purple-600 focus:ring-purple-500 focus:ring-offset-slate-900 bg-slate-800"
                                                    />
                                                    <label htmlFor="lateNight" className="text-sm text-slate-300 cursor-pointer">
                                                        Late Night Show <span className="text-slate-500 ml-1">(technically next day)</span>
                                                    </label>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition flex items-center justify-center gap-2 mt-4"
                                >
                                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                    {showToEdit ? 'Save Changes' : 'Add to Schedule'}
                                </button>
                            </form>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}

function EditFestivalModal({ isOpen, onClose, festival, onUpdated }: { isOpen: boolean; onClose: () => void; festival: Festival; onUpdated: () => void }) {
    const [formData, setFormData] = useState({
        name: festival.name,
        description: festival.description || '',
        start_date: festival.start_date,
        end_date: festival.end_date,
        image_url: festival.image_url || '',
        is_public: festival.is_public
    });
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        setFormData({
            name: festival.name,
            description: festival.description || '',
            start_date: festival.start_date,
            end_date: festival.end_date,
            image_url: festival.image_url || '',
            is_public: festival.is_public
        });
    }, [festival]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await (supabase as any).from('festivals').update({
                ...formData
            }).eq('id', festival.id);

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
        if (confirm(`Are you sure you want to delete "${festival.name}"? This will permanently remove all associated stages, shows, and trips.`)) {
            setLoading(true);
            try {
                const { error } = await supabase.from('festivals').delete().eq('id', festival.id);
                if (error) throw error;
                navigate('/festivals');
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
                        <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl pointer-events-auto flex flex-col max-h-[90vh]">
                            <div className="flex items-center justify-between p-6 border-b border-slate-800">
                                <h2 className="text-xl font-bold text-white">Edit Festival</h2>
                                <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Name</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-slate-800 border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Start Date</label>
                                        <input
                                            type="date"
                                            required
                                            className="w-full bg-slate-800 border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                                            value={formData.start_date}
                                            onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">End Date</label>
                                        <input
                                            type="date"
                                            required
                                            className="w-full bg-slate-800 border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                                            value={formData.end_date}
                                            onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
                                    <textarea
                                        rows={3}
                                        className="w-full bg-slate-800 border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="flex items-center gap-3 p-3 bg-slate-800 border border-slate-700 rounded-lg cursor-pointer hover:bg-slate-800/80 transition">
                                        <input
                                            type="checkbox"
                                            className="w-5 h-5 rounded border-slate-600 text-purple-600 focus:ring-purple-500 bg-slate-900"
                                            checked={formData.is_public}
                                            onChange={e => setFormData({ ...formData, is_public: e.target.checked })}
                                        />
                                        <div>
                                            <span className="block text-sm font-medium text-white">Public Visible</span>
                                            <span className="block text-xs text-slate-400">Allow users to see and add this festival to trips.</span>
                                        </div>
                                    </label>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Cover Image</label>
                                    <ImageUpload
                                        value={formData.image_url}
                                        onChange={url => setFormData({ ...formData, image_url: url })}
                                        folder="festivals"
                                    />
                                </div>

                                <div className="pt-4 flex items-center justify-between">
                                    <button
                                        type="button"
                                        onClick={handleDelete}
                                        className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Delete Festival
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
                                            className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition flex items-center gap-2"
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
