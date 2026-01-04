import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Calendar, Loader2, Tent, Users, UserPlus } from 'lucide-react';

interface Trip {
  id: string;
  name: string;
  description: string | null;
  festival_id: string | null;
  festivals: {
      name: string;
      image_url: string | null;
      start_date: string;
      end_date: string;
  } | null;
}

interface TripMember {
    id: string;
    user_id: string;
    role: string;
    profiles: {
        email: string;
    } | null;
}

export default function TripDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [trip, setTrip] = useState<Trip | null>(null);
  const [members, setMembers] = useState<TripMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
        fetchTripData();
    }
  }, [id]);

  const fetchTripData = async () => {
    try {
      setLoading(true);
      
      // Fetch Trip Details
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select(`
            *,
            festivals (
                name,
                image_url,
                start_date,
                end_date
            )
        `)
        .eq('id', id!)
        .single();
      
      if (tripError) throw tripError;
      setTrip(tripData);

      // Fetch Members
      const { data: membersData, error: membersError } = await supabase
        .from('trip_members')
        .select(`
            id,
            user_id,
            role,
            profiles (email)
        `)
        .eq('trip_id', id!);
      
      if (membersError) throw membersError;
      setMembers(membersData || []);

    } catch (error) {
      console.error('Error fetching trip details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
        <div className="flex justify-center items-center h-96">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
    );
  }

  if (!trip) {
    return <div className="text-center py-10 text-slate-400">Trip not found.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <button onClick={() => navigate('/trips')} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
        <ArrowLeft className="w-5 h-5" />
        Back to Trips
      </button>

      {/* Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden mb-8 grid grid-cols-1 md:grid-cols-3">
         <div className="h-48 md:h-auto bg-slate-800 relative">
             {trip.festivals?.image_url ? (
                  <img src={trip.festivals.image_url} alt={trip.festivals.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-900/50 to-slate-900">
                    <Tent className="w-16 h-16 text-blue-500/30" />
                  </div>
            )}
         </div>
         <div className="p-6 md:col-span-2 flex flex-col justify-center">
             <div className="flex items-start justify-between mb-2">
                 <div>
                    <h1 className="text-3xl font-bold text-white mb-1">{trip.name}</h1>
                    <div className="text-blue-400 font-medium flex items-center gap-2">
                        <Tent className="w-4 h-4" />
                        {trip.festivals?.name || "Unknown Festival"}
                    </div>
                 </div>
                 {/* Future: Invite Button */}
             </div>
             
             <p className="text-slate-400 text-sm mb-4 line-clamp-3">
                 {trip.description || "No description provided."}
             </p>

             <div className="flex items-center gap-6 text-sm text-slate-500 border-t border-slate-800 pt-4 mt-auto">
                <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {trip.festivals ? new Date(trip.festivals.start_date).toLocaleDateString() : 'TBA'}
                </div>
                <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    {members.length} Members
                </div>
             </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
         {/* Members Sidebar */}
         <div className="md:col-span-1">
             <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                 <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                     <h3 className="font-semibold text-white flex items-center gap-2">
                         <Users className="w-4 h-4 text-blue-500" />
                         Members
                     </h3>
                     <button className="text-slate-400 hover:text-white transition">
                         <UserPlus className="w-4 h-4" />
                     </button>
                 </div>
                 <div className="divide-y divide-slate-800">
                     {members.map(member => (
                         <div key={member.id} className="p-3 flex items-center gap-3">
                             <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">
                                 {member.profiles?.email?.charAt(0).toUpperCase() || '?'}
                             </div>
                             <div className="overflow-hidden">
                                 <div className="text-sm text-slate-200 truncate">{member.profiles?.email}</div>
                                 <div className="text-xs text-slate-500 capitalize">{member.role}</div>
                             </div>
                         </div>
                     ))}
                 </div>
             </div>
         </div>

         {/* Main Content Area (Schedule/Planning) */}
         <div className="md:col-span-2">
              <div className="bg-slate-900 border-2 border-dashed border-slate-800 rounded-xl p-12 flex flex-col items-center justify-center text-center">
                <Calendar className="w-16 h-16 text-slate-700 mb-4" />
                <h3 className="text-white font-medium mb-2 text-lg">Trip Schedule</h3>
                <p className="text-slate-500 max-w-sm mb-6">
                    Start adding performances from the festival lineup to your group's schedule.
                </p>
                <button className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition font-medium">
                    Browse Festival Lineup
                </button>
            </div>
         </div>
      </div>
    </div>
  );
}
