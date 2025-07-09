import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Smartphone, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export function AuthDiagnostic() {
  const { user } = useAuth();
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    setAuthToken(token);
    setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
  }, []);

  const refreshStatus = () => {
    const token = localStorage.getItem('authToken');
    setAuthToken(token);
  };

  const clearAuthData = () => {
    localStorage.removeItem('authToken');
    setAuthToken(null);
    window.location.reload();
  };

  return (
    <Card className="border-blue-200 bg-blue-50 mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-blue-800 text-sm flex items-center gap-2">
          <Smartphone className="w-4 h-4" />
          Authentication Diagnostic
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-blue-700">User Session:</span>
          <div className="flex items-center gap-1">
            {user ? <CheckCircle className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
            <span className={user ? "text-green-700" : "text-red-700"}>
              {user ? "Active" : "None"}
            </span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-blue-700">Auth Token:</span>
          <div className="flex items-center gap-1">
            {authToken ? <CheckCircle className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
            <span className={authToken ? "text-green-700" : "text-red-700"}>
              {authToken ? "Present" : "Missing"}
            </span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-blue-700">Device Type:</span>
          <span className="text-blue-800">{isMobile ? "Mobile" : "Desktop"}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-blue-700">Payment Ready:</span>
          <div className="flex items-center gap-1">
            {(user || authToken) ? <CheckCircle className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
            <span className={(user || authToken) ? "text-green-700" : "text-red-700"}>
              {(user || authToken) ? "Yes" : "No"}
            </span>
          </div>
        </div>

        <div className="pt-2 space-y-2">
          <div className="flex gap-2">
            <Button onClick={refreshStatus} size="sm" variant="outline" className="text-xs">
              <RefreshCw className="w-3 h-3 mr-1" />
              Refresh
            </Button>
            {isMobile && !authToken && (
              <Button onClick={clearAuthData} size="sm" variant="outline" className="text-xs bg-orange-100 border-orange-300">
                Clear & Reload
              </Button>
            )}
          </div>
          
          {isMobile && !authToken && (
            <div className="text-xs text-orange-700 bg-orange-100 p-2 rounded">
              <strong>Mobile Fix:</strong> Clear browser cache, log in again, then try payment
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}