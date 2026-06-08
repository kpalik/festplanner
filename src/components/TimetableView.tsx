import { useMemo, useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { ChevronsLeft, ChevronsRight, Maximize2, Minimize2, Pencil, AlertTriangle } from 'lucide-react';

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
  canEdit?: boolean;
  onEditShow?: (show: Show) => void;
  memberCount?: number;
}

// Pixels per minute for the time axis
const PX_PER_MINUTE = 3;
const STAGE_ROW_HEIGHT = 56;

// Extract YYYY-MM-DD in LOCAL timezone (avoids UTC midnight shift bugs)
function toLocalDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function TimetableView({ shows, days, interactions, canEdit = false, onEditShow, memberCount }: TimetableViewProps) {
  const { t, i18n } = useTranslation();
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [collapsedStages, setCollapsedStages] = useState<Set<string>>(new Set());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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
      setSelectedDay(toLocalDateStr(days[0]));
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

  // Calculate average score per show
  const avgByShow = useMemo(() => {
    const totals = new Map<string, { sum: number; count: number }>();
    interactions.forEach((i) => {
      const val = i.interaction_type || 0;
      if (val > 0) {
        const cur = totals.get(i.show_id) || { sum: 0, count: 0 };
        totals.set(i.show_id, { sum: cur.sum + val, count: cur.count + 1 });
      }
    });
    const avg = new Map<string, number>();
    totals.forEach(({ sum, count }, id) => avg.set(id, sum / count));
    return avg;
  }, [interactions]);

  // Count how many members voted per show
  const voterCountByShow = useMemo(() => {
    const map = new Map<string, number>();
    interactions.forEach((i) => {
      if ((i.interaction_type || 0) > 0) {
        map.set(i.show_id, (map.get(i.show_id) || 0) + 1);
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
      return toLocalDateStr(d) === selectedDay;
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
    return Array.from(stageMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [dayShows]);

  const allCollapsed = stages.length > 0 && stages.every(s => collapsedStages.has(s.id));

  const toggleAllStages = () => {
    if (allCollapsed) {
      setCollapsedStages(new Set());
    } else {
      setCollapsedStages(new Set(stages.map(s => s.id)));
    }
  };

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

    // Round up to nearest hour for end — use absolute minutes from start of timeline
    // to handle late night shows that cross midnight (e.g. 01:30 = 25:30 relative to 16:00 start)
    const diffMs = endDate.getTime() - new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), startHour, 0, 0, 0).getTime();
    const diffMinutes = Math.ceil(diffMs / 60000);
    const endMinute = startMinute + Math.ceil(diffMinutes / 60) * 60;

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

    // If show crosses midnight or end is before start on the clock,
    // add 24h to bring it into the continuation of the timeline
    if (end.getDate() !== start.getDate() || endMin < startMin) {
      endMin += 24 * 60;
    }

    // If the show starts before the timeline origin (e.g. late night at 01:30
    // but the day starts at 16:00), wrap the start forward by 24h so it lands
    // on the right side of midnight on the virtual timeline.
    if (startMin < timeRange.startMinute) {
      startMin += 24 * 60;
      endMin += 24 * 60;
    }

    const left = (startMin - timeRange.startMinute) * PX_PER_MINUTE;
    const width = (endMin - startMin) * PX_PER_MINUTE;

    return { left, width };
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  if (days.length === 0) {
    return <div className="text-slate-400 text-center py-10">{t('trip_details.timetable.no_data')}</div>;
  }

  return (
    <>
      <div className="space-y-4">
      {/* Day selector */}
      <div className="flex flex-wrap gap-2">
        {days.map((d) => {
          const val = toLocalDateStr(d);
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
            <div
              className="flex-shrink-0 border-r border-slate-700 bg-slate-900 z-10 transition-all duration-200"
              style={{ width: allCollapsed ? 44 : 164 }}
            >
              {/* Header with single collapse toggle */}
              <div className="h-10 border-b border-slate-700 flex items-center justify-between px-2">
                {!allCollapsed && (
                  <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                    {t('trip_details.timetable.stages')}
                  </span>
                )}
                <button
                  onClick={toggleAllStages}
                  className="flex-shrink-0 p-0.5 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors ml-auto"
                  title={allCollapsed ? 'Rozwiń sceny' : 'Zwiń sceny'}
                >
                  {allCollapsed
                    ? <ChevronsRight className="w-3.5 h-3.5" />
                    : <ChevronsLeft className="w-3.5 h-3.5" />
                  }
                </button>
              </div>
              {/* Stage names */}
              {stages.map((stage) => (
                <div
                  key={stage.id}
                  className="border-b border-slate-800 flex items-center px-2"
                  style={{ height: STAGE_ROW_HEIGHT }}
                >
                  {allCollapsed ? (
                    <span className="text-xs text-slate-500 font-mono font-bold tracking-widest select-none w-full text-center">
                      {stage.name.slice(0, 3).toUpperCase()}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-300 font-medium truncate" title={stage.name}>
                      {stage.name}
                    </span>
                  )}
                </div>
              ))}
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
                              {score !== undefined && score > 0 && (() => {
                                const avg = avgByShow.get(show.id);
                                const colorClass = avg !== undefined
                                  ? avg >= 7 ? "bg-green-500/30 text-green-300"
                                  : avg < 5  ? "bg-red-500/30 text-red-300"
                                  : "bg-blue-500/30 text-blue-300"
                                  : "bg-blue-500/30 text-blue-300";
                                return (
                                  <span className={`flex-shrink-0 text-[10px] font-bold px-1 py-0.5 rounded ${colorClass}`}>
                                    {score}
                                  </span>
                                );
                              })()}
                              {memberCount !== undefined && memberCount > 0 && (voterCountByShow.get(show.id) ?? 0) < memberCount && (
                                <span
                                  className="flex-shrink-0 text-yellow-400"
                                  title={`Zagłosowało ${voterCountByShow.get(show.id) ?? 0} z ${memberCount} uczestników`}
                                >
                                  <AlertTriangle className="w-3 h-3" />
                                </span>
                              )}
                            </div>
                            {/* Time label on hover / always if space */}
                            {width > 100 && (
                              <span className="absolute bottom-0.5 left-2 text-[9px] text-slate-400 font-mono">
                                {formatTime(show.start_time!)}–{formatTime(show.end_time!)}
                              </span>
                            )}
                            {/* Edit button for admins/owners */}
                            {canEdit && onEditShow && (
                              <button
                                onClick={(e) => { e.stopPropagation(); onEditShow(show); }}
                                className="absolute top-0.5 right-0.5 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/70 hover:bg-slate-900 text-slate-300 hover:text-white"
                                title="Edytuj występ"
                              >
                                <Pencil className="w-2.5 h-2.5" />
                              </button>
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

    {/* Floating fullscreen toggle — mobile only, bottom-right */}
    <button
      onClick={toggleFullscreen}
      className="md:hidden fixed bottom-20 right-4 z-[60] p-2.5 rounded-full bg-slate-800 border border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700 shadow-lg transition-all"
      title={isFullscreen ? 'Wyjdź z trybu pełnoekranowego' : 'Tryb pełnoekranowy'}
    >
      {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
    </button>
    </>
  );
}
