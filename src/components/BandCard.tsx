import { useState, type ReactNode } from 'react';
import { Music, Globe, FileText, Play } from 'lucide-react';
import { BandProfile, type Band } from './BandProfile';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

interface BandCardProps {
    band: Band;
    title?: ReactNode;
    subtitle?: ReactNode;
    footer?: ReactNode;
    topRightActions?: ReactNode;
    onCardClick?: () => void;
    onPlayClick?: () => void;
    className?: string;
    imageHeight?: string;
    showCenterPlayButton?: boolean;
    isPlayerOpen?: boolean;
    playerContent?: ReactNode;
}

export function BandCard({
    band,
    title,
    subtitle,
    footer,
    topRightActions,
    onCardClick,
    onPlayClick,
    className,
    imageHeight = "h-64",
    showCenterPlayButton,
    isPlayerOpen,
    playerContent
}: BandCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    // Determines what to show in the expanded area
    // Player takes precedence over Profile details
    const showPlayer = isPlayerOpen && playerContent;
    const showDetails = isExpanded && !showPlayer;
    const isAnyExpanded = showPlayer || showDetails;

    return (
        <div className={clsx("bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg group transition-all", isAnyExpanded ? "border-purple-500/50" : "hover:border-purple-500/30", className)}>
            <div
                className={clsx("relative overflow-hidden cursor-pointer", imageHeight)}
                onClick={onCardClick}
            >
                {/* Image BG */}
                <div className="absolute inset-0 z-0">
                    {band.image_url ? (
                        <img
                            src={band.image_url}
                            alt={band.name}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                    ) : (
                        <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                            <Music className="w-12 h-12 text-slate-700" />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent" />
                </div>

                {/* Center Play Button Overlay */}
                {showCenterPlayButton && band.spotify_url && onPlayClick && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <button
                            onClick={(e) => { e.stopPropagation(); onPlayClick(); }}
                            className="w-16 h-16 bg-black/40 hover:bg-black/60 backdrop-blur rounded-full flex items-center justify-center text-white hover:text-green-400 border border-white/20 hover:border-green-400/50 hover:scale-110 transition-all duration-300 shadow-2xl group/play"
                            title="Play"
                        >
                            <Play className="w-8 h-8 fill-white group-hover/play:fill-green-400 ml-1" />
                        </button>
                    </div>
                )}

                {/* Top Right Actions */}
                <div className="absolute top-2 right-2 z-20 flex gap-2" onClick={e => e.stopPropagation()}>
                    {topRightActions}

                    {/* Small Play Button (only if NOT showing center button, to avoid redundancy, OR if specifically requested? Usually redundant if center button exists, but let's keep it if caller wants it via logic) */}
                    {!showCenterPlayButton && onPlayClick && band.spotify_url && (
                        <button
                            onClick={onPlayClick}
                            className="p-1.5 bg-black/40 hover:bg-black/60 backdrop-blur rounded-full text-[#1DB954] hover:text-[#1ed760] transition-colors border border-white/10"
                            title="Play on Spotify"
                        >
                            <Play className="w-4 h-4 fill-current" />
                        </button>
                    )}

                    {/* Expand Toggle */}
                    <button
                        onClick={() => {
                            if (isPlayerOpen && onPlayClick) {
                                // If player is open, clicking this should probably close player and open details?
                                // Or just toggle details?
                                // Let's simplisticly just toggle details state.
                                // If Player is forced open by prop, this button can't close it unless we have a callback to close player.
                                // But we rely on parent to handle isPlayerOpen.
                                // For now, this button controls local expansion.
                            }
                            setIsExpanded(!isExpanded);
                        }}
                        className={clsx(
                            "p-1.5 backdrop-blur rounded-full text-white transition-all border border-white/10",
                            (isExpanded && !showPlayer) ? "bg-purple-600/80 hover:bg-purple-600 border-purple-500" : "bg-black/40 hover:bg-black/60"
                        )}
                        title={isExpanded ? "Hide Details" : "Show Details"}
                    >
                        <FileText className="w-4 h-4" />
                    </button>
                </div>

                {/* Content Overlay */}
                <div className="absolute inset-x-0 bottom-0 z-10 p-4 flex flex-col justify-end pointer-events-none">
                    {/* Subtitle */}
                    <div className="text-slate-300 text-xs font-medium mb-1 drop-shadow-md">
                        {subtitle || (
                            <span className="flex items-center gap-1">
                                <Globe className="w-3 h-3" />
                                {band.origin_country || 'Unknown origin'}
                            </span>
                        )}
                    </div>

                    {/* Title */}
                    <div className="text-white font-bold text-xl drop-shadow-lg truncate">
                        {title || band.name}
                    </div>
                </div>
            </div>

            {/* Footer */}
            {footer && (
                <div className="bg-slate-900/80 border-t border-slate-800/50 backdrop-blur-sm relative z-20">
                    {footer}
                </div>
            )}

            {/* Expanded Content Area */}
            <AnimatePresence>
                {isAnyExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-slate-800 bg-slate-950 overflow-hidden"
                    >
                        {showPlayer ? (
                            <div className="p-4 bg-black/50">
                                {playerContent}
                            </div>
                        ) : (
                            <div className="p-6">
                                <BandProfile band={band} />
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
