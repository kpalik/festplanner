import { useState, type ReactNode } from 'react';
import { Music, Globe, FileText } from 'lucide-react';
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
    className?: string;
    imageHeight?: string;
}

export function BandCard({
    band,
    title,
    subtitle,
    footer,
    topRightActions,
    onCardClick,
    className,
    imageHeight = "h-64"
}: BandCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className={clsx("bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg group transition-all", isExpanded ? "border-purple-500/50" : "hover:border-purple-500/30", className)}>
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

                {/* Top Right Actions */}
                <div className="absolute top-2 right-2 z-20 flex gap-2" onClick={e => e.stopPropagation()}>
                    {topRightActions}

                    {/* Expand Toggle */}
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className={clsx(
                            "p-1.5 backdrop-blur rounded-full text-white transition-all border border-white/10",
                            isExpanded ? "bg-purple-600/80 hover:bg-purple-600 border-purple-500" : "bg-black/40 hover:bg-black/60"
                        )}
                        title={isExpanded ? "Hide Details" : "Show Details"}
                    >
                        <FileText className="w-4 h-4" />
                    </button>
                </div>

                {/* Content Overlay */}
                <div className="absolute inset-x-0 bottom-0 z-10 p-4 flex flex-col justify-end">
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

            {/* Footer (Always visible if present) */}
            {footer && (
                <div className="bg-slate-900/80 border-t border-slate-800/50 backdrop-blur-sm">
                    {footer}
                </div>
            )}

            {/* Expanded Content */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-slate-800 bg-slate-950"
                    >
                        <div className="p-6">
                            <BandProfile band={band} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
