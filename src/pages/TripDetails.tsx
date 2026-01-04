import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Calendar, Loader2, Tent, Users, UserPlus, MapPin, Music, Heart, ThumbsUp, ThumbsDown, Trophy, Crown, CheckCircle2, Clock, CircleHelp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

interface Trip {
  id: string;
  name: string;
  description: string | null;
  festival_id: string | null;
  created_by: string;
  festivals: {
    id: string;
    name: string;
    image_url: string | null;
    start_date: string;
    end_date: string;
  } | null;
}

interface TripMember {
  id: string;
  user_id: string | null;
  invitation_email?: string;
  role: string;
  profiles: {
    email: string;
  } | null;
}

interface Show {
  id: string;
  start_time: string;
  end_time: string;
  stage_id: string;
  bands: {
    id: string;
    name: string;
    image_url: string | null;
  };
  stage?: {
    name: string;
  };
  is_late_night?: boolean;
}

interface Interaction {
  show_id: string;
  user_id: string;
  interaction_type: 'like' | 'must_see' | 'meh';
  user_email?: string;
}

export default function TripDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [members, setMembers] = useState<TripMember[]>([]);
  const [shows, setShows] = useState<Show[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'schedule' | 'ranking'>('schedule');

  // Member Invite State
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  const isOrganizer = useMemo(() => {
    if (!user || !trip) return false;
    return trip.created_by === user.id || members.some(m => m.user_id === user.id && m.role === 'admin');
  }, [user, trip, members]);

  useEffect(() => {
    if (id) {
      fetchTripData();
    }
  }, [id]);

  const fetchTripData = async () => {
    try {
      setLoading(true);

      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select(`
            *,
            festivals (
                id,
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

      const { data: membersData, error: membersError } = await supabase
        .from('trip_members')
        .select(`
            id,
            user_id,
            invitation_email,
            role,
            profiles (email)
        `)
        .eq('trip_id', id!);

      if (membersError) throw membersError;
      setMembers(membersData || []);

      if (tripData.festival_id) {
        // Fetch Shows
        const { data: showsData } = await supabase
          .from('shows')
          .select(`
                *,
                bands (id, name, image_url),
                stages (name)
            `)
          .eq('festival_id', tripData.festival_id);

        const formattedShows = (showsData || []).map((s: any) => ({
          ...s,
          stage: s.stages // map relation
        }));
        setShows(formattedShows);

        // Fetch Interactions for Members
        // Use user IDs from members list
        const memberIds = membersData?.map(m => m.user_id).filter(Boolean) || [];
        if (memberIds.length > 0) {
          const { data: interactionsData } = await supabase
            .from('show_interactions')
            .select('show_id, user_id, interaction_type')
            .in('user_id', memberIds);

          // Enrich with email for UI display
          const enriched = (interactionsData || []).map((i: any) => {
            const member = membersData?.find(m => m.user_id === i.user_id);
            return { ...i, user_email: member?.profiles?.email || 'Unknown' };
          });
          setInteractions(enriched);
        }
      }

    } catch (error) {
      console.error('Error fetching trip details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (email: string) => {
    if (!trip) return;
    try {
      // 1. Check if profile exists
      const { data: profile } = await supabase.from('profiles').select('id, email').eq('email', email).single();

      let insertPayload: any = {
        trip_id: trip.id,
        role: 'member'
      };

      if (profile) {
        insertPayload.user_id = profile.id;
      } else {
        // Create pending invite
        insertPayload.invitation_email = email;
        // Note: If you really wanted to create a Profile, you could try:
        // supabase.from('profiles').insert({ email, id: uuidv4() }) 
        // but without auth user it's disconnected. Better to rely on email mapping later.
      }

      const { error } = await supabase.from('trip_members').insert([insertPayload]);
      if (error) {
        if (error.code === '23505') alert('User already invited or in trip.');
        else throw error;
      } else {
        alert(profile ? 'User added to trip!' : 'Invitation sent (User needs to sign up).');
        fetchTripData();
        setIsInviteOpen(false);
      }
    } catch (e: any) {
      alert('Error inviting: ' + e.message);
    }
  };

  const dayTabs = useMemo(() => {
    if (!trip?.festivals) return [];
    const start = new Date(trip.festivals.start_date);
    const end = new Date(trip.festivals.end_date);
    const days = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }
    return days;
  }, [trip]);

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
    <div className="max-w-6xl mx-auto">
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
            {isOrganizer && (
              <button
                onClick={() => setIsInviteOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition"
              >
                <UserPlus className="w-4 h-4" />
                Invite
              </button>
            )}
          </div>

          <p className="text-slate-400 text-sm mb-4 line-clamp-2">
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Members Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden sticky top-6">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" />
                Trip Party
              </h3>
            </div>
            <div className="divide-y divide-slate-800">
              {members.map(member => (
                <div key={member.id} className="p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">
                    {(member.profiles?.email || member.invitation_email || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-sm text-slate-200 truncate">
                      {member.profiles?.email || member.invitation_email}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 capitalize">{member.role}</span>
                      {!member.user_id && <span className="text-[10px] bg-orange-500/20 text-orange-400 px-1 rounded">Pending</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl mb-6 w-fit border border-slate-800">
            <button
              onClick={() => setActiveTab('schedule')}
              className={clsx("px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2", activeTab === 'schedule' ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:text-white")}
            >
              <Calendar className="w-4 h-4" />
              Lineup & Votes
            </button>
            <button
              onClick={() => setActiveTab('ranking')}
              className={clsx("px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2", activeTab === 'ranking' ? "bg-amber-600 text-white shadow-lg" : "text-slate-400 hover:text-white")}
            >
              <Trophy className="w-4 h-4" />
              Group Ranking
            </button>
          </div>

          {activeTab === 'schedule' ? (
            <TripLineup
              shows={shows}
              days={dayTabs}
              members={members}
              interactions={interactions}
              currentUserId={user?.id}
              onInteractionUpdate={fetchTripData}
            />
          ) : (
            <TripRanking
              shows={shows}
              days={dayTabs}
              interactions={interactions}
            />
          )}
        </div>
      </div>

      <InviteMemberModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        onInvite={handleInvite}
      />
    </div>
  );
}

function TripLineup({ shows, days, members, interactions, currentUserId, onInteractionUpdate }: any) {
  const [selectedDay, setSelectedDay] = useState('all');

  const handleVote = async (showId: string, type: 'like' | 'must_see' | 'meh' | 'none') => {
    if (!currentUserId) return;

    try {
      if (type === 'none') {
        // Explicitly remove vote
        await supabase.from('show_interactions').delete().match({ user_id: currentUserId, show_id: showId });
      } else {
        const current = interactions.find((i: any) => i.show_id === showId && i.user_id === currentUserId)?.interaction_type;

        if (current === type) {
          // Toggle off -> remove (revert to question mark/none)
          await supabase.from('show_interactions').delete().match({ user_id: currentUserId, show_id: showId });
        } else {
          // Upsert new vote
          await supabase.from('show_interactions').upsert({
            user_id: currentUserId,
            show_id: showId,
            interaction_type: type
          }, { onConflict: 'user_id, show_id' });
        }
      }
      onInteractionUpdate();
    } catch (e) {
      console.error(e);
    }
  };

  const filteredShows = shows.filter((s: Show) => {
    if (selectedDay === 'all') return true;
    const d = new Date(s.start_time);
    if (s.is_late_night) d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0] === selectedDay;
  }).sort((a: Show, b: Show) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  return (
    <div className="space-y-6">
      {/* Day Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedDay('all')}
          className={clsx("px-3 py-1.5 rounded-lg text-sm transition", selectedDay === 'all' ? "bg-slate-700 text-white" : "bg-slate-900 border border-slate-800 text-slate-400 hover:border-slate-600")}
        >
          All Days
        </button>
        {days.map((d: Date) => {
          const val = d.toISOString().split('T')[0];
          return (
            <button
              key={val}
              onClick={() => setSelectedDay(val)}
              className={clsx("px-3 py-1.5 rounded-lg text-sm transition", selectedDay === val ? "bg-slate-700 text-white" : "bg-slate-900 border border-slate-800 text-slate-400 hover:border-slate-600")}
            >
              {d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}
            </button>
          )
        })}
      </div>

      <div className="space-y-4">
        {filteredShows.map((show: Show) => {
          const myVote = interactions.find((i: any) => i.show_id === show.id && i.user_id === currentUserId)?.interaction_type;
          const othersVotes = interactions.filter((i: any) => i.show_id === show.id && i.user_id !== currentUserId);

          return (
            <div key={show.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-blue-500/30 transition group">
              <div className="flex gap-4">
                <div className="text-center min-w-[3.5rem] pt-1">
                  <div className="font-bold text-white text-lg">
                    {new Date(show.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="text-xs text-slate-500 uppercase">{show.stage?.name}</div>
                </div>

                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <h4 className="text-lg font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">
                      {show.bands.name}
                    </h4>
                    <div className="flex items-center gap-2 bg-slate-950/50 p-1.5 rounded-full border border-slate-800/50">
                      <VoteButton type="meh" active={myVote === 'meh'} onClick={() => handleVote(show.id, 'meh')} />
                      <VoteButton type="question" active={!myVote} onClick={() => handleVote(show.id, 'none')} />
                      <VoteButton type="like" active={myVote === 'like'} onClick={() => handleVote(show.id, 'like')} />
                      <VoteButton type="must_see" active={myVote === 'must_see'} onClick={() => handleVote(show.id, 'must_see')} />
                    </div>
                  </div>

                  {/* Others Votes */}
                  {othersVotes.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {othersVotes.map((vote: any) => (
                        <div key={vote.user_id} className={clsx("text-xs px-2 py-0.5 rounded-full flex items-center gap-1 border",
                          vote.interaction_type === 'must_see' ? "bg-pink-500/10 border-pink-500/20 text-pink-300" :
                            vote.interaction_type === 'like' ? "bg-green-500/10 border-green-500/20 text-green-300" :
                              "bg-orange-500/10 border-orange-500/20 text-orange-300"
                        )}>
                          {vote.user_email?.split('@')[0]}
                          {vote.interaction_type === 'must_see' && <Heart className="w-3 h-3 fill-current" />}
                          {vote.interaction_type === 'like' && <ThumbsUp className="w-3 h-3" />}
                          {vote.interaction_type === 'meh' && <ThumbsDown className="w-3 h-3" />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  )
}

function VoteButton({ type, active, onClick }: any) {
  const config: any = {
    like: { icon: ThumbsUp, color: 'text-green-500', bg: 'bg-green-500/20' },
    must_see: { icon: Heart, color: 'text-pink-500', bg: 'bg-pink-500/20' },
    meh: { icon: ThumbsDown, color: 'text-orange-500', bg: 'bg-orange-500/20' },
    question: { icon: CircleHelp, color: 'text-slate-400', bg: 'bg-slate-800' }
  };
  const C = config[type];
  const Icon = C.icon;

  return (
    <button
      onClick={onClick}
      className={clsx("p-2 rounded-full transition", active ? `${C.color} ${C.bg}` : "text-slate-600 hover:bg-slate-800 hover:text-slate-300")}
      title={type.replace('_', ' ')}
    >
      <Icon className={clsx("w-5 h-5", active && type === 'must_see' && "fill-current")} />
    </button>
  )
}

function TripRanking({ shows, days, interactions }: any) {
  const [selectedDay, setSelectedDay] = useState('all');

  const scores = useMemo(() => {
    const map = new Map<string, number>(); // show_id -> score

    interactions.forEach((i: any) => {
      const val = i.interaction_type === 'must_see' ? 3 : i.interaction_type === 'like' ? 1 : -1;
      map.set(i.show_id, (map.get(i.show_id) || 0) + val);
    });

    // Filter by day if needed, then sort
    let relevantShows = shows;
    if (selectedDay !== 'all') {
      relevantShows = shows.filter((s: Show) => {
        const d = new Date(s.start_time);
        if (s.is_late_night) d.setDate(d.getDate() - 1);
        return d.toISOString().split('T')[0] === selectedDay;
      });
    }

    // Map shows to [Show, Score]
    const ranked = relevantShows.map((s: Show) => ({
      show: s,
      score: map.get(s.id) || 0
    })).sort((a: any, b: any) => b.score - a.score); // Descending score

    return ranked;
  }, [shows, interactions, selectedDay]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedDay('all')}
          className={clsx("px-3 py-1.5 rounded-lg text-sm transition", selectedDay === 'all' ? "bg-amber-600 text-white" : "bg-slate-900 border border-slate-800 text-slate-400 hover:border-slate-600")}
        >
          Overall Ranking
        </button>
        {days.map((d: Date) => {
          const val = d.toISOString().split('T')[0];
          return (
            <button
              key={val}
              onClick={() => setSelectedDay(val)}
              className={clsx("px-3 py-1.5 rounded-lg text-sm transition", selectedDay === val ? "bg-amber-600 text-white" : "bg-slate-900 border border-slate-800 text-slate-400 hover:border-slate-600")}
            >
              {d.toLocaleDateString(undefined, { weekday: 'short' })}
            </button>
          )
        })}
      </div>

      <div className="space-y-3">
        {scores.map((item: any, index: number) => (
          <div key={item.show.id} className="flex items-center gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <div className={clsx("w-8 h-8 flex items-center justify-center font-bold rounded-full",
              index === 0 ? "bg-yellow-500 text-black" :
                index === 1 ? "bg-slate-400 text-black" :
                  index === 2 ? "bg-orange-700 text-white" : "bg-slate-800 text-slate-500"
            )}>
              {index + 1}
            </div>

            <div className="flex-1">
              <h4 className="font-bold text-white text-lg">{item.show.bands.name}</h4>
              <div className="text-xs text-slate-500">
                {new Date(item.show.start_time).toLocaleTimeString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })} • {item.show.stage?.name}
              </div>
            </div>

            <div className="text-right">
              <div className="text-2xl font-black text-white">{item.score > 0 ? `+${item.score}` : item.score}</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">Points</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function InviteMemberModal({ isOpen, onClose, onInvite }: any) {
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onInvite(email);
    setEmail('');
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={onClose} />
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none p-4">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl p-6 pointer-events-auto">
              <h2 className="text-xl font-bold text-white mb-4">Invite to Trip</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Email Address</label>
                  <input type="email" required className="w-full bg-slate-800 border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    value={email} onChange={e => setEmail(e.target.value)} placeholder="friend@example.com" />
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg">Send Invite</button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
