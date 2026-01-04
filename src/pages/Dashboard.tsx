

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Tent, Calendar, Plus, Users, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Trip {
  id: string;
  name: string;
  festival_id: string | null;
  festivals: {
    name: string;
    image_url: string | null;
    start_date: string;
  } | null;
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select(`
                id, name, festival_id,
                festivals (name, image_url, start_date)
            `)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      setTrips(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">My Festival Plans</h1>
        <p className="text-slate-400">Manage your upcoming trips and schedules.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upcoming Trips */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-purple-500/30 transition-colors flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Upcoming Trips</h2>
            <button onClick={() => navigate('/trips')} className="text-sm text-purple-400 hover:text-purple-300 font-medium">View All</button>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center min-h-[12rem]">
              <Loader2 className="w-8 h-8 text-slate-600 animate-spin" />
            </div>
          ) : trips.length > 0 ? (
            <div className="space-y-4">
              {trips.map(trip => (
                <div
                  key={trip.id}
                  onClick={() => navigate(`/trips/${trip.id}`)}
                  className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/50 hover:border-purple-500/30 transition cursor-pointer flex items-center gap-4 group"
                >
                  <div className="w-12 h-12 rounded-lg bg-slate-800 overflow-hidden flex-shrink-0">
                    {trip.festivals?.image_url ? (
                      <img src={trip.festivals.image_url} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Tent className="w-6 h-6 text-slate-600" /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-slate-200 truncate group-hover:text-purple-400 transition-colors">{trip.name}</h3>
                    <p className="text-xs text-slate-500 truncate">{trip.festivals?.name}</p>
                  </div>
                </div>
              ))}
              <button onClick={() => navigate('/trips')} className="w-full py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-300 transition mt-2">
                Manage Trips
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 min-h-[12rem] border-2 border-dashed border-slate-800 rounded-xl text-slate-500">
              <p>No trips planned yet.</p>
              <button onClick={() => navigate('/trips')} className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-purple-400 rounded-lg text-sm font-medium transition-colors">
                + Create new Trip
              </button>
            </div>
          )}
        </div>

        {/* Placeholder for Festivals (Unchanged for now) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-purple-500/30 transition-colors">
          <h2 className="text-xl font-semibold mb-4 text-white">Popular Festivals</h2>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-slate-950/50">
                <div className="w-12 h-12 bg-slate-800 rounded-lg"></div>
                <div>
                  <div className="h-4 w-32 bg-slate-800 rounded mb-2"></div>
                  <div className="h-3 w-20 bg-slate-800 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
