import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AvatarModal } from "@/components/avatar-modal";
import { Coins, LogOut, CreditCard, Maximize2, RefreshCw } from "lucide-react";
import { Character } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function DashboardPage() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);

  const { data: characters, isLoading } = useQuery<Character[]>({
    queryKey: ["/api/characters"],
  });

  const handleStartChat = (characterKey: string) => {
    console.log('Starting chat with character:', characterKey);
    console.log('Current location before redirect:', window.location.pathname);
    setLocation(`/chat/${characterKey}`);
    console.log('Location set to:', `/chat/${characterKey}`);
    // Force navigation if setLocation doesn't work
    setTimeout(() => {
      if (window.location.pathname === '/dashboard') {
        console.log('Fallback: Using window.location.href');
        window.location.href = `/chat/${characterKey}`;
      }
    }, 100);
  };

  const handleSignOut = () => {
    logoutMutation.mutate();
    setLocation("/");
  };

  const handleRefreshCoins = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Coins Refreshed",
        description: "Your coin balance has been updated",
      });
    } catch (error) {
      toast({
        title: "Refresh Failed", 
        description: "Could not update coin balance",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-pink-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-pink-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-white/50 px-6 py-4 sticky top-0 z-50">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div>
            <h1 className="text-xl font-bold text-primary">
              Welcome back, {user?.username}! 💖
            </h1>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Coins className="w-4 h-4 text-primary" />
              <span>Coins: {user?.coins || 0}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshCoins}
                disabled={isRefreshing}
                className="text-xs ml-2"
              >
                <RefreshCw className={`w-3 h-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Updating...' : 'Refresh'}
              </Button>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Button 
              onClick={() => setLocation("/payment")}
              className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Buy Coins
            </Button>
            <Button 
              onClick={handleSignOut}
              variant="ghost"
              size="sm"
              className="text-gray-600 hover:text-primary"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* AI Companions Grid */}
      <div className="px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-primary mb-2 text-center">
            Choose your AI Companion
          </h2>
          <p className="text-gray-600 mb-8 text-center">
            Each one has a unique personality just for you 💕
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {characters?.map((character) => (
              <Card key={character.id} className="character-card">
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center">
                    <div className="relative group">
                      <img 
                        src={character.avatar} 
                        alt={character.name}
                        className="w-20 h-20 rounded-full mb-4 object-cover border-4 border-primary/20 cursor-pointer hover:scale-105 transition-all duration-200"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCharacter(character);
                          setShowAvatarModal(true);
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Maximize2 className="w-5 h-5 text-white bg-black/50 rounded-full p-1" />
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-primary mb-2">
                      {character.name}
                    </h3>
                    <p className="text-gray-600 mb-4 text-sm">
                      "{character.intro}"
                    </p>
                    <Badge variant="secondary" className="mb-4 text-xs">
                      {character.personality}
                    </Badge>
                    <Button 
                      onClick={() => {
                        console.log('Redirecting to chat with:', character.key);
                        handleStartChat(character.key);
                      }}
                      className="w-full romantic-gradient text-white font-medium py-3 rounded-xl hover:shadow-lg transition-all"
                    >
                      Chat Now 💬
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Avatar View Dialog */}
          <Dialog open={!!selectedAvatar} onOpenChange={() => setSelectedAvatar(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Profile Picture</DialogTitle>
              </DialogHeader>
              <div className="flex justify-center">
                <img 
                  src={selectedAvatar || ""} 
                  alt="AI Character"
                  className="w-80 h-80 rounded-lg object-cover"
                />
              </div>
            </DialogContent>
          </Dialog>

          {(!characters || characters.length === 0) && (
            <div className="text-center py-12">
              <p className="text-gray-500">No AI characters available at the moment.</p>
            </div>
          )}
        </div>
      </div>

      {/* Avatar Modal */}
      {selectedCharacter && (
        <AvatarModal
          isOpen={showAvatarModal}
          onClose={() => {
            setShowAvatarModal(false);
            setSelectedCharacter(null);
          }}
          character={selectedCharacter}
        />
      )}
    </div>
  );
}
