import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface AvatarModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: {
    name: string;
    avatar: string;
    intro?: string;
  };
}

export function AvatarModal({ isOpen, onClose, character }: AvatarModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-white rounded-2xl">
        <DialogHeader className="relative p-4 pb-2">
          <DialogTitle className="text-center text-lg font-semibold text-primary">
            {character.name}
          </DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute right-2 top-2 h-8 w-8 rounded-full"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        
        <div className="px-4 pb-4">
          <div className="relative w-full aspect-square mb-4 rounded-xl overflow-hidden">
            <img
              src={character.avatar}
              alt={character.name}
              className="w-full h-full object-cover"
              style={{ 
                filter: 'brightness(1.05) contrast(1.1)',
                transition: 'all 0.3s ease'
              }}
            />
          </div>
          
          {character.intro && (
            <div className="bg-pink-50 rounded-lg p-3">
              <p className="text-sm text-gray-700 leading-relaxed">
                {character.intro}
              </p>
            </div>
          )}
          
          <Button
            onClick={onClose}
            className="w-full mt-4 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}