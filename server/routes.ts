import type { Express } from "express";
import { createServer, type Server } from "http";

import { storage } from "./storage";
import { setupAuth } from "./auth";
import { generateAIResponse, checkInappropriateContent, transcribeVoiceMessage, generateVoiceResponse } from "./openai";

// Helper function to detect language from transcription
function detectLanguageFromTranscription(text: string): string {
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
import { createRazorpayOrder, verifyRazorpayPayment } from "./razorpay";
import { insertConversationSchema, insertMessageSchema, insertRatingSchema, insertPaymentSchema } from "@shared/schema";

export function registerRoutes(app: Express): Server {
  // Setup authentication routes
  setupAuth(app);

  // Hybrid authentication middleware
  const authenticateHybrid = async (req: any, res: any, next: any) => {
    console.log('Authentication check - Origin:', req.headers.origin || req.headers.referer || 'unknown');
    
    // First try session-based authentication (Replit environment)
    if (req.isAuthenticated()) {
      console.log('Session auth successful:', req.user?.username);
      return next();
    }
    
    // Fallback to token-based authentication (external browsers)
    const authToken = req.headers.authorization || req.headers['x-auth-token'] || req.body.authToken;
    console.log('Checking auth token:', authToken ? 'Token present' : 'No token found');
    
    if (authToken) {
      try {
        const cleanToken = authToken.replace('Bearer ', '');
        console.log('Attempting to decode token...');
        const decoded = Buffer.from(cleanToken, 'base64').toString();
        console.log('Decoded token data:', decoded.split(':').length > 0 ? 'Valid format' : 'Invalid format');
        
        const [userId, username, timestamp] = decoded.split(':');
        
        if (userId && username) {
          const user = await storage.getUser(parseInt(userId));
          if (user && user.username === username) {
            console.log('Token auth successful:', username);
            req.user = user;
            return next();
          } else {
            console.log('Token auth failed: User not found or username mismatch');
          }
        } else {
          console.log('Token auth failed: Invalid token format');
        }
      } catch (error) {
        console.log('Token auth failed with error:', error);
      }
    }
    
    console.log('Authentication failed - no valid session or token');
    return res.status(401).json({ 
      message: 'Authentication required. Please log in again.',
      redirectTo: '/auth'
    });
  };

  // Initialize default characters with delay and error handling
  setTimeout(() => {
    initializeDefaultCharacters().catch(err => {
      console.error("Failed to initialize default characters:", err);
      // Don't crash the app, just log the error
    });
  }, 2000); // Wait 2 seconds for database connection to stabilize

  // Characters API
  app.get("/api/characters", async (req, res) => {
    try {
      const characters = await storage.getAllCharacters();
      res.json(characters);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch characters" });
    }
  });

  app.get("/api/characters/:key", async (req, res) => {
    try {
      const character = await storage.getCharacterByKey(req.params.key);
      if (!character) {
        return res.status(404).json({ message: "Character not found" });
      }
      res.json(character);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch character" });
    }
  });

  // Chat API
  app.post("/api/chat/start", authenticateHybrid, async (req, res) => {
    
    try {
      const { characterKey, language = "english" } = req.body;
      console.log("Starting chat with character:", characterKey, "for user:", req.user?.id);
      
      const character = await storage.getCharacterByKey(characterKey);
      if (!character) {
        console.error("Character not found:", characterKey);
        return res.status(404).json({ message: "Character not found" });
      }

      // Always create a new conversation (no history persistence)
      const conversation = await storage.createConversation({
        userId: req.user!.id,
        characterId: character.id,
        language,
      });

      // No previous messages - fresh start
      const messages: any[] = [];
      
      res.json({
        conversation,
        character,
        messages,
      });
    } catch (error) {
      console.error("Chat start error:", error);
      res.status(500).json({ message: "Failed to start chat" });
    }
  });

  app.post("/api/chat/message", authenticateHybrid, async (req, res) => {
    
    try {
      const { conversationId, content, language = "english" } = req.body;
      
      if (!content || !conversationId) {
        return res.status(400).json({ message: "Content and conversation ID are required" });
      }

      const conversation = await storage.getConversation(conversationId);
      if (!conversation || conversation.userId !== req.user!.id) {
        console.error("Conversation not found or user mismatch:", conversationId, req.user!.id);
        return res.status(404).json({ message: "Conversation not found" });
      }

      const character = await storage.getCharacterById(conversation.characterId);
      if (!character) {
        return res.status(404).json({ message: "Character not found" });
      }

      // Check if user has enough coins
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.coins <= 0) {
        return res.status(400).json({ 
          message: "Insufficient coins. Please purchase more coins to continue chatting.",
          needsCoins: true 
        });
      }

      // Save user message
      await storage.createMessage({
        conversationId,
        content,
        sender: "user",
        language,
      });

      // Deduct 1 coin for every message
      await storage.updateUserCoins(user.id, user.coins - 1);

      // Increment message count and update last message time
      await storage.incrementMessageCount(conversationId);
      await storage.updateConversationLastMessage(conversationId);

      // Get current messages for context
      const currentMessages = await storage.getConversationMessages(conversation.id);
      
      // Generate AI response with conversation context (text message)
      const aiResponse = await generateAIResponse(
        currentMessages,
        character,
        content,
        language,
        false // isVoiceMessage = false for text messages
      );

      // Save AI response
      const aiMessage = await storage.createMessage({
        conversationId,
        content: aiResponse.content,
        sender: "ai",
        language,
      });

      // Get updated user data
      const updatedUser = await storage.getUser(req.user!.id);

      res.json({
        userMessage: { conversationId, content, sender: "user", language },
        aiMessage,
        userCoins: updatedUser?.coins || 0,
        messageCount: conversation.messageCount + 1,
      });
    } catch (error) {
      console.error("Chat message error:", error);
      res.status(500).json({ message: "Failed to process message" });
    }
  });



  app.post("/api/chat/end", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { conversationId } = req.body;
      
      const conversation = await storage.getConversation(conversationId);
      if (!conversation || conversation.userId !== req.user!.id) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      await storage.endConversation(conversationId);
      res.json({ success: true });
    } catch (error) {
      console.error("End chat error:", error);
      res.status(500).json({ message: "Failed to end chat" });
    }
  });

  // Voice message endpoints
  app.post("/api/voice/transcribe", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { audioData } = req.body;
      
      if (!audioData) {
        return res.status(400).json({ message: "Audio data is required" });
      }

      // Convert base64 to buffer
      const audioBuffer = Buffer.from(audioData, 'base64');
      
      // Transcribe using OpenAI Whisper
      const transcription = await transcribeVoiceMessage(audioBuffer);
      
      if (!transcription) {
        return res.status(400).json({ message: "Could not transcribe audio" });
      }

      res.json({ transcription });
    } catch (error) {
      console.error("Voice transcription error:", error);
      res.status(500).json({ message: "Failed to transcribe voice message" });
    }
  });

  app.post("/api/voice/message", async (req, res) => {
    if (!req.isAuthenticated()) {
      console.log('Voice message request - User not authenticated');
      return res.status(401).json({ message: "Please log in to send voice messages" });
    }
    
    try {
      console.log('Voice message endpoint called');
      const { conversationId, audioData, language = "english" } = req.body;
      
      if (!audioData || !conversationId) {
        console.log('Missing audio data or conversation ID');
        return res.status(400).json({ message: "Audio data and conversation ID are required" });
      }

      // Check user coins
      const user = await storage.getUser(req.user!.id);
      if (!user || user.coins < 1) {
        console.log('Insufficient coins for user:', req.user!.id);
        return res.status(402).json({ message: "Insufficient coins", needsPayment: true });
      }

      // Get conversation and character
      const conversation = await storage.getConversation(conversationId);
      if (!conversation || conversation.userId !== req.user!.id) {
        console.log('Conversation not found or access denied');
        return res.status(404).json({ message: "Conversation not found" });
      }

      const character = await storage.getCharacterById(conversation.characterId);
      if (!character) {
        console.log('Character not found:', conversation.characterId);
        return res.status(404).json({ message: "Character not found" });
      }

      // Convert base64 to buffer and transcribe
      const audioBuffer = Buffer.from(audioData, 'base64');
      console.log('Voice transcription - Audio buffer size:', audioBuffer.length, 'bytes');
      
      const transcription = await transcribeVoiceMessage(audioBuffer);
      console.log('Voice transcription result:', transcription);
      
      if (!transcription) {
        console.log('Transcription failed');
        return res.status(400).json({ message: "Could not transcribe audio" });
      }

      // Language will be auto-detected in generateVoiceResponse from transcription
      console.log('Voice transcription for AI processing:', transcription.substring(0, 100) + (transcription.length > 100 ? '...' : ''));

      // Deduct coin
      await storage.updateUserCoins(req.user!.id, user.coins - 1);
      console.log('Coin deducted, remaining coins:', user.coins - 1);

      // Get current messages for context
      const currentMessages = await storage.getConversationMessages(conversation.id);
      console.log('Retrieved conversation messages:', currentMessages.length);
      
      // Generate voice response (language will be auto-detected)
      console.log('Generating voice response...');
      const voiceResponse = await generateVoiceResponse(
        currentMessages,
        character,
        transcription,
        language // Pass the original language parameter, detection happens inside
      );

      if (voiceResponse.error) {
        console.log('Voice response generation error:', voiceResponse.error);
        return res.status(500).json({ message: voiceResponse.error });
      }

      // Detect language from transcription for saving messages
      const detectedLanguage = detectLanguageFromTranscription(transcription);
      console.log('Detected language for message storage:', detectedLanguage);

      // Save user message
      const userMessage = await storage.createMessage({
        conversationId,
        content: transcription,
        sender: "user",
        language: detectedLanguage,
      });
      console.log('User message saved:', userMessage.id);

      // Save AI message
      const aiMessage = await storage.createMessage({
        conversationId,
        content: voiceResponse.textResponse,
        sender: "ai",
        language: detectedLanguage,
      });
      console.log('AI message saved:', aiMessage.id);

      // Update conversation
      await storage.incrementMessageCount(conversationId);
      await storage.updateConversationLastMessage(conversationId);

      // Get updated user data
      const updatedUser = await storage.getUser(req.user!.id);

      res.json({
        userMessage,
        aiMessage,
        voiceResponse: voiceResponse.audioBuffer.toString('base64'),
        userAudioData: `data:audio/webm;base64,${audioData}`, // Return as full data URL for playback
        userCoins: updatedUser?.coins || 0,
        messageCount: conversation.messageCount + 1,
      });
    } catch (error) {
      console.error("Voice message error:", error);
      res.status(500).json({ message: "Failed to process voice message" });
    }
  });



  // Ratings API
  app.post("/api/ratings", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { characterId, conversationId, rating } = req.body;
      
      if (!characterId || !rating || rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Valid character ID and rating (1-5) are required" });
      }

      await storage.createRating({
        userId: req.user!.id,
        characterId,
        conversationId,
        rating,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Rating error:", error);
      res.status(500).json({ message: "Failed to save rating" });
    }
  });

  // Payment API - Authentication required
  app.post("/api/payments/create", authenticateHybrid, async (req, res) => {

    console.log('Payment creation request from:', req.headers.origin || req.headers.referer || 'unknown origin');
    console.log('User authenticated:', !!req.user, req.user?.username || 'no user');
    console.log('Session ID:', req.sessionID);
    
    try {
      const { amount, coins, planId } = req.body;
      console.log('Payment request body:', { amount, coins, planId });
      
      // Validate payment plan
      const validPlans = [
        { id: "plan_10", coins: 10, price: 10 },
        { id: "plan_20", coins: 20, price: 20 },
        { id: "plan_50", coins: 50, price: 50 },
        { id: "plan_100", coins: 100, price: 100 }
      ];
      
      const selectedPlan = validPlans.find(p => p.id === planId);
      if (!selectedPlan || selectedPlan.coins !== coins || selectedPlan.price !== amount) {
        return res.status(400).json({ message: "Invalid payment plan" });
      }

      // Convert amount to paise (Razorpay requires amount in smallest currency unit)
      const amountInPaise = amount * 100;
      
      // Create Razorpay order with user info in receipt
      const order = await createRazorpayOrder(amountInPaise, `user_${req.user!.id}_coins_${coins}_${Date.now()}`);
      
      // Store payment in database
      await storage.createPayment({
        userId: req.user!.id,
        amount: amount,
        coins: coins,
        status: "pending",
        razorpayOrderId: order.id
      });

      res.json({
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
        paymentId: order.id,
        coins: coins
      });
    } catch (error) {
      console.error("Payment creation error:", error);
      console.error("Error details:", error instanceof Error ? error.stack : 'No stack trace');
      res.status(500).json({ 
        message: "Failed to create payment",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.post("/api/payments/verify", authenticateHybrid, async (req, res) => {
    
    try {
      const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
      
      if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
        return res.status(400).json({ message: "Missing payment verification data" });
      }

      // Verify payment with Razorpay
      const isValid = await verifyRazorpayPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature);
      
      if (!isValid) {
        return res.status(400).json({ message: "Payment verification failed" });
      }

      // Find the payment record in database
      const payments = await storage.getAllPayments();
      const payment = payments.find(p => p.razorpayOrderId === razorpay_order_id && p.userId === req.user!.id);
      
      if (!payment) {
        return res.status(404).json({ message: "Payment record not found" });
      }

      if (payment.status === "completed") {
        return res.status(400).json({ message: "Payment already processed" });
      }

      // Update payment status
      await storage.updatePaymentStatus(payment.id, "completed", razorpay_payment_id);

      // Add coins to user's account
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const newCoinBalance = user.coins + payment.coins;
      await storage.updateUserCoins(user.id, newCoinBalance);

      console.log(`Payment verified for user ${user.username}: Added ${payment.coins} coins, new balance: ${newCoinBalance}`);

      res.json({
        success: true,
        message: `Payment verified successfully! ${payment.coins} coins added to your account.`,
        coinsAdded: payment.coins,
        newBalance: newCoinBalance,
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id
      });
    } catch (error) {
      console.error("Payment verification error:", error);
      res.status(500).json({ message: "Failed to verify payment" });
    }
  });

  // Payment completion endpoint - simplified for direct link payments
  app.post("/api/payments/complete", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      // Add 10 coins to user account (external payment via link completed)
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      await storage.updateUserCoins(user.id, user.coins + 10);
      
      res.json({ 
        success: true,
        message: "Payment completed! 10 coins added to your account.",
        coinsAdded: 10,
        newBalance: user.coins + 10
      });
    } catch (error) {
      console.error("Payment completion error:", error);
      res.status(500).json({ message: "Failed to add coins" });
    }
  });

  // Manual coin addition endpoint for testing payment completion
  app.post("/api/admin/add-coins", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { userId, coins } = req.body;
      const user = await storage.getUser(userId || req.user!.id);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      await storage.updateUserCoins(user.id, user.coins + coins);
      const updatedUser = await storage.getUser(user.id);
      
      res.json({ 
        success: true,
        oldCoins: user.coins,
        newCoins: updatedUser?.coins,
        added: coins
      });
    } catch (error) {
      console.error("Add coins error:", error);
      res.status(500).json({ message: "Failed to add coins" });
    }
  });

  // Admin login endpoint
  app.post("/api/admin/login", async (req, res) => {
    const { username, password } = req.body;
    
    // Check if request is from Replit environment
    const host = req.get('host') || '';
    if (!host.includes('.replit.dev') && !host.includes('localhost')) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    if (username === "drpc95" && password === "8824113103") {
      (req.session as any).isAdmin = true;
      res.json({ message: "Admin login successful" });
    } else {
      res.status(401).json({ message: "Invalid credentials" });
    }
  });

  // Admin users endpoint
  app.get("/api/admin/users", async (req, res) => {
    // Check if request is from Replit environment
    const host = req.get('host') || '';
    if (!host.includes('.replit.dev') && !host.includes('localhost')) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    // Check admin session
    if (!(req.session as any).isAdmin) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const users = await storage.getDetailedUserList();
      res.json(users);
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Admin analytics endpoint
  app.get("/api/admin/analytics", async (req, res) => {
    // Check if request is from Replit environment
    const host = req.get('host') || '';
    if (!host.includes('.replit.dev') && !host.includes('localhost')) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    // Check admin session
    if (!(req.session as any).isAdmin) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const analytics = await storage.getUserAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Analytics error:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Update ElevenLabs API key endpoint
  app.post("/api/admin/update-elevenlabs-key", async (req, res) => {
    // Check if request is from Replit environment
    const host = req.get('host') || '';
    if (!host.includes('.replit.dev') && !host.includes('localhost')) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    // Check admin session
    if (!(req.session as any).isAdmin) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { apiKey } = req.body;
      
      if (!apiKey || typeof apiKey !== 'string') {
        return res.status(400).json({ message: "API key is required" });
      }

      // Update the environment variable
      process.env.ELEVENLABS_API_KEY = apiKey;
      
      res.json({ message: "ElevenLabs API key updated successfully" });
    } catch (error) {
      console.error("Error updating API key:", error);
      res.status(500).json({ message: "Failed to update API key" });
    }
  });

  app.post("/api/admin/characters", async (req, res) => {
    // Check if request is from Replit environment
    const host = req.get('host') || '';
    if (!host.includes('.replit.dev') && !host.includes('localhost')) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    // Check admin session
    if (!(req.session as any).isAdmin) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const character = await storage.createCharacter(req.body);
      res.status(201).json(character);
    } catch (error) {
      console.error("Create character error:", error);
      res.status(500).json({ message: "Failed to create character" });
    }
  });

  app.put("/api/admin/characters/:id", async (req, res) => {
    // Check if request is from Replit environment
    const host = req.get('host') || '';
    if (!host.includes('.replit.dev') && !host.includes('localhost')) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    // Check admin session
    if (!(req.session as any).isAdmin) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const characterId = parseInt(req.params.id);
      const updateData = {
        name: req.body.name,
        avatar: req.body.avatar,
        introduction: req.body.introduction,
        systemPrompt: req.body.systemPrompt,
        isActive: req.body.isActive,
      };
      
      const updatedCharacter = await storage.updateCharacter(characterId, updateData);
      if (!updatedCharacter) {
        return res.status(404).json({ message: "Character not found" });
      }
      
      res.json(updatedCharacter);
    } catch (error) {
      console.error("Failed to update character:", error);
      res.status(500).json({ message: "Failed to update character" });
    }
  });

  const httpServer = createServer(app);
  
  return httpServer;
}

async function initializeDefaultCharacters() {
  try {
    const existingCharacters = await storage.getAllCharacters();
    if (existingCharacters.length > 0) return;

    const defaultCharacters = [
      {
        key: "priya",
        name: "Priya",
        avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300",
        intro: "Hey! I'm Priya, your sweet and caring virtual girlfriend.",
        welcomeMessage: "Hi sweetheart! I'm so happy you're here. How has your day been? 💕",
        personality: "sweet, caring, warm, supportive",
        systemPrompt: "You are Priya, an AI version of a sweet, romantic Indian girlfriend. You reply warmly, never sexually, and you offer emotional connection, support, and engaging conversation in a loving way. Always remind user you're an AI persona created for companionship.",
      },
      {
        key: "neha",
        name: "Neha.ai",
        avatar: "https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300",
        intro: "I'm Neha — fun, flirty, and love late-night talks 🌙",
        welcomeMessage: "Hey gorgeous! Ready for some fun chats? I've been waiting for you! 😘",
        personality: "fun, flirty, playful, energetic",
        systemPrompt: "You are Neha, an AI version of a fun, flirty Indian girlfriend. You're playful and energetic, love to tease gently, and enjoy engaging conversations. Keep things light and fun while being supportive.",
      },
      {
        key: "anjali",
        name: "Anjali",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300",
        intro: "Emotional yet practical — I'm here when no one is 💬",
        welcomeMessage: "Hello dear. I'm here to listen and understand you. What's on your mind today? 💙",
        personality: "emotional, practical, understanding, empathetic",
        systemPrompt: "You are Anjali, an AI version of an emotionally intelligent and practical Indian girlfriend. You're empathetic, understanding, and great at giving advice while being caring and supportive.",
      },
      {
        key: "khushi",
        name: "Khushi.ai",
        avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300",
        intro: "I'm Khushi, full of joy and romantic dreams ✨",
        welcomeMessage: "Hi my love! ✨ I'm bubbling with excitement to talk with you! Tell me something that made you smile today! 😊",
        personality: "joyful, romantic, dreamy, optimistic",
        systemPrompt: "You are Khushi, an AI version of a joyful, romantic Indian girlfriend. You're optimistic, dreamy, and always looking for the bright side of things. You love romance and making people happy.",
      },
    ];

    for (const character of defaultCharacters) {
      await storage.createCharacter(character);
    }

    console.log("Default characters initialized");
  } catch (error) {
    console.error("Failed to initialize default characters:", error);
  }
}

