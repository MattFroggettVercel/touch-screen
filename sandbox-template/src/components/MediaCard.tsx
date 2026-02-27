import { Play, Pause, SkipBack, SkipForward, Music, Volume2 } from "lucide-react";
import { useEntity } from "../lib/ha-provider";
import type { MediaPlayerAttributes } from "../lib/ha-types";

interface MediaCardProps {
  entityId: string;
}

export default function MediaCard({ entityId }: MediaCardProps) {
  const { entity, callService } = useEntity(entityId);
  if (!entity) return null;

  const attr = entity.attributes as MediaPlayerAttributes;
  const isPlaying = entity.state === "playing";
  const progress =
    attr.media_duration && attr.media_position
      ? Math.round((attr.media_position / attr.media_duration) * 100)
      : 0;

  const handlePlayPause = () => {
    callService("media_player", "media_play_pause", { entity_id: entityId });
  };

  const handleNext = () => {
    callService("media_player", "media_next_track", { entity_id: entityId });
  };

  const handlePrev = () => {
    callService("media_player", "media_previous_track", {
      entity_id: entityId,
    });
  };

  const handleVolume = (value: number) => {
    callService("media_player", "volume_set", {
      entity_id: entityId,
      volume_level: value / 100,
    });
  };

  return (
    <div className="bg-surface rounded-card p-card-px flex flex-col gap-4 shadow-lg shadow-black/20">
      {/* Album art + track info */}
      <div className="flex items-center gap-4">
        <div className="w-[72px] h-[72px] rounded-btn bg-surface-lighter flex items-center justify-center shrink-0 overflow-hidden">
          {attr.entity_picture ? (
            <img
              src={attr.entity_picture}
              alt="Album art"
              className="w-full h-full object-cover"
            />
          ) : (
            <Music className="w-8 h-8 text-accent/60" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-device-sm font-medium truncate">
            {attr.media_title ?? "Nothing playing"}
          </p>
          <p className="text-device-xs text-white/40 truncate">
            {attr.media_artist ?? attr.friendly_name}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full bg-accent/70 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={handlePrev}
          className="w-[56px] h-[56px] rounded-full active:bg-white/10 transition-colors text-white/50 active:text-white flex items-center justify-center"
          aria-label="Previous track"
        >
          <SkipBack className="w-7 h-7" />
        </button>
        <button
          onClick={handlePlayPause}
          className="w-[72px] h-[72px] rounded-full bg-accent/20 active:bg-accent/30 transition-colors text-accent flex items-center justify-center"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause className="w-8 h-8" />
          ) : (
            <Play className="w-8 h-8" />
          )}
        </button>
        <button
          onClick={handleNext}
          className="w-[56px] h-[56px] rounded-full active:bg-white/10 transition-colors text-white/50 active:text-white flex items-center justify-center"
          aria-label="Next track"
        >
          <SkipForward className="w-7 h-7" />
        </button>
      </div>

      {/* Volume slider */}
      {attr.volume_level !== undefined && (
        <div className="flex items-center gap-3">
          <Volume2 className="w-6 h-6 text-white/30 shrink-0" />
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(attr.volume_level * 100)}
            onChange={(e) => handleVolume(Number(e.target.value))}
            className="w-full h-slider-track rounded-full appearance-none bg-white/10 accent-accent cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-[48px]
              [&::-webkit-slider-thumb]:h-[48px]
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-accent
              [&::-webkit-slider-thumb]:shadow-md
              [&::-webkit-slider-thumb]:cursor-pointer"
          />
        </div>
      )}
    </div>
  );
}
