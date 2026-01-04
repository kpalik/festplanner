import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Users, Calendar, Loader2, X, Tent } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';


interface Trip {
  id: string;
  name: string;
  description: string | null;
  festival_id: string | null;
  festivals: {
      name: string;
      image_url: string | null;
      start_date: string;
  } | null;
}

interface FestivalOption {
    id: string;
    name: string;
    start_date: string;
}

export default function Trips() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
        fetchTrips();
    }
  }, [user]);

  const fetchTrips = async () => {
    try {
      // Fetch trips where user is creator OR member
      // Since RLS policies handle visibility, we can just select from trips
      const { data, error } = await supabase
        .from('trips')
        .select(`
            *,
            festivals (
                name,
                image_url,
                start_date
            )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setTrips(data || []);
    } catch (error) {
      console.error('Error fetching trips:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
           <h1 className="text-3xl font-bold text-white mb-2">My Trips</h1>
           <p className="text-slate-400">Manage your festival plans with friends.</p>
        </div>
      <button
        onClick={() => setIsCreateOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-lg transition-all font-medium shadow-lg shadow-blue-500/20"
      >
            <Plus className="w-5 h-5" />
            Create Trip
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trips.map((trip) => (
            <div key={trip.id} className="group bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-blue-500/30 transition-all duration-300 flex flex-col h-full">
              <div className="h-40 bg-slate-800 relative overflow-hidden">
                {trip.festivals?.image_url ? (
                  <img src={trip.festivals.image_url} alt={trip.festivals.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                    <Tent className="w-12 h-12 text-slate-700" />
                  </div>
                )}
                {trip.festivals && (
                    <div className="absolute top-2 right-2 bg-slate-950/80 backdrop-blur px-2 py-1 rounded text-xs font-medium text-slate-300 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                         {new Date(trip.festivals.start_date).getFullYear()}
                    </div>
                )}
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <h3 className="text-xl font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">{trip.name}</h3>
                <div className="text-slate-400 text-sm mb-4 flex items-center gap-2">
                    <Tent className="w-4 h-4 text-slate-600" />
                    {trip.festivals?.name || "No Festival Linked"}
                </div>
                
                <p className="text-slate-500 text-sm line-clamp-2 mb-4 flex-1">
                    {trip.description || "No description."}
                </p>

                <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        1 Member
                    </div>
                    <button className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                        View Details →
                    </button>
                </div>
              </div>
            </div>
          ))}
          
          {trips.length === 0 && !loading && (
             <div className="col-span-full py-16 flex flex-col items-center justify-center text-center text-slate-500 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/30">
                 <Tent className="w-12 h-12 mb-4 text-slate-700" />
                 <h3 className="text-lg font-medium text-slate-300 mb-1">No trips yet</h3>
                 <p className="max-w-sm mx-auto mb-6">Start planning your next adventure by creating a trip linked to a festival.</p>
                 <button
                    onClick={() => setIsCreateOpen(true)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition"
                >
                    Create your first trip
                </button>
             </div>
          )}
        </div>
      )}

      <CreateTripModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} onCreated={fetchTrips} />
    </div>
  );
}

function CreateTripModal({ isOpen, onClose, onCreated }: { isOpen: boolean; onClose: () => void; onCreated: () => void }) {
    const [festivals, setFestivals] = useState<FestivalOption[]>([]);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        festival_id: ''
    });
    const [loading, setLoading] = useState(false);
    const { user } = useAuth();

    useEffect(() => {
        if (isOpen) {
            fetchFestivalOptions();
        }
    }, [isOpen]);

    const fetchFestivalOptions = async () => {
        const { data } = await supabase.from('festivals').select('id, name, start_date').order('start_date');
        setFestivals(data || []);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        if (!user) return;

        try {
             // 1. Create Trip
             const { data, error: tripError } = await supabase.from('trips').insert([{
                 name: formData.name,
                 description: formData.description,
                 festival_id: formData.festival_id || null,
                 created_by: user.id
             }] as any).select().single();

             if (tripError || !data) throw tripError || new Error("Failed to create trip");
             
             const tripData = data as Trip; // Safe cast since we know the schema

             // 2. Add Creator as Member (Admin)

             // 2. Add Creator as Member (Admin)
             const { error: memberError } = await supabase.from('trip_members').insert([{
                 trip_id: tripData.id,
                 user_id: user.id,
                 role: 'admin',
                 status: 'accepted'
             }] as any);

             if (memberError) throw memberError;
             
             onCreated();
             onClose();
             setFormData({ name: '', description: '', festival_id: '' });
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
                        <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl pointer-events-auto flex flex-col max-h-[90vh]">
                            <div className="flex items-center justify-between p-6 border-b border-slate-800">
                                <h2 className="text-xl font-bold text-white">Plan New Trip</h2>
                                <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            
                            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Trip Name</label>
                                    <input 
                                        type="text" 
                                        required
                                        placeholder="e.g. Summer Vibes 2024"
                                        className="w-full bg-slate-800 border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.name}
                                        onChange={e => setFormData({...formData, name: e.target.value})}
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Select Festival</label>
                                    <select 
                                        className="w-full bg-slate-800 border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                                        value={formData.festival_id}
                                        onChange={e => setFormData({...formData, festival_id: e.target.value})}
                                        required
                                    >
                                        <option value="">-- Choose Festival --</option>
                                        {festivals.map(f => (
                                            <option key={f.id} value={f.id}>
                                                {f.name} ({new Date(f.start_date).getFullYear()})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Description (Optional)</label>
                                    <textarea 
                                        rows={3}
                                        placeholder="Add notes about logistics, meeting points..."
                                        className="w-full bg-slate-800 border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                        value={formData.description}
                                        onChange={e => setFormData({...formData, description: e.target.value})}
                                    />
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
                                        className="px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-lg font-medium transition flex items-center gap-2"
                                    >
                                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                        Create Trip
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
