import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Smartphone, Wifi } from "lucide-react";
import { useEffect, useState } from "react";

interface MobileAuthCheckProps {
  onAuthRequired?: () => void;
}

export function MobileAuthCheck({ onAuthRequired }: MobileAuthCheckProps) {
  const { user } = useAuth();
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if device is mobile
    const userAgent = navigator.userAgent;
    const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    setIsMobile(mobile);

    // Get current auth token
    const token = localStorage.getItem('authToken');
    setAuthToken(token);
  }, []);

  // Don't show anything if user has both session and token
  if (user && authToken) return null;

  // Don't show for desktop users - they use session auth
  if (!isMobile) return null;

  // Show warning for mobile users without proper authentication
  if (isMobile && (!user || !authToken)) {
    return (
      <Card className="border-orange-200 bg-orange-50 mb-4">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-orange-800 font-medium text-sm">
                Mobile Authentication Issue Detected
              </h3>
              <p className="text-orange-700 text-sm mt-1">
                To ensure payments work on mobile, please:
              </p>
              <div className="mt-2 space-y-1 text-xs text-orange-600">
                <div className="flex items-center space-x-2">
                  <Smartphone className="w-3 h-3" />
                  <span>1. Clear your browser cache</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Wifi className="w-3 h-3" />
                  <span>2. Refresh this page</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>🔄</span>
                  <span>3. Log in again</span>
                </div>
              </div>
              {onAuthRequired && (
                <Button
                  onClick={onAuthRequired}
                  size="sm"
                  className="mt-3 bg-orange-600 hover:bg-orange-700 text-white"
                >
                  Re-authenticate Now
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}