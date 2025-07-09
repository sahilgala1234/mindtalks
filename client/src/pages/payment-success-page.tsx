import { useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Loader2 } from "lucide-react";

export default function PaymentSuccessPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    // Clear any payment flags
    localStorage.removeItem('paymentInProgress');
    
    // Show success message
    toast({
      title: "Payment Successful! 🎉",
      description: "Your coins have been added. Redirecting to dashboard...",
    });

    // Redirect to dashboard after 2 seconds
    const timer = setTimeout(() => {
      setLocation("/dashboard");
    }, 2000);

    return () => clearTimeout(timer);
  }, [toast, setLocation]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center">
        <div className="mb-6">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Payment Successful!
          </h1>
          <p className="text-gray-600">
            Your coins have been added successfully. You'll be redirected to the dashboard shortly.
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Redirecting to dashboard...</span>
        </div>
      </div>
    </div>
  );
}