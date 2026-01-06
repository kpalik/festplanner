
import { ExternalLink, Music } from 'lucide-react';

export interface Band {
    id: string;
    name: string;
    bio: string | null;
    origin_country: string | null;
    image_url: string | null;
    website_url: string | null;
    spotify_url: string | null;
    apple_music_url: string | null;
}

interface BandProfileProps {
    band: Band;
}

export function BandProfile({ band }: BandProfileProps) {
    return (
        <div className="space-y-8">
            {/* Bio */}
            <div>
                <h3 className="text-lg font-semibold text-white mb-3">About</h3>
                <p className="text-slate-400 leading-relaxed whitespace-pre-wrap">
                    {band.bio || "No biography available for this artist."}
                </p>
            </div>

            {/* Links */}
            <div>
                <h3 className="text-lg font-semibold text-white mb-3">Links & Socials</h3>
                <div className="flex flex-wrap gap-4">
                    {band.website_url && (
                        <a href={band.website_url} target="_blank" rel="noreferrer"
                            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition">
                            <ExternalLink className="w-4 h-4" />
                            Website
                        </a>
                    )}
                    {band.spotify_url && (
                        <a href={band.spotify_url} target="_blank" rel="noreferrer"
                            className="flex items-center gap-2 px-4 py-2 bg-[#1DB954]/10 hover:bg-[#1DB954]/20 border border-[#1DB954]/20 rounded-lg text-[#1DB954] transition">
                            <Music className="w-4 h-4" />
                            Spotify
                        </a>
                    )}
                    {band.apple_music_url && (
                        <a href={band.apple_music_url} target="_blank" rel="noreferrer"
                            className="flex items-center gap-2 px-4 py-2 bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/20 rounded-lg text-pink-400 transition">
                            <Music className="w-4 h-4" />
                            Apple Music
                        </a>
                    )}

                    {!band.website_url && !band.spotify_url && !band.apple_music_url && (
                        <span className="text-slate-500 italic">No links provided.</span>
                    )}
                </div>
            </div>
        </div>
    );
}
