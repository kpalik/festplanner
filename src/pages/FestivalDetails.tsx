import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Plus, Trash2, MapPin, Calendar, Tent, Loader2, Music, X } from 'lucide-react';
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
  start_time: string;
  end_time: string;
  stage_id: string;
  bands: {
    name: string;
  };
}

export default function FestivalDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [festival, setFestival] = useState<Festival | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);
  const [newStageName, setNewStageName] = useState('');
  const [stageLoading, setStageLoading] = useState(false);
  const [isAddShowOpen, setIsAddShowOpen] = useState(false);

  useEffect(() => {
    if (id) {
      fetchFestivalData();
    }
  }, [id]);

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
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-950 to-transparent p-8">
                <h1 className="text-4xl font-bold text-white mb-2">{festival.name}</h1>
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

      {/* Stages Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                                <button 
                                    onClick={() => handleDeleteStage(stage.id)}
                                    className="text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
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

        <div>
            <div className="flex items-center justify-between mb-6">
                 <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <Music className="w-6 h-6 text-pink-500" />
                    Lineup
                </h2>
                 <button 
                    onClick={() => setIsAddShowOpen(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-pink-600 hover:bg-pink-500 text-white rounded-lg text-sm font-medium transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Add Show
                </button>
            </div>

             <div className="space-y-6">
                {stages.map(stage => {
                    const stageShows = shows.filter(s => s.stage_id === stage.id).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
                    return (
                        <div key={stage.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                            <div className="px-4 py-3 bg-slate-800/50 border-b border-slate-800 font-semibold text-slate-200">
                                {stage.name}
                            </div>
                            <div className="divide-y divide-slate-800">
                                {stageShows.map(show => (
                                    <div key={show.id} className="p-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="text-center w-16">
                                                <div className="text-sm font-bold text-slate-200">
                                                    {new Date(show.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    {new Date(show.end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="font-bold text-white text-lg">{show.bands?.name}</div>
                                                <div className="text-xs text-slate-500">{new Date(show.start_time).toLocaleDateString()}</div>
                                            </div>
                                        </div>
                                         <button 
                                            onClick={() => handleDeleteShow(show.id)}
                                            className="text-slate-600 hover:text-red-400 p-2 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                                {stageShows.length === 0 && (
                                    <div className="p-4 text-center text-slate-600 text-sm italic">
                                        No shows scheduled.
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
                 {stages.length === 0 && (
                    <div className="text-center text-slate-500 py-8">
                        Add stages first to create the lineup.
                    </div>
                )}
             </div>
        </div>

      </div>

      <AddShowModal 
        isOpen={isAddShowOpen} 
        onClose={() => setIsAddShowOpen(false)} 
        festivalId={id!} 
        stages={stages}
        onCreated={fetchFestivalData}
      />
    </div>
  );
}

function AddShowModal({ isOpen, onClose, festivalId, stages, onCreated }: { isOpen: boolean; onClose: () => void; festivalId: string; stages: Stage[]; onCreated: () => void }) {
    const [bands, setBands] = useState<{id: string, name: string}[]>([]);
    const [formData, setFormData] = useState({
        band_id: '',
        stage_id: '',
        start_time: '',
        end_time: ''
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchBands();
            if (stages.length > 0 && !formData.stage_id) {
                setFormData(prev => ({ ...prev, stage_id: stages[0].id }));
            }
        }
    }, [isOpen]);

    const fetchBands = async () => {
        const { data } = await supabase.from('bands').select('id, name').order('name');
        setBands(data || []);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { error } = await supabase.from('shows').insert([{
                festival_id: festivalId,
                ...formData
            }] as any);
            
            if (error) throw error;
            onCreated();
            onClose();
            setFormData(prev => ({ ...prev, band_id: '', start_time: '', end_time: '' }));
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
                         <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl pointer-events-auto flex flex-col">
                            <div className="flex items-center justify-between p-6 border-b border-slate-800">
                                <h2 className="text-xl font-bold text-white">Add Show</h2>
                                <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Select Stage</label>
                                    <select 
                                        className="w-full bg-slate-800 border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-purple-500 outline-none appearance-none"
                                        value={formData.stage_id}
                                        onChange={e => setFormData({...formData, stage_id: e.target.value})}
                                        required
                                    >
                                        {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Select Band</label>
                                    <select 
                                        className="w-full bg-slate-800 border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-purple-500 outline-none appearance-none"
                                        value={formData.band_id}
                                        onChange={e => setFormData({...formData, band_id: e.target.value})}
                                        required
                                    >
                                        <option value="">-- Choose Band --</option>
                                        {bands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                     <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Start Time</label>
                                        <input 
                                            type="datetime-local" 
                                            required
                                            className="w-full bg-slate-800 border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                                            value={formData.start_time}
                                            onChange={e => setFormData({...formData, start_time: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">End Time</label>
                                        <input 
                                            type="datetime-local" 
                                            required
                                            className="w-full bg-slate-800 border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                                            value={formData.end_time}
                                            onChange={e => setFormData({...formData, end_time: e.target.value})}
                                        />
                                    </div>
                                </div>
                                <button 
                                    type="submit" 
                                    disabled={loading}
                                    className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition flex items-center justify-center gap-2 mt-4"
                                >
                                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Add to Schedule
                                </button>
                            </form>
                         </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
