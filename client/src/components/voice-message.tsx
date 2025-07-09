import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceMessageProps {
  audioData: string; // Base64 encoded audio
  className?: string;
  autoPlay?: boolean;
}

export function VoiceMessage({ audioData, className, autoPlay = false }: VoiceMessageProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioData && audioRef.current) {
      let audioUrl: string;
      
      console.log('VoiceMessage - Processing audio data:', audioData.substring(0, 50) + '...');
      
      try {
        // Check if audioData is already a data URL or just base64
        if (audioData.startsWith('data:')) {
          // It's already a data URL, use it directly
          audioUrl = audioData;
          console.log('VoiceMessage - Using existing data URL');
        } else {
          // For user recordings, create a proper data URL
          audioUrl = `data:audio/webm;base64,${audioData}`;
          console.log('VoiceMessage - Created data URL from base64');
        }
        
        audioRef.current.src = audioUrl;
        console.log('VoiceMessage - Audio source set successfully');
        
        // Add error handling for audio loading
        audioRef.current.onerror = (e) => {
          console.error('VoiceMessage - Audio loading error:', e);
        };
        
        audioRef.current.onloadeddata = () => {
          console.log('VoiceMessage - Audio loaded successfully');
        };
        
      } catch (error) {
        console.error('VoiceMessage - Error setting up audio:', error);
      }
      
      // Auto play if requested
      if (autoPlay) {
        setTimeout(() => {
          playAudio();
        }, 500);
      }
      
      return () => {
        URL.revokeObjectURL(audioUrl);
      };
    }
  }, [audioData, autoPlay]);

  const playAudio = async () => {
    if (audioRef.current) {
      try {
        console.log('VoiceMessage - Attempting to play audio');
        await audioRef.current.play();
        setIsPlaying(true);
        console.log('VoiceMessage - Audio playing successfully');
      } catch (error) {
        console.error('VoiceMessage - Play error:', error);
        // Try to reload the audio and play again
        try {
          audioRef.current.load();
          await audioRef.current.play();
          setIsPlaying(true);
        } catch (retryError) {
          console.error('VoiceMessage - Retry play failed:', retryError);
        }
      }
    }
  };

  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={cn("flex items-center gap-3 p-3 bg-gradient-to-r from-pink-100 to-purple-100 rounded-lg border border-pink-200", className)}>
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />
      
      <Button
        onClick={isPlaying ? pauseAudio : playAudio}
        size="sm"
        className="bg-pink-500 hover:bg-pink-600 text-white rounded-full w-10 h-10 p-0"
      >
        {isPlaying ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4 ml-0.5" />
        )}
      </Button>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Volume2 className="w-4 h-4 text-pink-600" />
          <span className="text-sm font-medium text-pink-800">Voice Message</span>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-white rounded-full h-2 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-pink-400 to-purple-400 transition-all duration-300 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <span className="text-xs text-gray-600 font-mono min-w-[40px]">
            {formatTime(currentTime)}/{formatTime(duration)}
          </span>
        </div>
      </div>
      
      {/* Animated sound waves when playing */}
      {isPlaying && (
        <div className="flex items-center gap-0.5">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="w-1 bg-pink-500 rounded-full animate-pulse"
              style={{
                height: `${12 + Math.random() * 8}px`,
                animationDelay: `${i * 0.1}s`,
                animationDuration: '0.6s'
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}