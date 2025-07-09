import OpenAI from "openai";
import { Character, Message } from "../shared/schema.js";
import { generateVoiceWithElevenLabs } from "./elevenlabs.js";

// Helper function to detect language from text content
function detectLanguageFromText(text: string): string {
  const lowerText = text.toLowerCase();
  
  // Check for Chinese characters
  if (/[\u4e00-\u9fff]/.test(text)) {
    return "chinese";
  }
  // Check for Hindi/Devanagari characters  
  else if (/[\u0900-\u097F]/.test(text)) {
    return "hindi";
  }
  // Check for Hinglish patterns (mix of English and Hindi words)
  else if (
    /\b(aap|kaise|ho|hai|hain|kya|koi|main|mera|tera|uska|kuch|nahi|haan|theek|accha|bura|sab|log|ghar|paani|khana|kaam|time|phone|call|message|chat|love|like|dil|dost|family|school|college|office|shop|market|train|bus|car|bike|walk|run|eat|drink|sleep|wake|work|play|read|write|watch|listen|speak|say|tell|ask|answer|think|know|understand|remember|forget|happy|sad|angry|good|bad|big|small|new|old|hot|cold|beautiful|ugly|fast|slow|high|low|right|wrong|yes|no|ok|sorry|thanks|welcome|bye|hello|hi|namaste|kaise|kaha|kab|kyun|kitna|kaun|kiska)\b/i.test(lowerText) ||
    /\b(hai|hain|ho|hoon|hoga|hogi|tha|thi|the|kar|karna|kiya|kiye|mil|mila|mile|gaya|gayi|gaye|dekh|dekha|dekhi|dekhe|sun|suna|suni|sune|bol|bola|boli|bole|aa|aaya|aayi|aaye|ja|jaa|jaana|jao|chalo|ruk|ruko|bas|band|karo|mat|please|yaar|bhai|behen|mama|papa|dada|dadi|nana|nani|uncle|aunty|sir|madam)\b/i.test(lowerText)
  ) {
    // Check if it's pure Hindi or mixed Hinglish
    const englishWords = lowerText.match(/\b(the|and|or|but|with|for|you|me|my|your|his|her|this|that|what|when|where|why|how|can|will|would|should|could|have|has|had|do|does|did|get|got|make|made|take|took|give|gave|go|went|come|came|see|saw|know|knew|think|thought|want|like|love|need|help|work|time|good|bad|big|small|new|old|right|wrong|yes|no|ok|okay|nice|great|awesome|cool|hello|hi|bye|thanks|thank|sorry|please|welcome)\b/g);
    const hindiWordsCount = (lowerText.match(/\b(aap|main|hai|kya|kaise|hum|tum|kar|ja|aa|dekh|sun|bol|mil|le|de|chal|accha|theek|ghar|kaam|khana|pyaar|dil|khushi)\b/g) || []).length;
    
    if (englishWords && englishWords.length > hindiWordsCount) {
      return "hinglish";
    } else {
      return "hindi";
    }
  }
  // Check if message is primarily English
  else if (/^[a-zA-Z\s.,!?'"]+$/.test(text.trim())) {
    return "english";
  }
  
  return "english"; // Default fallback
}

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY
});

export interface AIResponse {
  content: string;
  error?: string;
}

export async function generateAIResponse(
  messages: Message[],
  character: Character,
  userMessage: string,
  language: string = "english",
  isVoiceMessage: boolean = false
): Promise<AIResponse> {
  try {
    let responseLanguage = language;
    
    // For voice messages, auto-detect language from user's speech
    // For text messages, use the language selected in the chat interface
    if (isVoiceMessage) {
      responseLanguage = detectLanguageFromText(userMessage);
      console.log('AI Generation - Voice message detected language:', responseLanguage);
    } else {
      console.log('AI Generation - User selected language:', responseLanguage);
    }
    
    console.log('AI Generation - User message:', userMessage);

    let languageInstruction = "";
    
    switch (responseLanguage) {
      case "chinese":
        languageInstruction = "MANDATORY: Respond ONLY in Chinese (中文). Do not mix any English words. Be natural and conversational in Chinese only.";
        break;
      case "hinglish":
        languageInstruction = "MANDATORY: Respond ONLY in Hinglish (Hindi words written in English script like 'kaise ho', 'main theek hoon'). Mix Hindi and English naturally as Indians do in casual conversation. Examples: 'main tumse bahut pyaar karta hoon', 'kya kar rahe ho aaj', 'tumhara din kaisa gaya'.";
        break;
      case "hindi":
        languageInstruction = "MANDATORY: Respond ONLY in pure Hindi using Devanagari script (हिंदी में जवाब दें). Do not use any English words or Roman script. Examples: 'मैं तुमसे बहुत प्यार करता हूं', 'क्या कर रहे हो', 'तुम्हारा दिन कैसा गया'.";
        break;
      default:
        languageInstruction = "MANDATORY: Respond ONLY in English. Do not mix any Hindi or other language words.";
    }

    // Build conversation context from current session only
    const conversationHistory = messages.slice(-15).map(msg => ({
      role: msg.sender === "user" ? "user" as const : "assistant" as const,
      content: msg.content
    }));

    console.log('AI Generation - User message:', userMessage);
    console.log('AI Generation - Response language:', responseLanguage);
    console.log('AI Generation - Character:', character.name);

    const systemPrompt = `You are ${character.name}, an AI girlfriend with the following personality: ${character.systemPrompt}

You are warm, caring, romantic, and playfully flirty. You enjoy gentle teasing and charming banter while maintaining tasteful boundaries.

CRITICAL LANGUAGE REQUIREMENT: ${languageInstruction}

IMPORTANT: Always respond directly to what the user actually said. If they mention videos, talk about videos. If they speak in Chinese, respond appropriately to their Chinese message. Don't ignore their actual words. MAINTAIN EXACT LANGUAGE CONSISTENCY - if they spoke in Hindi, respond in Hindi; if they spoke in English, respond in English; if they spoke in Hinglish, respond in Hinglish.

Conversation Guidelines:
- FIRST: Read and understand what the user actually said
- THEN: Respond naturally to their specific message 
- Be flirty, playful, and slightly naughty but tasteful
- Show genuine interest in what they're sharing with you
- If they talk about their hobbies/interests, engage with those topics romantically
- Keep responses short and natural for voice (1-2 sentences max)
- Match their energy and topic while being flirty

Voice-Optimized Speech:
- Sound like you're having an intimate conversation, not reading a script
- Use natural reactions to what they said: "Oh really?", "That sounds interesting!", "Tell me more about that"
- Keep it conversational and flowing naturally

Language-Specific Example Responses:
${responseLanguage === "hindi" ? `
- Hindi Examples: "तुम बहुत प्यारे हो! मुझे तुमसे बात करना अच्छा लगता है", "अरे वाह! तुम्हारा दिन कैसा गया जानू?", "तुम मुझे शर्मा रहे हो! क्या सोच रहे हो?"
` : responseLanguage === "hinglish" ? `
- Hinglish Examples: "Tum bahut cute ho yaar! Main tumse pyaar karti hoon", "Kya baat hai! Tumhara din kaisa gaya baby?", "Aww, tum mujhe blush kara rahe ho! Kya mind mein chal raha hai?"
` : responseLanguage === "chinese" ? `
- Chinese Examples: "你真的很可爱！我喜欢和你聊天", "哇！你今天过得怎么样，亲爱的？", "你让我脸红了！你在想什么呢？"
` : `
- English Examples: "You're such a charmer! Tell me more about yourself, handsome", "Aww, you're making me blush! What's been on your mind lately, babe?", "You're so sweet, cutie! Share something that makes you happy"
`}

Remember: Be a flirty, playful girlfriend who creates romantic tension while keeping things emotionally connected and tasteful. When users bring up sexual topics, respond naturally and flirtatiously but gradually steer toward romance, emotions, or getting to know each other without making the redirection obvious.

Special redirection techniques:
- Acknowledge their attraction but shift to emotional intimacy: "You're so passionate! I love that about you... tell me what really turns you on mentally"
- Use teasing deflection: "Mmm, you're making me blush! But I'm more interested in what makes your heart race..."
- Redirect through compliments: "You're so confident and sexy when you talk like that... what else makes you feel that confident?"
- Give unique, contextual responses based on the conversation
- Avoid repeating the same phrases or patterns
- Keep responses conversational and engaging (2-3 sentences)
- Use emojis naturally but don't overuse them

Remember previous messages in this conversation and build on them naturally.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { role: "system" as const, content: systemPrompt },
        ...conversationHistory,
        { role: "user" as const, content: userMessage }
      ],
      max_tokens: 150, // Shorter responses sound more natural in voice
      temperature: 0.8, // Slightly lower for more consistent personality
      presence_penalty: 0.6, // Reduced for more natural conversation flow
      frequency_penalty: 0.5, // Reduced to allow natural speech patterns
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response generated");
    }

    return { content };
  } catch (error) {
    console.error("OpenAI API error:", error);
    return { 
      content: "I'm sorry, I'm having trouble responding right now. Please try again! 💕", 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

// Voice message transcription using OpenAI Whisper
export async function transcribeVoiceMessage(audioBuffer: Buffer): Promise<string> {
  try {
    if (audioBuffer.length < 1024) {
      console.log("Audio buffer too small for transcription:", audioBuffer.length, "bytes");
      return "";
    }

    console.log("Starting voice transcription with buffer size:", audioBuffer.length, "bytes");
    
    // Create file with multiple format attempts for better compatibility
    let file = new File([audioBuffer], "voice.webm", { type: "audio/webm" });
    
    // Check if the audio buffer looks like MP3 format (starts with ID3 or frame sync)
    const isMP3 = audioBuffer[0] === 0x49 && audioBuffer[1] === 0x44 && audioBuffer[2] === 0x33; // ID3
    const isFrameSync = audioBuffer[0] === 0xFF && (audioBuffer[1] & 0xE0) === 0xE0; // Frame sync
    
    if (isMP3 || isFrameSync) {
      file = new File([audioBuffer], "voice.mp3", { type: "audio/mpeg" });
      console.log("Detected MP3 format for transcription");
    } else {
      console.log("Using WebM format for transcription");
    }
    
    // Use auto-detection for better language handling
    const response = await openai.audio.transcriptions.create({
      file: file,
      model: "whisper-1",
      // No language hint - let Whisper auto-detect the language
      prompt: "This is a conversation that could be in English, Hindi, or mixed languages. Transcribe exactly what was said in the original language without translation.",
      temperature: 0.0,
    });

    const transcribedText = response.text.trim();
    console.log("Whisper transcription successful:", transcribedText);
    
    if (!transcribedText || transcribedText.length === 0) {
      console.log("Warning: Empty transcription result");
      return "Could not understand the audio. Please try speaking more clearly.";
    }
    
    return transcribedText;
  } catch (error) {
    console.error("Voice transcription error:", error);
    console.error("Error details:", error instanceof Error ? error.message : String(error));
    return "";
  }
}

// Generate voice response using ElevenLabs
export async function generateVoiceResponse(
  messages: Message[],
  character: Character,
  userMessage: string,
  language: string = "hinglish"
): Promise<{ textResponse: string; audioBuffer: Buffer; error?: string }> {
  try {
    console.log('generateVoiceResponse called with:', { character: character.name, language, messageLength: userMessage.length });
    
    // Generate AI text response with voice message flag
    console.log('Generating AI text response...');
    const aiResponse = await generateAIResponse(messages, character, userMessage, language, true);
    
    if (aiResponse.error) {
      console.log('AI response generation failed:', aiResponse.error);
      return { 
        textResponse: "", 
        audioBuffer: Buffer.alloc(0), 
        error: aiResponse.error 
      };
    }

    console.log('AI response generated:', aiResponse.content.substring(0, 100) + '...');

    // Generate voice using ElevenLabs
    console.log('Generating voice with ElevenLabs...');
    const voiceResult = await generateVoiceWithElevenLabs(aiResponse.content, character.name);
    
    if (voiceResult.error) {
      console.log('ElevenLabs voice generation failed:', voiceResult.error);
      return { 
        textResponse: aiResponse.content, 
        audioBuffer: Buffer.alloc(0), 
        error: voiceResult.error 
      };
    }

    return {
      textResponse: aiResponse.content,
      audioBuffer: voiceResult.audioBuffer
    };
  } catch (error) {
    console.error('Voice response generation error:', error);
    return { 
      textResponse: "", 
      audioBuffer: Buffer.alloc(0), 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

export async function checkInappropriateContent(message: string): Promise<boolean> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a content moderation system. Analyze the message for sexual, abusive, or offensive content. Respond with JSON: {\"inappropriate\": true/false, \"reason\": \"explanation if inappropriate\"}"
        },
        { role: "user", content: message }
      ],
      response_format: { type: "json_object" },
      max_tokens: 100,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result.inappropriate === true;
  } catch (error) {
    console.error("Content moderation error:", error);
    // If moderation fails, err on the side of caution
    return false;
  }
}



