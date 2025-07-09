import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Play, Pause, Square, Send, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceRecorderProps {
  onRecordingComplete: (audioData: string) => void;
  onTranscriptionReceived?: (transcription: string) => void;
  disabled?: boolean;
  className?: string;
}

export function VoiceRecorder({ 
  onRecordingComplete, 
  onTranscriptionReceived,
  disabled = false,
  className 
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioData, setAudioData] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcription, setTranscription] = useState<string>('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        } 
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          const audioData = base64Audio.split(',')[1]; // Remove data:audio/webm;base64, prefix
          setAudioData(audioData);
          onRecordingComplete(audioData);
          
          // Create audio URL for playback
          const audioUrl = URL.createObjectURL(audioBlob);
          if (audioRef.current) {
            audioRef.current.src = audioUrl;
          }
        };
        
        reader.readAsDataURL(audioBlob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const playRecording = () => {
    if (audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
      
      audioRef.current.onended = () => {
        setIsPlaying(false);
      };
    }
  };

  const pauseRecording = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const clearRecording = () => {
    setAudioData(null);
    setTranscription('');
    setRecordingTime(0);
    if (audioRef.current) {
      audioRef.current.src = '';
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <audio ref={audioRef} className="hidden" />
      
      {/* Simple Record/Send Button */}
      {!isRecording && !audioData && (
        <Button
          onClick={startRecording}
          disabled={disabled}
          className="bg-pink-500 hover:bg-pink-600 text-white rounded-full w-12 h-12 p-0"
        >
          <Mic className="w-5 h-5" />
        </Button>
      )}
      
      {isRecording && (
        <div className="flex items-center gap-3">
          <Button
            onClick={stopRecording}
            className="bg-red-500 hover:bg-red-600 text-white rounded-full w-12 h-12 p-0 animate-pulse"
          >
            <Square className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-white text-sm">{formatTime(recordingTime)}</span>
          </div>
        </div>
      )}
      
      {audioData && (
        <div className="flex items-center gap-3">
          <Button
            onClick={() => {
              onRecordingComplete(audioData);
              clearRecording();
            }}
            className="bg-green-500 hover:bg-green-600 text-white rounded-full w-12 h-12 p-0"
          >
            <Send className="w-5 h-5" />
          </Button>
          <Button
            onClick={clearRecording}
            variant="outline"
            className="rounded-full w-10 h-10 p-0 border-white/30 text-white hover:bg-white/10"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          <span className="text-white text-sm">Ready to send</span>
        </div>
      )}
    </div>
  );
}