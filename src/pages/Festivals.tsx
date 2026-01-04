import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Calendar, MapPin, Loader2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

interface Festival {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  image_url: string | null;
  website_url: string | null;
  is_public: boolean;
}

export default function Festivals() {
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { } = useAuth();
  // TODO: Add proper Role check
  const isAdmin = true; // Temporary for development

  useEffect(() => {
    fetchFestivals();
  }, []);

  const fetchFestivals = async () => {
    try {
      const { data, error } = await supabase
        .from('festivals')
        .select('*')
        .order('start_date', { ascending: true });
      
      if (error) throw error;
      setFestivals(data || []);
    } catch (error) {
      console.error('Error fetching festivals:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
           <h1 className="text-3xl font-bold text-white mb-2">Festivals</h1>
           <p className="text-slate-400">Discover and manage music festivals.</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors font-medium shadow-lg shadow-purple-500/20"
          >
            <Plus className="w-5 h-5" />
            Create Festival
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {festivals.map((festival) => (
            <div key={festival.id} className="group bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-purple-500/30 transition-all duration-300">
              <div className="h-48 bg-slate-800 relative overflow-hidden">
                {festival.image_url ? (
                  <img src={festival.image_url} alt={festival.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                    <Calendar className="w-12 h-12 text-slate-700" />
                  </div>
                )}
                <div className="absolute top-2 right-2 bg-slate-950/80 backdrop-blur px-2 py-1 rounded text-xs font-medium text-slate-300">
                    {new Date(festival.start_date).getFullYear()}
                </div>
              </div>
              <div className="p-5">
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-purple-400 transition-colors">{festival.name}</h3>
                <p className="text-slate-400 text-sm line-clamp-2 mb-4">
                    {festival.description || "No description provided."}
                </p>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(festival.start_date).toLocaleDateString()}
                    </div>
                    {/* Placeholder for location if we add it later */}
                    <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        TBA
                    </div>
                </div>
              </div>
            </div>
          ))}
          
          {festivals.length === 0 && !loading && (
             <div className="col-span-full py-12 text-center text-slate-500 border-2 border-dashed border-slate-800 rounded-2xl">
                 <p>No festivals found.</p>
             </div>
          )}
        </div>
      )}

      <CreateFestivalModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} onCreated={fetchFestivals} />
    </div>
  );
}

function CreateFestivalModal({ isOpen, onClose, onCreated }: { isOpen: boolean; onClose: () => void; onCreated: () => void }) {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        start_date: '',
        end_date: '',
        website_url: '',
        image_url: ''
    });
    const [loading, setLoading] = useState(false);
    const { user } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
             // 1. Get current user profile to link (assuming trigger created profile)
             // However, strictly referencing profiles(id) might require ensuring the profile exists.
             
             const { error } = await supabase.from('festivals').insert([{
                 ...formData,
                 is_public: false, // Draft by default
                 created_by: user?.id 
             }] as any);

             if (error) throw error;
             
             onCreated();
             onClose();
             setFormData({ name: '', description: '', start_date: '', end_date: '', website_url: '', image_url: '' });
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
                                <h2 className="text-xl font-bold text-white">Create Festival</h2>
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
                                        onChange={e => setFormData({...formData, name: e.target.value})}
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
                                            onChange={e => setFormData({...formData, start_date: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">End Date</label>
                                        <input 
                                            type="date" 
                                            required
                                            className="w-full bg-slate-800 border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                                            value={formData.end_date}
                                            onChange={e => setFormData({...formData, end_date: e.target.value})}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
                                    <textarea 
                                        rows={3}
                                        className="w-full bg-slate-800 border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                                        value={formData.description}
                                        onChange={e => setFormData({...formData, description: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Website URL</label>
                                    <input 
                                        type="url" 
                                        className="w-full bg-slate-800 border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                                        value={formData.website_url}
                                        onChange={e => setFormData({...formData, website_url: e.target.value})}
                                        placeholder="https://"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Image URL</label>
                                    <input 
                                        type="url" 
                                        className="w-full bg-slate-800 border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                                        value={formData.image_url}
                                        onChange={e => setFormData({...formData, image_url: e.target.value})}
                                        placeholder="https://"
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
                                        className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition flex items-center gap-2"
                                    >
                                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                        Create Festival
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
