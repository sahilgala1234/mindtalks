import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Coins, CreditCard, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";

export default function PaymentPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentOpened, setPaymentOpened] = useState(false);
  const [alternativeLinks, setAlternativeLinks] = useState<string[]>([]);

  // Payment verification mutation - needs to be defined first
  const verifyPaymentMutation = useMutation({
    mutationFn: async (paymentData: any) => {
      const res = await apiRequest("POST", "/api/payments/verify", paymentData);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Payment Successful!",
        description: `You received ${data.coinsAdded} coins. New balance updated!`,
      });
      
      // Redirect to dashboard after success
      setTimeout(() => {
        setLocation("/dashboard");
      }, 2000);
    },
    onError: (error: Error) => {
      toast({
        title: "Payment Verification Failed",
        description: "Payment completed but verification failed. Contact support.",
        variant: "destructive",
      });
    },
  });

  const createPaymentMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/payments/create", {
        amount: 1,
        currency: "INR"
      });
      return res.json();
    },
    onSuccess: (data) => {
      // Use Razorpay checkout for dynamic payment processing
      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: 'AIpremika',
        description: '10 Coins for AI Girlfriend Chat',
        order_id: data.orderId,
        handler: function (response: any) {
          // Payment successful - verify on server
          verifyPaymentMutation.mutate({
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature
          });
        },
        prefill: {
          name: user?.username || 'User',
          email: 'user@example.com'
        },
        theme: {
          color: '#ec4899'
        }
      };

      // Create Razorpay instance and open checkout
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
      
      setIsProcessing(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Payment Error",
        description: error.message,
        variant: "destructive",
      });
      setIsProcessing(false);
    },
  });

  const verifyPaymentMutation = useMutation({
    mutationFn: async (paymentData: any) => {
      const res = await apiRequest("POST", "/api/payments/verify", paymentData);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Payment Successful!",
        description: `You received ${data.coinsAdded} coins. New balance updated!`,
      });
      
      // Redirect to dashboard after success
      setTimeout(() => {
        setLocation("/dashboard");
      }, 2000);
    },
    onError: (error: Error) => {
      toast({
        title: "Payment Verification Failed",
        description: "Payment completed but verification failed. Contact support.",
        variant: "destructive",
      });
    },
  });

  const completePaymentMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/payments/complete", {
        paymentId: Date.now().toString()
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Coins Added Successfully!",
        description: `You received ${data.coinsAdded} coins. New balance: ${data.newBalance} coins`,
      });
      
      // Redirect to dashboard after success
      setTimeout(() => {
        setLocation("/dashboard");
      }, 2000);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to add coins. Please try again or contact support.",
        variant: "destructive",
      });
    },
  });

  const handlePayment = () => {
    setIsProcessing(true);
    createPaymentMutation.mutate();
  };

  const handlePaymentComplete = () => {
    completePaymentMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-pink-100 flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <Button
          variant="ghost"
          onClick={() => setLocation("/dashboard")}
          className="mb-6 text-gray-600 hover:text-primary"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Dashboard
        </Button>

        <Card className="shadow-xl rounded-3xl border-0">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Coins className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold text-pink-600 mb-2">
              💰 Get More Coins
            </CardTitle>
            <p className="text-gray-600">
              Continue chatting with your AI girlfriend
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="bg-gradient-to-r from-red-100 to-pink-100 p-4 rounded-lg border-2 border-red-200">
              <div className="flex items-center justify-center mb-2">
                <span className="font-semibold text-red-600">🔥 LIMITED TIME OFFER!</span>
              </div>
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="text-lg text-gray-500 line-through">₹100</span>
                <span className="text-3xl font-bold text-red-600">₹1</span>
                <span className="text-lg text-gray-600">= 10 Coins</span>
              </div>
              <p className="text-sm text-green-600 font-medium text-center">99% OFF - Save ₹99!</p>
            </div>
            
            {/* Active Package Display */}
            <Card className="border-2 border-pink-300 bg-gradient-to-r from-pink-50 to-purple-50 relative overflow-hidden">
              <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                99% OFF
              </div>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-pink-600 text-lg">10 Coins</p>
                    <p className="text-sm text-gray-600">10 messages with AI girlfriend</p>
                    <p className="text-xs text-gray-500 font-medium">Current balance: {user?.coins || 0} coins</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg text-gray-400 line-through">₹100</span>
                      <span className="text-3xl font-bold text-red-600">₹1</span>
                    </div>
                    <Button
                      disabled={isProcessing || createPaymentMutation.isPending}
                      onClick={handlePayment}
                      className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white px-6 py-2 rounded-xl font-medium"
                    >
                      {isProcessing || createPaymentMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4 mr-2" />
                          Pay Now ₹1
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {paymentOpened && (
              <Card className="border-2 border-green-300 bg-green-50">
                <CardContent className="p-4 text-center space-y-3">
                  <p className="text-green-700 font-medium">
                    ✅ Payment link opened!
                  </p>
                  
                  <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                    <p className="text-yellow-800 text-sm mb-2">
                      ⚠️ If payment link shows "Already Paid":
                    </p>
                    <div className="space-y-2">
                      <Button 
                        onClick={handlePayment}
                        disabled={isProcessing || createPaymentMutation.isPending}
                        className="w-full bg-blue-500 hover:bg-blue-600 text-white text-sm"
                      >
                        Generate Fresh Payment Link
                      </Button>
                      
                      {alternativeLinks.length > 0 && (
                        <div className="border-t pt-2">
                          <p className="text-xs text-gray-600 mb-2">Alternative Payment Links:</p>
                          {alternativeLinks.map((link, index) => (
                            <Button
                              key={index}
                              onClick={() => window.open(link, '_blank')}
                              className="w-full mb-1 bg-gray-500 hover:bg-gray-600 text-white text-xs"
                            >
                              Payment Option {index + 2}
                            </Button>
                          ))}
                        </div>
                      )}
                      
                      <div className="border-t pt-2">
                        <p className="text-xs text-gray-600 mb-1">
                          <strong>Manual Payment Option:</strong>
                        </p>
                        <p className="text-xs text-gray-600">
                          Send ₹1 to UPI ID: <strong>your-upi@payment</strong>
                        </p>
                        <p className="text-xs text-gray-500">
                          (Contact support if needed)
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handlePaymentComplete}
                    disabled={completePaymentMutation.isPending}
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold"
                  >
                    {completePaymentMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Adding Coins...
                      </>
                    ) : (
                      "I Completed Payment - Add My Coins!"
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            <div className="text-xs text-gray-500 text-center mt-4 space-y-2">
              <p>✓ Secure payment via Razorpay</p>
              <p>✓ Manual coin delivery after payment completion</p>
              <p>✓ Continue unlimited conversations</p>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}