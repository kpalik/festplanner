import clsx from 'clsx';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

interface SpotifyEmbedProps {
    spotifyUrl: string;
    className?: string;
    height?: number | string;

}

export function SpotifyEmbed({ spotifyUrl, className, height = 152 }: SpotifyEmbedProps) {
    const [isLoading, setIsLoading] = useState(true);

    // Extract Artist ID
    // Supports:
    // https://open.spotify.com/artist/165ZgPlLkK7bf5bDoFc6Sb
    // spotify:artist:165ZgPlLkK7bf5bDoFc6Sb
    let artistId = '';
    if (spotifyUrl.includes('open.spotify.com/artist/')) {
        const parts = spotifyUrl.split('open.spotify.com/artist/');
        artistId = parts[1].split('?')[0].split('/')[0];
    } else if (spotifyUrl.includes('spotify:artist:')) {
        artistId = spotifyUrl.split(':')[2];
    }

    if (!artistId) {
        return null;
    }

    const src = `https://open.spotify.com/embed/artist/${artistId}?utm_source=generator&theme=0`;

    return (
        <div className={clsx("relative bg-slate-900 rounded-xl overflow-hidden", className)} style={{ height }}>
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                    <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
                </div>
            )}
            <iframe
                title="Spotify Embed"
                style={{ borderRadius: '12px' }}
                src={src}
                width="100%"
                height={height}
                frameBorder="0"
                allowFullScreen
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                onLoad={() => setIsLoading(false)}
                className={clsx("relative z-10", isLoading ? "opacity-0" : "opacity-100", "transition-opacity duration-500")}
            />
        </div>
    );
}
