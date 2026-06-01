import { useMemo, useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { ChevronsLeft, ChevronsRight, Maximize2, Minimize2 } from 'lucide-react';

interface Show {
  id: string;
  start_time: string | null;
  end_time: string | null;
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
  date_tbd?: boolean;
  time_tbd?: boolean;
  type?: 'normal' | 'headliner';
}

interface Interaction {
  show_id: string;
  user_id: string;
  interaction_type: number;
}

interface TimetableViewProps {
  shows: Show[];
  days: Date[];
  interactions: Interaction[];
}

// Pixels per minute for the time axis
const PX_PER_MINUTE = 3;
const STAGE_ROW_HEIGHT = 56;

export function TimetableView({ shows, days, interactions }: TimetableViewProps) {
  const { t, i18n } = useTranslation();
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [collapsedStages, setCollapsedStages] = useState<Set<string>>(new Set());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const toggleStage = (stageId: string) => {
    setCollapsedStages(prev => {
      const next = new Set(prev);
      if (next.has(stageId)) next.delete(stageId);
      else next.add(stageId);
      return next;
    });
  };

  const toggleFullscreen = () => {
    setIsFullscreen(prev => {
      const next = !prev;
      document.body.classList.toggle('timetable-fullscreen', next);
      return next;
    });
  };

  // Clean up class on unmount
  useEffect(() => {
    return () => { document.body.classList.remove('timetable-fullscreen'); };
  }, []);

  // Auto-select first day
  useEffect(() => {
    if (days.length > 0 && !selectedDay) {
      setSelectedDay(days[0].toISOString().split('T')[0]);
    }
  }, [days, selectedDay]);

  // Calculate scores per show
  const scoreByShow = useMemo(() => {
    const map = new Map<string, number>();
    interactions.forEach((i) => {
      const val = i.interaction_type || 0;
      if (val > 0) {
        map.set(i.show_id, (map.get(i.show_id) || 0) + val);
      }
    });
    return map;
  }, [interactions]);

  // Filter shows for selected day that have valid times
  const dayShows = useMemo(() => {
    if (!selectedDay) return [];
    return shows.filter((s) => {
      if (s.date_tbd || s.time_tbd || !s.start_time || !s.end_time) return false;
      const d = new Date(s.start_time);
      if (s.is_late_night) d.setDate(d.getDate() - 1);
      return d.toISOString().split('T')[0] === selectedDay;
    });
  }, [shows, selectedDay]);

  // Get unique stages for this day, ordered by first show time
  const stages = useMemo(() => {
    const stageMap = new Map<string, { id: string; name: string; firstTime: number }>();
    dayShows.forEach((s) => {
      if (!stageMap.has(s.stage_id)) {
        stageMap.set(s.stage_id, {
          id: s.stage_id,
          name: s.stage?.name || 'Unknown Stage',
          firstTime: new Date(s.start_time!).getTime(),
        });
      } else {
        const existing = stageMap.get(s.stage_id)!;
        const t = new Date(s.start_time!).getTime();
        if (t < existing.firstTime) existing.firstTime = t;
      }
    });
    return Array.from(stageMap.values()).sort((a, b) => a.firstTime - b.firstTime);
  }, [dayShows]);

  // Calculate time range for the day
  const timeRange = useMemo(() => {
    if (dayShows.length === 0) return { startMinute: 0, endMinute: 0, startHour: 0, endHour: 24 };

    let minTime = Infinity;
    let maxTime = -Infinity;

    dayShows.forEach((s) => {
      const start = new Date(s.start_time!).getTime();
      const end = new Date(s.end_time!).getTime();
      if (start < minTime) minTime = start;
      if (end > maxTime) maxTime = end;
    });

    const startDate = new Date(minTime);
    const endDate = new Date(maxTime);

    // Round down to nearest hour for start
    const startHour = startDate.getHours();
    const startMinute = startHour * 60;

    // Round up to nearest hour for end
    const endHour = endDate.getMinutes() > 0 ? endDate.getHours() + 1 : endDate.getHours();
    // Handle next-day overflow for late night shows
    const endMinute = endDate.getDate() !== startDate.getDate()
      ? 24 * 60 + endHour * 60
      : endHour * 60;

    return { startMinute, endMinute, startHour, endHour: endMinute / 60 };
  }, [dayShows]);

  const totalWidth = (timeRange.endMinute - timeRange.startMinute) * PX_PER_MINUTE;

  // Generate hour markers
  const hourMarkers = useMemo(() => {
    const markers: { hour: number; label: string; x: number }[] = [];
    const startH = Math.floor(timeRange.startMinute / 60);
    const endH = Math.ceil(timeRange.endMinute / 60);

    for (let h = startH; h <= endH; h++) {
      const displayHour = h >= 24 ? h - 24 : h;
      markers.push({
        hour: h,
        label: `${displayHour.toString().padStart(2, '0')}:00`,
        x: (h * 60 - timeRange.startMinute) * PX_PER_MINUTE,
      });
    }
    return markers;
  }, [timeRange]);

  // Generate half-hour markers
  const halfHourMarkers = useMemo(() => {
    const markers: { x: number }[] = [];
    const startH = Math.floor(timeRange.startMinute / 60);
    const endH = Math.ceil(timeRange.endMinute / 60);

    for (let h = startH; h < endH; h++) {
      markers.push({
        x: (h * 60 + 30 - timeRange.startMinute) * PX_PER_MINUTE,
      });
    }
    return markers;
  }, [timeRange]);

  // Position a show block
  const getShowPosition = (show: Show) => {
    const start = new Date(show.start_time!);
    const end = new Date(show.end_time!);

    let startMin = start.getHours() * 60 + start.getMinutes();
    let endMin = end.getHours() * 60 + end.getMinutes();

    // Handle next-day overflow
    if (end.getDate() !== start.getDate() || endMin < startMin) {
      endMin += 24 * 60;
    }

    const left = (startMin - timeRange.startMinute) * PX_PER_MINUTE;
    const width = (endMin - startMin) * PX_PER_MINUTE;

    return { left, width };
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' });
  };

  if (days.length === 0) {
    return <div className="text-slate-400 text-center py-10">{t('trip_details.timetable.no_data')}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Day selector */}
      <div className="flex flex-wrap gap-2">
        {days.map((d) => {
          const val = d.toISOString().split('T')[0];
          return (
            <button
              key={val}
              onClick={() => setSelectedDay(val)}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-sm transition",
                selectedDay === val
                  ? "bg-purple-600 text-white"
                  : "bg-slate-900 border border-slate-800 text-slate-400 hover:border-slate-600"
              )}
            >
              {d.toLocaleDateString(i18n.language, { weekday: 'short', day: 'numeric', month: 'short' })}
            </button>
          );
        })}
      </div>

      {dayShows.length === 0 ? (
        <div className="text-slate-400 text-center py-10">{t('trip_details.timetable.no_shows_day')}</div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          {/* Scrollable timetable */}
          <div className="flex">
            {/* Fixed stage labels column */}
            <div className="flex-shrink-0 border-r border-slate-700 bg-slate-900 z-10">
              {/* Header spacer */}
              <div className="h-10 border-b border-slate-700 flex items-center px-3">
                <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                  {t('trip_details.timetable.stages')}
                </span>
              </div>
              {/* Stage names */}
              {stages.map((stage) => {
                const collapsed = collapsedStages.has(stage.id);
                return (
                  <div
                    key={stage.id}
                    className="border-b border-slate-800 flex items-center gap-1 px-2 transition-all duration-200"
                    style={{ height: STAGE_ROW_HEIGHT, width: collapsed ? 52 : 164 }}
                  >
                    <button
                      onClick={() => toggleStage(stage.id)}
                      className="flex-shrink-0 p-0.5 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
                      title={collapsed ? stage.name : 'Zwiń scenę'}
                    >
                      {collapsed
                        ? <ChevronsRight className="w-3.5 h-3.5" />
                        : <ChevronsLeft className="w-3.5 h-3.5" />
                      }
                    </button>
                    {collapsed ? (
                      <span className="text-xs text-slate-500 font-mono font-bold tracking-widest select-none">
                        {stage.name.slice(0, 3).toUpperCase()}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-300 font-medium truncate" title={stage.name}>
                        {stage.name}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Scrollable time grid */}
            <div className="overflow-x-auto flex-1" ref={scrollRef}>
              <div style={{ width: totalWidth, minWidth: '100%' }}>
                {/* Time header */}
                <div className="h-10 border-b border-slate-700 relative">
                  {hourMarkers.map((m) => (
                    <div
                      key={m.hour}
                      className="absolute top-0 bottom-0 flex items-center"
                      style={{ left: m.x }}
                    >
                      <span className="text-[10px] text-slate-500 font-mono pl-1">{m.label}</span>
                      <div className="absolute top-8 bottom-0 w-px bg-slate-700" />
                    </div>
                  ))}
                </div>

                {/* Stage rows */}
                {stages.map((stage) => {
                  const stageShows = dayShows.filter((s) => s.stage_id === stage.id);
                  return (
                    <div
                      key={stage.id}
                      className="relative border-b border-slate-800"
                      style={{ height: STAGE_ROW_HEIGHT }}
                    >
                      {/* Grid lines */}
                      {hourMarkers.map((m) => (
                        <div
                          key={m.hour}
                          className="absolute top-0 bottom-0 w-px bg-slate-800/60"
                          style={{ left: m.x }}
                        />
                      ))}
                      {halfHourMarkers.map((m, i) => (
                        <div
                          key={i}
                          className="absolute top-0 bottom-0 w-px bg-slate-800/30"
                          style={{ left: m.x }}
                        />
                      ))}

                      {/* Show blocks */}
                      {stageShows.map((show) => {
                        const { left, width } = getShowPosition(show);
                        const score = scoreByShow.get(show.id);
                        const isHeadliner = show.type === 'headliner';

                        return (
                          <div
                            key={show.id}
                            className={clsx(
                              "absolute top-1 bottom-1 rounded-md border flex items-center px-2 overflow-hidden cursor-default transition-colors group",
                              isHeadliner
                                ? "bg-yellow-500/20 border-yellow-500/50 hover:bg-yellow-500/30"
                                : "bg-slate-700/60 border-slate-600/60 hover:bg-slate-700/80"
                            )}
                            style={{ left, width: Math.max(width, 40) }}
                            title={`${show.bands.name} (${formatTime(show.start_time!)} – ${formatTime(show.end_time!)})`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0 w-full">
                              <span
                                className={clsx(
                                  "text-xs font-bold truncate",
                                  isHeadliner ? "text-yellow-300" : "text-white"
                                )}
                              >
                                {show.bands.name}
                              </span>
                              {score !== undefined && score > 0 && (
                                <span className="flex-shrink-0 text-[10px] font-bold bg-blue-500/30 text-blue-300 px-1 py-0.5 rounded">
                                  {score}
                                </span>
                              )}
                            </div>
                            {/* Time label on hover / always if space */}
                            {width > 100 && (
                              <span className="absolute bottom-0.5 left-2 text-[9px] text-slate-400 font-mono">
                                {formatTime(show.start_time!)}–{formatTime(show.end_time!)}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>

    {/* Floating fullscreen toggle — always visible in bottom-left */}
    <button
      onClick={toggleFullscreen}
      className="fixed bottom-20 left-4 md:bottom-6 z-[60] p-2.5 rounded-full bg-slate-800 border border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700 shadow-lg transition-all"
      title={isFullscreen ? 'Wyjdź z trybu pełnoekranowego' : 'Tryb pełnoekranowy'}
    >
      {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
    </button>
  );
}
