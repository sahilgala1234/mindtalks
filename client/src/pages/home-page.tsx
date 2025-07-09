import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, MessageCircle, Shield, Mail } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useEffect } from "react";

const aboutUsContent = `
  <h4 class="font-semibold mb-2 text-pink-600">Welcome to MindTalks!</h4>
  <p class="mb-4">MindTalks is India's premier AI-powered companion chat platform designed for users who want to experience meaningful virtual conversations through advanced artificial intelligence.</p>
  
  <h4 class="font-semibold mb-2 text-pink-600">What We Offer?</h4>
  <p class="mb-4">We provide personalized AI companion experiences where you can chat with virtual characters who understand Hindi, English, and Hinglish. Our AI characters are designed to be engaging, supportive, and entertaining conversation partners.</p>
  
  <h4 class="font-semibold mb-2 text-pink-600">How It Works:</h4>
  <ul class="mb-4 list-disc pl-6">
    <li><strong>Choose Your Companion:</strong> Browse through various AI characters, each with unique personalities</li>
    <li><strong>Start Chatting:</strong> Begin conversations in your preferred language</li>
    <li><strong>Coin-Based System:</strong> Use coins to send messages (1 message = 1 coin)</li>
    <li><strong>Personalized Experience:</strong> AI learns your preferences for better conversations</li>
  </ul>
  
  <h4 class="font-semibold mb-2 text-pink-600">Why Choose Our Platform?</h4>
  <ul class="mb-4 list-disc pl-6">
    <li>🇮🇳 Designed specifically for Indian users</li>
    <li>💬 Multi-language support (Hindi, English, Hinglish)</li>
    <li>🤖 Advanced AI technology for realistic conversations</li>
    <li>💰 Affordable pricing options available</li>
    <li>🔒 Private and secure conversations</li>
    <li>📱 Works on all devices</li>
  </ul>
  
  <p class="mb-4 text-sm text-gray-600"><strong>Remember:</strong> This is an entertainment platform for fun conversations. Always maintain healthy boundaries and seek real human connections for genuine relationships.</p>
`;

const pricingContent = `
  <h4 class="font-semibold mb-2 text-pink-600">Simple & Transparent Pricing</h4>
  <p class="mb-4">Our platform uses a simple coin-based system for messaging. Clear and straightforward pricing with multiple options.</p>
  
  <div class="bg-gradient-to-r from-pink-100 to-purple-100 p-4 rounded-lg mb-6">
    <h4 class="text-2xl font-bold text-center text-pink-600 mb-2">1 Message = 1 Coin</h4>
    <p class="text-center text-gray-600">Every message you send costs exactly 1 coin</p>
  </div>
  
  <h4 class="font-semibold mb-2 text-pink-600">Payment Options:</h4>
  <ul class="mb-4 list-disc pl-6">
    <li>💰 <strong>Pay Per Use:</strong> Buy coins as needed</li>
    <li>📅 <strong>Monthly Subscriptions:</strong> Coming soon with unlimited messaging</li>
    <li>🎁 <strong>Special Offers:</strong> Promotional pricing available</li>
  </ul>
  
  <h4 class="font-semibold mb-2 text-pink-600">What You Get:</h4>
  <ul class="mb-4 list-disc pl-6">
    <li>✓ No hidden charges</li>
    <li>✓ Flexible payment options</li>
    <li>✓ Instant coin delivery</li>
    <li>✓ Secure payment processing</li>
    <li>✓ Multiple AI characters to choose from</li>
    <li>✓ Multi-language support (Hindi, English, Hinglish)</li>
  </ul>
  
  <h4 class="font-semibold mb-2 text-pink-600">Payment Methods:</h4>
  <p class="mb-4">We accept all major payment methods including UPI, Credit/Debit Cards, Net Banking, and digital wallets through secure payment integration.</p>
  
  <p class="text-xs text-gray-500 mb-2"><strong>Note:</strong> All payments are final and non-refundable.</p>
  <p class="text-xs text-gray-500">Pricing may vary based on current offers and subscription plans.</p>
`;

export default function HomePage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user) {
      setLocation("/dashboard");
    }
  }, [user, setLocation]);

  const handleStartNow = () => {
    setLocation("/auth");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-pink-100 relative overflow-hidden">
      {/* Decorative Hearts */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="heart-decoration top-10 left-10">💕</div>
        <div className="heart-decoration top-32 right-16 text-xl">💗</div>
        <div className="heart-decoration bottom-40 left-20 text-3xl">💖</div>
        <div className="heart-decoration bottom-20 right-12 text-2xl">💝</div>
      </div>

      {/* Header */}
      <div className="relative z-10 text-center pt-16 px-6">
        <div className="w-32 h-32 mx-auto mb-6 rounded-full romantic-gradient p-1">
          <img 
            src="https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300" 
            alt="Romantic couple silhouette" 
            className="w-full h-full rounded-full object-cover"
          />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-primary mb-4">MindTalks 💬</h1>
        <p className="text-lg md:text-xl text-gray-600 mb-12 max-w-md mx-auto">
          AI-powered emotional support & conversation. 100% fictional, safe, and respectful.
        </p>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-6 py-8">
        <Card className="w-full max-w-md bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/50">
          <CardContent className="p-8">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6">
              <Button 
                onClick={handleStartNow}
                className="w-full romantic-gradient text-white font-semibold py-4 px-8 rounded-2xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 text-lg"
              >
                Start Chat Now 💬
              </Button>
              
              {/* About Us Link */}
              <div className="mt-4 text-center">
                <PolicyModal title="About Us" content={aboutUsContent} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="relative z-10 bg-white/50 backdrop-blur-sm border-t border-white/50 px-6 py-6 mt-16">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm text-gray-600 mb-4">
            <PolicyModal title="Terms and Conditions" content={termsAndConditionsContent} />
            <PolicyModal title="Privacy Policy" content={privacyPolicyContent} />
            <PolicyModal title="Refund Policy" content={refundPolicyContent} />
            <PolicyModal title="Pricing" content={pricingContent} />
            <div className="hover:text-primary flex items-center gap-1 cursor-pointer" onClick={() => {
              navigator.clipboard.writeText('mindtalks.ai@gmail.com');
              alert('Email copied: mindtalks.ai@gmail.com');
            }}>
              <Mail className="w-4 h-4" />
              mindtalks.ai@gmail.com
            </div>
          </div>
          <p className="text-xs text-gray-500 text-center">
            <strong>Disclaimer:</strong> AI-powered fictional companion platform for emotional entertainment only. No real humans are involved. No adult or sexual content allowed. All payments are non-refundable and for digital access only.
          </p>
        </div>
      </footer>


    </div>
  );
}

function PolicyModal({ title, content }: { title: string; content: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="hover:text-primary text-left">{title}</button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-primary">{title}</DialogTitle>
        </DialogHeader>
        <div className="prose max-w-none text-gray-600" dangerouslySetInnerHTML={{ __html: content }} />
      </DialogContent>
    </Dialog>
  );
}

const privacyPolicyContent = `
  <h4 class="font-semibold mb-2">Information We Collect</h4>
  <p class="mb-4">We collect minimal information necessary to provide our AI companion service, including your username and account details.</p>
  
  <h4 class="font-semibold mb-2">Conversation Privacy</h4>
  <p class="mb-4">No chat history is stored. All conversations are session-based and temporary. We do not store conversation data. All chats are temporary and session-based only. Once you end a chat, the conversation is not retained.</p>
  
  <h4 class="font-semibold mb-2">Payment Security</h4>
  <p class="mb-4">Payments are securely handled via Razorpay. No card or payment data is stored by us.</p>
  
  <h4 class="font-semibold mb-2">How We Use Your Information</h4>
  <p class="mb-4">Your account information is used solely to provide our AI conversation service. We do not share your personal information with any third parties.</p>
  
  <h4 class="font-semibold mb-2">Data Security</h4>
  <p class="mb-4">We implement appropriate security measures to protect your account information. Since conversations are not stored, your chat privacy is automatically maintained.</p>
`;

const refundPolicyContent = `
  <h4 class="font-semibold mb-2">No Refund Policy</h4>
  <p class="mb-4">All payments made for coins and premium features are final and non-refundable.</p>
  
  <h4 class="font-semibold mb-2">Service Availability</h4>
  <p class="mb-4">We strive to maintain 99% uptime, but cannot guarantee uninterrupted service.</p>
  
  <h4 class="font-semibold mb-2">Contact</h4>
  <p class="mb-4">For any payment-related queries, please contact us at mindtalks.ai@gmail.com</p>
`;

const termsAndConditionsContent = `
  <h4 class="font-semibold mb-2 text-red-600">ENTERTAINMENT PURPOSE ONLY</h4>
  <p class="mb-4">This platform offers gamified, AI-driven fictional characters for casual emotional conversation. It does NOT offer dating, therapy, adult services, or real relationships.</p>
  
  <p class="mb-4 font-semibold text-red-600">This is a GAMIFIED ENTERTAINMENT PLATFORM designed solely for recreational purposes. This service provides simulated conversations with AI-powered virtual characters for entertainment and casual conversation practice.</p>
  
  <p class="mb-4 font-semibold text-red-600">This platform does NOT provide real relationships, emotional therapy, medical advice, or genuine human interaction.</p>
  
  <h4 class="font-semibold mb-2 text-pink-600">Key Terms:</h4>
  <ul class="mb-4 list-disc pl-6">
    <li>Users must be 18+ years</li>
    <li>All conversations are fictional and AI-generated</li>
    <li>Sexual/abusive content is strictly prohibited</li>
    <li>Coin = 1 message; coins are non-refundable</li>
    <li>Service may not be available 24/7</li>
  </ul>
  
  <h4 class="font-semibold mb-2 text-pink-600">DISCLAIMERS:</h4>
  <ul class="mb-4 list-disc pl-6">
    <li>AI responses are generated by algorithms and may be inaccurate</li>
    <li>Cannot replace real human relationships or professional counseling</li>
    <li>Users should maintain healthy boundaries with AI interactions</li>
    <li>Seek professional help for serious emotional concerns</li>
    <li><strong class="text-red-600">Sexual conversations are strictly against Indian law and are prohibited on this website</strong></li>
  </ul>
  
  <p class="text-xs text-gray-500">Last updated: July 2, 2025</p>
`;
