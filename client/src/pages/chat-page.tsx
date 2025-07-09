import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Send, Coins, Star, User, Maximize2, Trash2, CreditCard, Clock, Mic, Volume2, StopCircle } from "lucide-react";
import { VoiceMessage } from "@/components/voice-message";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Character, Message, Conversation } from "@shared/schema";


interface ChatData {
  conversation: Conversation;
  character: Character;
  messages: Message[];
}

interface MessageResponse {
  userMessage: Message;
  aiMessage: Message;
  userCoins: number;
  messageCount: number;
}

export default function ChatPage() {
  const location = window.location.pathname;
  const characterKey = location.split('/chat/')[1];
  
  console.log('ChatPage rendered with location:', location);
  console.log('Extracted characterKey:', characterKey);
  
  if (!characterKey) {
    console.log('No character key found, redirecting to dashboard');
    window.location.href = '/dashboard';
    return <div>Redirecting...</div>;
  }
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [language, setLanguage] = useState("english");
  const [messageInput, setMessageInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [userCoins, setUserCoins] = useState(user?.coins || 0);
  const [voiceResponses, setVoiceResponses] = useState<Record<number, string>>({});
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioData, setAudioData] = useState<string | null>(null);
  const [lastRecordedAudio, setLastRecordedAudio] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const [showPaymentPrompt, setShowPaymentPrompt] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: chatData, isLoading } = useQuery<ChatData>({
    queryKey: ["/api/chat/start", characterKey],
    queryFn: async () => {
      console.log('Starting chat with character:', characterKey);
      const res = await apiRequest("POST", "/api/chat/start", {
        characterKey,
        language,
      });
      return res.json();
    },
    enabled: !!characterKey,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  // Get all conversations for this character
  const { data: allConversations } = useQuery({
    queryKey: ["/api/conversations", characterKey],
    queryFn: async () => {
      const res = await fetch("/api/conversations");
      if (!res.ok) throw new Error("Failed to load conversations");
      const conversations = await res.json();
      return conversations.filter((conv: any) => conv.character.key === characterKey);
    },
    enabled: !!characterKey,
  });

  const deleteConversationMutation = useMutation({
    mutationFn: async (conversationId: number) => {
      const res = await apiRequest("DELETE", `/api/conversations/${conversationId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      // Navigation handled
      setLocation("/dashboard");
      toast({
        title: "Chat deleted",
        description: "Conversation has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (chatData?.messages && localMessages.length === 0) {
      console.log('Loading initial messages:', chatData.messages.length);
      setLocalMessages([...chatData.messages]);
    }
  }, [chatData?.messages]);

  useEffect(() => {
    if (user?.coins !== undefined) {
      setUserCoins(user.coins);
    }
  }, [user?.coins]);

  useEffect(() => {
    console.log('Messages changed, total:', localMessages.length);
    scrollToBottom();
  }, [localMessages, isTyping]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const submitRatingMutation = useMutation({
    mutationFn: async (rating: number) => {
      const res = await apiRequest("POST", "/api/ratings", {
        characterId: chatData?.character.id,
        rating,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Thank you!",
        description: "Your rating has been submitted.",
      });
      setShowRating(false);
      setSelectedRating(0);
    },
    onError: (error: Error) => {
      toast({
        title: "Rating failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      console.log('Sending message:', content, 'Conversation ID:', chatData?.conversation.id);
      const res = await apiRequest("POST", "/api/chat/message", {
        conversationId: chatData?.conversation.id,
        content,
        language,
      });
      const result = await res.json();
      console.log('API response:', result);
      return result;
    },
    onSuccess: (data: MessageResponse) => {
      console.log('Message sent successfully:', data);
      
      // Create proper message objects for display
      const userMsg = {
        id: Date.now(),
        conversationId: data.userMessage.conversationId,
        content: data.userMessage.content,
        sender: "user" as const,
        language: data.userMessage.language,
        createdAt: new Date()
      };
      
      const aiMsg = {
        id: data.aiMessage.id,
        conversationId: data.aiMessage.conversationId,
        content: data.aiMessage.content,
        sender: "ai" as const,
        language: data.aiMessage.language,
        createdAt: new Date(data.aiMessage.createdAt)
      };
      
      // Add both messages to local state for immediate display
      console.log('Adding messages to local state:', { userMsg, aiMsg });
      setLocalMessages(prev => {
        const newMessages = [...prev, userMsg, aiMsg];
        console.log('New messages array:', newMessages.length);
        return newMessages;
      });
      setUserCoins(data.userCoins);
      
      // Update global user state
      queryClient.setQueryData(["/api/user"], (oldUser: any) => ({
        ...oldUser,
        coins: data.userCoins
      }));
      
      // Check if user has used their 5 free messages and now has 0 coins
      if (data.userCoins === 0) {
        setTimeout(() => {
          setShowPaymentPrompt(true);
        }, 2000); // Show after 2 seconds
      }
      
      setIsTyping(false);
      
      // Scroll to bottom after messages are added
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    },
    onError: (error: any) => {
      console.error('Message send error:', error);
      setIsTyping(false);
      
      if (error.message?.includes("coins") || error.message?.includes("insufficient")) {
        // Show buy coins popup instead of error toast
        setShowPaymentPrompt(true);
      } else {
        toast({
          title: "Message failed",
          description: "Failed to send message. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  // Voice message mutation
  const sendVoiceMessageMutation = useMutation({
    mutationFn: async (audioData: string) => {
      console.log('Sending voice message, Conversation ID:', chatData?.conversation.id);
      const res = await apiRequest("POST", "/api/voice/message", {
        conversationId: chatData?.conversation.id,
        audioData,
        language,
      });
      const result = await res.json();
      console.log('Voice API response:', result);
      return result;
    },
    onSuccess: (data: MessageResponse & { voiceResponse: string; userAudioData: string }) => {
      console.log('Voice message sent successfully:', data);
      
      // Create proper message objects for display
      const userMsg = {
        id: Date.now(),
        conversationId: data.userMessage.conversationId,
        content: data.userMessage.content,
        sender: "user" as const,
        language: data.userMessage.language,
        createdAt: new Date(),
        isVoiceMessage: true, // Mark as voice message
        userAudioData: data.userAudioData // Use server-returned audio data
      };
      
      const aiMsg = {
        id: data.aiMessage.id,
        conversationId: data.aiMessage.conversationId,
        content: data.aiMessage.content,
        sender: "ai" as const,
        language: data.aiMessage.language,
        createdAt: new Date(data.aiMessage.createdAt)
      };
      
      // Store voice response for AI message
      if (data.voiceResponse) {
        setVoiceResponses(prev => ({
          ...prev,
          [aiMsg.id]: data.voiceResponse
        }));
      }
      
      // Add both messages to local state for immediate display
      setLocalMessages(prev => [...prev, userMsg, aiMsg]);
      setUserCoins(data.userCoins);
      
      // Update global user state
      queryClient.setQueryData(["/api/user"], (oldUser: any) => ({
        ...oldUser,
        coins: data.userCoins
      }));
      
      // Check if user has 0 coins after voice message
      if (data.userCoins === 0) {
        setTimeout(() => {
          setShowPaymentPrompt(true);
        }, 2000);
      }
      
      setIsTyping(false);
      
      // Scroll to bottom after messages are added
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    },
    onError: (error: any) => {
      console.error('Voice message send error:', error);
      setIsTyping(false);
      
      if (error.message?.includes("coins") || error.message?.includes("insufficient")) {
        // Show buy coins popup instead of error toast
        setShowPaymentPrompt(true);
      } else {
        toast({
          title: "Voice message failed",
          description: "Failed to send voice message. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  const endChatMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/chat/end", {
        conversationId: chatData?.conversation.id,
      });
      return res.json();
    },
    onSuccess: () => {
      if (localMessages.length > 0) {
        setShowRating(true);
      } else {
        setLocation("/dashboard");
      }
    },
  });





  const handleSendMessage = () => {
    if (sendMessageMutation.isPending) return;
    
    // Check if user has insufficient coins - show buy coins popup
    if (userCoins < 1) {
      setShowPaymentPrompt(true);
      return;
    }
    
    // If user has coins but no message, don't proceed
    if (!messageInput.trim()) return;
    
    const content = messageInput.trim();
    setMessageInput(""); // Clear input immediately
    setIsTyping(true);
    
    console.log('Sending message:', content);
    sendMessageMutation.mutate(content);
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        } 
      });
      
      // Try different audio formats for better compatibility
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/mp4';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = ''; // Let browser choose
          }
        }
      }
      
      const mediaRecorder = new MediaRecorder(stream, {
        ...(mimeType && { mimeType })
      });
      
      mediaRecorderRef.current = mediaRecorder;
      const chunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        console.log('Audio recording completed. Blob size:', audioBlob.size, 'bytes');
        
        const reader = new FileReader();
        
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          const audioData = base64Audio.split(',')[1];
          console.log('Base64 audio data length:', audioData.length, 'characters');
          
          // Store the FULL audio data for playback (with data URL prefix)
          setLastRecordedAudio(base64Audio);
          
          handleVoiceMessage(audioData);
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
      toast({
        title: "Recording Error",
        description: "Could not access microphone. Please allow microphone permission.",
        variant: "destructive",
      });
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

  const handleVoiceMessage = (audioData: string) => {
    if (sendVoiceMessageMutation.isPending) return;
    
    // Check if user has insufficient coins - show buy coins popup
    if (userCoins < 1) {
      setShowPaymentPrompt(true);
      return;
    }
    
    if (!audioData || audioData.length === 0) {
      toast({
        title: "No audio recorded",
        description: "Please record a voice message first.",
        variant: "destructive",
      });
      return;
    }

    setIsTyping(true);
    console.log('Sending voice message:', audioData.length, 'characters');
    sendVoiceMessageMutation.mutate(audioData);
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };





  const handleEndChat = () => {
    endChatMutation.mutate();
  };

  const handleRatingSubmit = () => {
    if (selectedRating > 0) {
      submitRatingMutation.mutate(selectedRating);
    }
  };



  // Removed free messages system - now 1 coin per message

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-pink-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!chatData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-pink-100 flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardContent className="p-6 text-center">
            <p className="text-gray-600 mb-4">Character not found</p>
            <Button onClick={() => setLocation("/dashboard")}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { character } = chatData;

  return (
    <div 
      className="min-h-screen flex flex-col relative"
      style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.3)), url(${character?.avatar})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Chat Header */}
      <div className="bg-black/20 backdrop-blur-md border-b border-white/20 px-4 py-3 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/dashboard")}
              className="mr-3 text-white hover:text-white/80"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <img 
              src={character.avatar} 
              alt={character.name} 
              className="w-10 h-10 rounded-full mr-3 object-cover cursor-pointer hover:scale-110 transition-transform duration-200"
              onClick={() => setShowAvatarModal(true)}
            />
            <div>
              <h3 className="font-semibold text-white">{character.name}</h3>
              <p className="text-xs text-green-400">Online</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center gap-1 text-sm text-white">
              <Coins className="w-4 h-4 text-yellow-400" />
              <span className="font-semibold text-white">{userCoins}</span>
            </div>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-24 h-8 text-xs bg-white/20 border-white/30 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="english">English</SelectItem>
                <SelectItem value="hinglish">Hinglish</SelectItem>
                <SelectItem value="hindi">हिंदी</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 px-4 py-4 overflow-y-auto relative">
        <div className="max-w-2xl mx-auto space-y-4 relative z-10">
          {/* Welcome Message */}
          <div className="flex items-start space-x-3">
            <img 
              src={character.avatar} 
              alt={character.name} 
              className="w-8 h-8 rounded-full object-cover cursor-pointer hover:scale-110 transition-transform duration-200"
              onClick={() => setShowAvatarModal(true)}
            />
            <div className="bg-black/60 backdrop-blur-sm text-white rounded-bl-none shadow-lg max-w-xs lg:max-w-md px-4 py-2 rounded-lg">
              <p>{character.intro}</p>
            </div>
          </div>



          {/* Chat Messages */}
          {localMessages.map((message, index) => {
            console.log('Rendering message:', index, message.content, message.sender, 'isVoiceMessage:', (message as any).isVoiceMessage, 'userAudioData:', !!(message as any).userAudioData);
            return (
              <div key={`msg-${message.id || Date.now() + index}-${message.sender}-${index}`} className={`flex ${message.sender === 'user' ? 'justify-end' : 'items-start space-x-3'} mb-4`}>
                {message.sender === 'ai' && (
                  <img 
                    src={character.avatar} 
                    alt={character.name} 
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0 cursor-pointer hover:scale-110 transition-transform duration-200"
                    onClick={() => setShowAvatarModal(true)}
                  />
                )}
                <div className={`max-w-xs lg:max-md rounded-lg ${message.sender === 'user' 
                  ? 'bg-white text-gray-800 rounded-br-none shadow-lg' 
                  : 'bg-black/60 backdrop-blur-sm text-white rounded-bl-none shadow-lg'
                }`}>
                  {/* Show voice bubble for user voice messages */}
                  {message.sender === 'user' && (message as any).isVoiceMessage && (
                    <div className="px-2 py-2">
                      <div className="flex items-center space-x-2 bg-blue-600 text-white px-3 py-2 rounded-lg">
                        <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                          </svg>
                        </div>
                        {(message as any).userAudioData ? (
                          <VoiceMessage 
                            audioData={(message as any).userAudioData} 
                            autoPlay={false}
                            className="text-white bg-transparent"
                          />
                        ) : (
                          <span className="text-sm font-medium">🎵 Voice Message</span>
                        )}
                        <span className="text-xs opacity-70">
                          {new Date(message.createdAt || Date.now()).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* Show text content for regular user messages OR AI messages without voice */}
                  {((message.sender === 'user' && !(message as any).isVoiceMessage) || (message.sender === 'ai' && !voiceResponses[message.id])) && (
                    <div className="px-4 py-2">
                      <p className="text-sm">{message.content}</p>
                      <span className="text-xs opacity-70 mt-1 block">
                        {new Date(message.createdAt || Date.now()).toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                  
                  {/* Voice Message for AI responses */}
                  {message.sender === 'ai' && voiceResponses[message.id] && (
                    <div className="px-2 py-2">
                      <VoiceMessage 
                        audioData={voiceResponses[message.id]} 
                        autoPlay={false}
                        className=""
                      />
                    </div>
                  )}
                </div>
            </div>
          );
          })}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex items-start space-x-3">
              <img 
                src={character.avatar} 
                alt={character.name} 
                className="w-8 h-8 rounded-full object-cover cursor-pointer hover:scale-110 transition-transform duration-200"
                onClick={() => setShowAvatarModal(true)}
              />
              <div className="bg-black/60 backdrop-blur-sm text-white rounded-bl-none shadow-lg max-w-xs lg:max-w-md px-4 py-2 rounded-lg">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Chat Input */}
      <div className="bg-black/40 backdrop-blur-md border-t border-white/20 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          {/* WhatsApp-style Input with Text Send and Voice Buttons */}
          <div className="flex items-center space-x-3">
            <div className="flex-1">
              <Input
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Type a message..."
                className="rounded-2xl border-0 bg-white/20 backdrop-blur-sm text-white placeholder:text-white/60 focus:bg-white/30"
                disabled={sendMessageMutation.isPending || isRecording}
              />
            </div>
      
            {/* Text Send Button - Always visible */}
            {!isRecording && (
              <Button
                onClick={handleSendMessage}
                disabled={sendMessageMutation.isPending || !messageInput.trim()}
                className={!messageInput.trim() 
                  ? "bg-gray-400 text-white p-3 rounded-2xl cursor-not-allowed opacity-60" 
                  : "bg-white/80 hover:bg-white text-gray-800 p-3 rounded-2xl hover:shadow-lg transition-all"
                }
                title="Send text message"
              >
                <Send className="w-5 h-5" />
              </Button>
            )}

            {/* Voice Note Button - Always visible */}
            {!isRecording && (
              <Button
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onMouseLeave={stopRecording}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                disabled={sendMessageMutation.isPending}
                className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-2xl hover:shadow-lg transition-all"
                title="Hold to record voice message"
              >
                <Mic className="w-5 h-5" />
              </Button>
            )}

            {/* Recording State */}
            {isRecording && (
              <div className="flex items-center space-x-3">
                <Button
                  onMouseUp={stopRecording}
                  onTouchEnd={stopRecording}
                  className="bg-red-500 hover:bg-red-600 text-white p-3 rounded-2xl animate-pulse"
                >
                  <StopCircle className="w-5 h-5" />
                </Button>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-white text-sm">{formatTime(recordingTime)}</span>
                </div>
              </div>
            )}
          </div>
        
          <div className="flex justify-between items-center mt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEndChat}
              className="text-white/70 hover:text-white"
            >
              End Chat
            </Button>
            <div className="text-xs text-white/70">
              1 coin per message • {userCoins} coins remaining
            </div>
          </div>
        </div>
      </div>

      {/* Rating Modal */}
      <Dialog open={showRating} onOpenChange={setShowRating}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-primary">
              Rate Your Experience
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-4">
            <p className="text-gray-600 mb-6">
              How was your chat with {character.name}?
            </p>
            
            <div className="flex justify-center space-x-2 mb-6">
              {[1, 2, 3, 4, 5].map((rating) => (
                <Button
                  key={rating}
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedRating(rating)}
                  className={`text-4xl p-1 ${
                    selectedRating >= rating ? 'text-yellow-400' : 'text-gray-300'
                  } hover:text-yellow-400 transition-colors`}
                >
                  <Star className="w-8 h-8" fill={selectedRating >= rating ? 'currentColor' : 'none'} />
                </Button>
              ))}
            </div>

            <div className="flex space-x-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowRating(false);
                  setLocation("/dashboard");
                }}
                className="flex-1"
              >
                Skip
              </Button>
              <Button
                onClick={handleRatingSubmit}
                className="flex-1 romantic-gradient text-white"
                disabled={submitRatingMutation.isPending}
              >
                {submitRatingMutation.isPending ? "Submitting..." : "Submit"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Prompt Dialog */}
      <Dialog open={showPaymentPrompt} onOpenChange={setShowPaymentPrompt}>
        <DialogContent className="max-w-md mx-4">
          <DialogHeader>
            <DialogTitle className="text-center text-lg font-semibold text-pink-600">
              💰 Need More Coins!
            </DialogTitle>
          </DialogHeader>
          <div className="text-center space-y-4 py-4">
            <div>
              <p className="text-gray-700 mb-2">
                You need coins to continue chatting with <strong>{chatData?.character.name}</strong>
              </p>
              <p className="text-sm text-gray-600 mb-4">Choose your coin package:</p>
            </div>

            <div className="space-y-3">
              {/* Payment Options */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                  <div className="font-semibold text-blue-700">10 Coins</div>
                  <div className="text-blue-600">₹10</div>
                </div>
                <div className="bg-pink-50 border border-pink-200 rounded-lg p-2">
                  <div className="font-semibold text-pink-700">20 Coins</div>
                  <div className="text-pink-600">₹20</div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                  <div className="font-semibold text-green-700">50 Coins</div>
                  <div className="text-green-600">₹50</div>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-2">
                  <div className="font-semibold text-purple-700">100 Coins</div>
                  <div className="text-purple-600">₹100</div>
                </div>
              </div>
              
              <Button 
                onClick={() => {
                  setShowPaymentPrompt(false);
                  setLocation('/payment');
                }}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-bold py-3 text-lg"
              >
                Buy Coins Now
              </Button>
              
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setShowPaymentPrompt(false)}
                  className="flex-1"
                >
                  Maybe Later
                </Button>
              </div>
              
              <p className="text-xs text-gray-500 text-center">
                No login required • Instant delivery • Secure payment
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
