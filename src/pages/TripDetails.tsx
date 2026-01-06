import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Calendar, Loader2, Tent, Users, UserPlus, Heart, ThumbsUp, ThumbsDown, Trophy, Trash, Music, Edit, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { BandCard } from '../components/BandCard';
import { SpotifyEmbed } from '../components/SpotifyEmbed';

interface Trip {
  id: string;
  name: string;
  description: string | null;
  festival_id: string | null;
  created_by: string;
  is_ranking_hidden?: boolean;
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
  start_time: string | null;
  end_time: string | null;
  stage_id: string;
  bands: {
    id: string;
    name: string;
    image_url: string | null;
    spotify_url?: string | null;
    bio?: string;
    origin_country?: string;
    website_url?: string;
    apple_music_url?: string;
  };
  stage?: {
    name: string;
  };
  is_late_night?: boolean;
  date_tbd?: boolean;
  time_tbd?: boolean;
  type?: 'normal' | 'headliner';
}

interface Interaction {
  show_id: string;
  user_id: string;
  interaction_type: number;
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
  const [isEditOpen, setIsEditOpen] = useState(false);

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
      if (!trip) setLoading(true);

      const { data: tripData, error: tripError } = await (supabase as any)
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

      const { data: membersData, error: membersError } = await (supabase as any)
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
        const { data: showsData } = await (supabase as any)
          .from('shows')
          .select(`
                *,
                bands (id, name, image_url, spotify_url, bio, origin_country, website_url, apple_music_url),
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
        const memberIds = membersData?.map((m: any) => m.user_id).filter(Boolean) || [];
        if (memberIds.length > 0) {
          const { data: interactionsData } = await (supabase as any)
            .from('show_interactions')
            .select('show_id, user_id, interaction_type')
            .in('user_id', memberIds);

          // Enrich with email for UI display
          const enriched = (interactionsData || []).map((i: any) => {
            const member = membersData?.find((m: any) => m.user_id === i.user_id);
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

  const handleRemoveMember = async (memberId: string, memberEmail: string) => {
    if (!trip || !isOrganizer) return;
    if (!confirm(`Are you sure you want to remove ${memberEmail} from this trip? Their votes will be hidden from the ranking.`)) return;

    try {
      const { error } = await supabase.from('trip_members').delete().eq('id', memberId);
      if (error) throw error;

      // Optionally, we could also delete their interactions for this trip's shows to clean up DB, 
      // but just removing them from the member list automatically excludes them from the ranking calculation in this UI.

      fetchTripData();
    } catch (e: any) {
      console.error('Error removing member:', e);
      alert('Error removing member: ' + e.message);
    }
  };

  const handleInvite = async (email: string) => {
    if (!trip) return;
    try {
      // 1. Check if profile exists
      const { data: profile } = await (supabase as any).from('profiles').select('id, email').eq('email', email).single();

      let insertPayload: any = {
        trip_id: trip.id,
        role: 'member',
        status: 'pending'
      };

      if (profile) {
        insertPayload.user_id = profile.id;
      } else {
        // Create pending invite
        insertPayload.invitation_email = email;
      }

      const { error } = await (supabase as any).from('trip_members').insert([insertPayload]);
      if (error) {
        if (error.code === '23505') alert('User already invited or in trip.');
        else throw error;
      } else {
        // 2. If new user, try to send invite email via Edge Function
        if (!profile) {
          try {
            await supabase.functions.invoke('invite-user', {
              body: {
                email,
                tripId: trip.id,
                tripName: trip.name
              }
            });
          } catch (invErr: any) {
            console.warn('Failed to send invite email:', invErr);
            alert('Warning: Only invite created in DB. Email failed to send: ' + (invErr.message || invErr));
          }
        }

        fetchTripData();
        setIsInviteOpen(false);
      }
    } catch (e: any) {
      console.error('Error inviting:', e);
      alert('Error inviting: ' + e.message);
    }
  };

  const handleDeleteTrip = async () => {
    if (!trip) return;
    if (!confirm("Are you sure you want to delete this trip? This action cannot be undone.")) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('trips').delete().eq('id', trip.id);
      if (error) throw error;
      navigate('/trips');
    } catch (error: any) {
      console.error("Error deleting trip:", error);
      alert("Failed to delete trip: " + error.message);
      setLoading(false);
    }
  };

  const handleUpdateTrip = async (updates: Partial<Trip>) => {
    if (!trip) return;
    try {
      // Remove relation fields that are not columns in 'trips' table
      const { festivals, ...cleanUpdates } = updates as any;

      const { error } = await supabase
        .from('trips')
        // @ts-ignore
        .update(cleanUpdates)
        .eq('id', trip.id);

      if (error) throw error;
      fetchTripData();
      setIsEditOpen(false);
    } catch (error: any) {
      console.error("Error updating trip:", error);
      alert("Failed to update trip: " + error.message);
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
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditOpen(true)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition"
                  title="Edit Trip"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsInviteOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition"
                >
                  <UserPlus className="w-4 h-4" />
                  Invite
                </button>
                <button
                  onClick={handleDeleteTrip}
                  className="p-2 bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-500 rounded-lg transition"
                  title="Delete Trip"
                >
                  <Trash className="w-4 h-4" />
                </button>
              </div>
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
                  <div className="overflow-hidden flex-1">
                    <div className="text-sm text-slate-200 truncate">
                      {member.profiles?.email || member.invitation_email}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 capitalize">{member.role}</span>
                      {!member.user_id && <span className="text-[10px] bg-orange-500/20 text-orange-400 px-1 rounded">Pending</span>}
                    </div>
                  </div>
                  {isOrganizer && member.user_id !== user?.id && (
                    <button
                      onClick={() => handleRemoveMember(member.id, member.profiles?.email || member.invitation_email || 'User')}
                      className="p-1.5 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded transition"
                      title="Remove Member"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  )}
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
            {!trip.is_ranking_hidden && (
              <button
                onClick={() => setActiveTab('ranking')}
                className={clsx("px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2", activeTab === 'ranking' ? "bg-amber-600 text-white shadow-lg" : "text-slate-400 hover:text-white")}
              >
                <Trophy className="w-4 h-4" />
                Group Ranking
              </button>
            )}
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

      <EditTripModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        trip={trip}
        onUpdate={handleUpdateTrip}
      />
    </div>
  );
}

function TripLineup({ shows, days, interactions, currentUserId, onInteractionUpdate }: any) {
  const [selectedDay, setSelectedDay] = useState('all');
  const [playingShowId, setPlayingShowId] = useState<string | null>(null);
  const [hideRated, setHideRated] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleVote = async (showId: string, rating: number) => {
    if (!currentUserId) return;

    try {
      const current = interactions.find((i: any) => i.show_id === showId && i.user_id === currentUserId)?.interaction_type;

      if (current === rating) {
        // Toggle off
        await (supabase as any).from('show_interactions').delete().match({ user_id: currentUserId, show_id: showId });
      } else {
        // Upsert new vote
        await (supabase as any).from('show_interactions').upsert({
          user_id: currentUserId,
          show_id: showId,
          interaction_type: rating
        }, { onConflict: 'user_id, show_id' });
      }
      onInteractionUpdate();
    } catch (e) {
      console.error(e);
    }
  };

  const filteredShows = shows.filter((s: Show) => {
    // 1. Filter by Search Query
    if (searchQuery && !s.bands.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // 2. Filter by Hide Rated
    if (hideRated && currentUserId) {
      const hasRated = interactions.some((i: any) => i.show_id === s.id && i.user_id === currentUserId && i.interaction_type > 0);
      if (hasRated) return false;
    }

    // 3. Filter by Day
    if (selectedDay === 'all') return true;

    // If Date TBD, only show in 'all' (already covered) or maybe a specific 'TBD' filter if added.
    // If we are filtering by a specific day, skip TBD dates.
    if (s.date_tbd || !s.start_time) return false;

    const d = new Date(s.start_time);
    if (s.is_late_night) d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0] === selectedDay;
  }).sort((a: Show, b: Show) => {
    // Sort by type (headliner first)
    if (a.type === 'headliner' && b.type !== 'headliner') return -1;
    if (a.type !== 'headliner' && b.type === 'headliner') return 1;

    // Then TBD logic
    if (a.date_tbd && !b.date_tbd) return 1;
    if (!a.date_tbd && b.date_tbd) return -1;

    // Then Time
    if (!a.start_time || !b.start_time) return 0;
    return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
  });

  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 p-3 rounded-xl sticky top-[73px] z-30 shadow-xl shadow-slate-950/50 backdrop-blur-md bg-slate-900/90 md:relative md:top-0 md:bg-slate-900 md:shadow-none md:p-4">
        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800 border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-600"
          />
        </div>

        {/* Filters */}
        <label className="flex items-center gap-2 text-xs md:text-sm text-slate-300 cursor-pointer select-none flex-shrink-0 bg-slate-800/50 px-3 py-2 rounded-lg border border-slate-700/50 hover:bg-slate-800 transition-colors">
          <div className="relative">
            <input
              type="checkbox"
              checked={hideRated}
              onChange={(e) => setHideRated(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-8 h-4 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"></div>
          </div>
          <span className="font-medium whitespace-nowrap">Hide Rated</span>
        </label>
      </div>

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


          return (
            <BandCard
              key={show.id}
              band={show.bands as any}
              imageHeight="h-72"
              showCenterPlayButton={true}
              isPlayerOpen={playingShowId === show.id}
              onPlayClick={show.bands.spotify_url ? () => setPlayingShowId(playingShowId === show.id ? null : show.id) : undefined}
              playerContent={
                show.bands.spotify_url && (
                  <SpotifyEmbed spotifyUrl={show.bands.spotify_url} height={152} />
                )
              }
              title={
                <div className="flex items-center gap-2 min-w-0">
                  <span className={clsx(show.type === 'headliner' && "text-yellow-400")}>{show.bands.name}</span>
                  {show.type === 'headliner' && <span className="flex-shrink-0 text-[10px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-1.5 rounded uppercase tracking-wider font-bold shadow-sm">Headliner</span>}
                </div>
              }
              subtitle={
                <div className="flex items-center gap-2 text-xs font-medium text-slate-300 uppercase tracking-wider">
                  <span className="drop-shadow-sm">
                    {show.time_tbd || !show.start_time
                      ? 'Time TBD'
                      : new Date(show.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    }
                  </span>
                  <span className="text-slate-500">•</span>
                  <span className="truncate max-w-[150px] drop-shadow-sm">{show.stage?.name || 'Stage TBD'}</span>
                </div>
              }
              topRightActions={
                show.bands.spotify_url && (
                  <a
                    href={show.bands.spotify_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 bg-black/40 hover:bg-black/60 backdrop-blur rounded-full text-[#1DB954] hover:text-[#1ed760] transition-colors border border-white/10"
                    title="Open in Spotify App"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Music className="w-4 h-4" />
                  </a>
                )
              }
              footer={
                <div className="px-2 py-1">
                  <RatingControl myVote={myVote} onVote={(val: number) => handleVote(show.id, val)} />
                </div>
              }
            />
          );
        })}
      </div>
    </div>
  )
}

function RatingControl({ myVote, onVote }: { myVote?: number, onVote: (val: number) => void }) {
  return (
    <div className="flex flex-wrap items-center w-full rounded-xl overflow-hidden rating-container">
      {[...Array(10)].map((_, i) => {
        const val = i + 1;
        const isActive = myVote === val;

        // Icons for specific values
        let Content: React.ReactNode = <span className="text-sm font-medium font-mono">{val}</span>;
        if (val === 1) Content = <ThumbsDown className={clsx("w-4 h-4", isActive && "fill-current")} />;
        if (val === 6) Content = <ThumbsUp className={clsx("w-4 h-4", isActive && "fill-current")} />;
        if (val === 10) Content = <Heart className={clsx("w-4 h-4", isActive && "fill-current")} />;

        // Colors
        let activeClass = "bg-blue-600 text-white"; // default active
        if (isActive) {
          if (val === 1) activeClass = "bg-orange-600 text-white";
          if (val === 6) activeClass = "bg-green-600 text-white";
          if (val === 10) activeClass = "bg-pink-600 text-white";
        }

        return (
          <button
            key={val}
            onClick={() => onVote(val)}
            className={clsx(
              "flex-shrink-0 h-9 flex items-center justify-center transition-all relative group",
              "w-[10%]", // Each item takes 10% width
              isActive ? activeClass : "text-slate-500 hover:bg-slate-800 hover:text-slate-200"
            )}
            title={`Rate ${val}/10`}
          >
            {Content}
            {/* Divider lines provided by space-x or borders? Using simple borders might mess up width. */}
            {i < 9 && <div className="absolute right-0 top-2 bottom-2 w-px bg-slate-800/50" />}
          </button>
        );
      })}
    </div>
  )
}

function TripRanking({ shows, days, interactions }: any) {
  const [selectedDay, setSelectedDay] = useState('all');

  const scores = useMemo(() => {
    const map = new Map<string, number>(); // show_id -> total score

    interactions.forEach((i: any) => {
      // Simple sum of ratings
      const val = i.interaction_type || 0;
      map.set(i.show_id, (map.get(i.show_id) || 0) + val);
    });

    // Filter by day if needed, then sort
    let relevantShows = shows;
    if (selectedDay !== 'all') {
      relevantShows = shows.filter((s: Show) => {
        if (s.date_tbd || !s.start_time) return false;
        const d = new Date(s.start_time);
        if (s.is_late_night) d.setDate(d.getDate() - 1);
        return d.toISOString().split('T')[0] === selectedDay;
      });
    }

    // Map shows to [Show, Score, Details]
    const ranked = relevantShows.map((s: Show) => {
      const showInteractions = interactions.filter((i: any) => i.show_id === s.id && i.interaction_type > 0);
      return {
        show: s,
        score: map.get(s.id) || 0,
        details: showInteractions.map((i: any) => ({
          user: i.user_email ? i.user_email.split('@')[0] : 'Unknown',
          val: i.interaction_type
        })).sort((a: any, b: any) => b.val - a.val)
      };
    }).sort((a: any, b: any) => b.score - a.score); // Descending score

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
            <div className={clsx("w-8 h-8 flex items-center justify-center font-bold rounded-full flex-shrink-0",
              index === 0 ? "bg-yellow-500 text-black" :
                index === 1 ? "bg-slate-400 text-black" :
                  index === 2 ? "bg-orange-700 text-white" : "bg-slate-800 text-slate-500"
            )}>
              {index + 1}
            </div>

            <div className="flex-1">
              <h4 className="font-bold text-white text-lg">{item.show.bands.name}</h4>
              <div className="text-xs text-slate-500">
                {item.show.date_tbd ? 'Date TBD' : (item.show.start_time ? new Date(item.show.start_time).toLocaleTimeString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' }) : 'Time TBD')} • {item.show.stage?.name || 'Stage TBD'}
              </div>
            </div>

            <div className="text-right">
              <div className="text-2xl font-black text-white">{item.score > 0 ? item.score : 0}</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Points</div>

              <div className="flex flex-col items-end gap-1">
                {item.details.map((d: any, i: number) => (
                  <div key={i} className="text-xs text-slate-400 flex items-center gap-1">
                    <span className="text-slate-500">{d.user}</span>
                    <span className={clsx("font-bold",
                      d.val === 10 ? "text-pink-400" :
                        d.val >= 6 ? "text-green-400" :
                          d.val === 1 ? "text-orange-400" : "text-blue-400"
                    )}>
                      {d.val}
                    </span>
                  </div>
                ))}
              </div>
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

function EditTripModal({ isOpen, onClose, trip, onUpdate }: { isOpen: boolean, onClose: () => void, trip: Trip, onUpdate: (data: Partial<Trip>) => void }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_ranking_hidden: false
  });

  useEffect(() => {
    if (trip) {
      setFormData({
        name: trip.name,
        description: trip.description || '',
        is_ranking_hidden: trip.is_ranking_hidden || false
      });
    }
  }, [trip, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate({
      name: formData.name,
      description: formData.description,
      is_ranking_hidden: formData.is_ranking_hidden
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={onClose} />
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none p-4">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl p-6 pointer-events-auto">
              <h2 className="text-xl font-bold text-white mb-4">Edit Trip</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Trip Name</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-800 border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Description</label>
                  <textarea
                    rows={3}
                    className="w-full bg-slate-800 border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="flex items-center gap-3 py-2">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={formData.is_ranking_hidden}
                    onClick={() => setFormData({ ...formData, is_ranking_hidden: !formData.is_ranking_hidden })}
                    className={clsx(
                      "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                      formData.is_ranking_hidden ? 'bg-blue-600' : 'bg-slate-700'
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={clsx(
                        "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                        formData.is_ranking_hidden ? 'translate-x-5' : 'translate-x-0'
                      )}
                    />
                  </button>
                  <span className="text-sm text-slate-300">Hide Group Ranking from Members</span>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg">Save Changes</button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
