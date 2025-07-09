// Using native fetch API

// Use the updated API key provided by user
const ELEVENLABS_API_KEY = "sk_eed7fae04e10c876198825eda1e25b2184c35267aee495cc";
const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';

export interface ElevenLabsVoiceSettings {
  stability: number;
  similarity_boost: number;
  style?: number;
  use_speaker_boost?: boolean;
}

export interface ElevenLabsResponse {
  audioBuffer: Buffer;
  error?: string;
}

// Character voice mapping with your provided Voice ID
const CHARACTER_VOICE_MAPPING: Record<string, string> = {
  'priya': 'oHNJagRZ2LQEfZb2CEkb',
  'ananya': 'oHNJagRZ2LQEfZb2CEkb', 
  'kavya': 'oHNJagRZ2LQEfZb2CEkb',
  'riya': 'oHNJagRZ2LQEfZb2CEkb',
  'mannkibaat': 'oHNJagRZ2LQEfZb2CEkb',
  'default': 'oHNJagRZ2LQEfZb2CEkb'
};

export async function generateVoiceWithElevenLabs(
  text: string,
  characterName: string = 'default'
): Promise<ElevenLabsResponse> {
  try {
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ElevenLabs API key not configured');
    }

    const voiceId = CHARACTER_VOICE_MAPPING[characterName.toLowerCase()] || CHARACTER_VOICE_MAPPING.default;
    
    const voiceSettings: ElevenLabsVoiceSettings = {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0.0,
      use_speaker_boost: true
    };

    const response = await fetch(`${ELEVENLABS_BASE_URL}/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_multilingual_v2', // Supports Hindi and English
        voice_settings: voiceSettings
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', response.status, errorText);
      throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    
    console.log('ElevenLabs voice generated successfully:', {
      character: characterName,
      voiceId: voiceId,
      textLength: text.length,
      audioSize: audioBuffer.length
    });

    return { audioBuffer };
  } catch (error) {
    console.error('ElevenLabs voice generation error:', error);
    return { 
      audioBuffer: Buffer.alloc(0), 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

export async function getAvailableVoices(): Promise<any[]> {
  try {
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ElevenLabs API key not configured');
    }

    const response = await fetch(`${ELEVENLABS_BASE_URL}/voices`, {
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch voices: ${response.status}`);
    }

    const data = await response.json();
    return data.voices || [];
  } catch (error) {
    console.error('Error fetching ElevenLabs voices:', error);
    return [];
  }
}