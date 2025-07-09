import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Coins, CreditCard, CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MobileAuthCheck } from "@/components/mobile-auth-check";
import { AuthDiagnostic } from "@/components/auth-diagnostic";

// Payment plans
const paymentPlans = [
  {
    id: "plan_10",
    coins: 10,
    price: 10,
    label: "Starter Pack",
    popular: false,
    color: "bg-blue-500 hover:bg-blue-600"
  },
  {
    id: "plan_20", 
    coins: 20,
    price: 20,
    label: "Popular Choice",
    popular: true,
    color: "bg-pink-500 hover:bg-pink-600"
  },
  {
    id: "plan_50",
    coins: 50,
    price: 50,
    label: "Best Value",
    popular: false,
    color: "bg-green-500 hover:bg-green-600"
  },
  {
    id: "plan_100",
    coins: 100,
    price: 100,
    label: "Premium Pack",
    popular: false,
    color: "bg-purple-500 hover:bg-purple-600"
  }
];

export default function PaymentPage() {
  const [, setLocation] = useLocation();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Get user data for current coin balance
  const { data: userData } = useQuery<{ coins: number }>({
    queryKey: ["/api/user"],
    enabled: !!user,
  });

  // Payment creation mutation
  const createPaymentMutation = useMutation({
    mutationFn: async (planId: string) => {
      const selectedPlanData = paymentPlans.find(p => p.id === planId);
      if (!selectedPlanData) throw new Error("Invalid plan selected");

      // No authentication required for payments
      console.log('Payment attempt - Guest mode:', { 
        userAgent: navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'
      });

      const res = await apiRequest("POST", "/api/payments/create", {
        amount: selectedPlanData.price,
        coins: selectedPlanData.coins,
        planId: planId
      });
      return res.json();
    },
    onSuccess: (data) => {
      // Use Razorpay checkout for payment processing
      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: 'MindTalks',
        description: `${data.coins || paymentPlans.find(p => p.id === selectedPlan)?.coins} Coins Purchase`,
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
          email: 'user@mindtalks.ai'
        },
        theme: {
          color: '#ec4899'
        },
        modal: {
          ondismiss: function() {
            setIsProcessing(false);
            setSelectedPlan(null);
          }
        }
      };

      // Create Razorpay instance and open checkout
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
      
      setIsProcessing(true);
    },
    onError: (error: any) => {
      setIsProcessing(false);
      setSelectedPlan(null);
      
      console.error('Payment creation failed:', error);
      
      // Check if it's an authentication error
      if (error.message?.includes('401') || error.message?.includes('Authentication required') || error.message?.includes('Unauthorized')) {
        toast({
          title: "Login Required",
          description: "Please log in again to continue with payment.",
          variant: "destructive",
        });
        setTimeout(() => setLocation('/auth'), 2000);
      } else {
        toast({
          title: "Payment Error",
          description: error.message || "Failed to initiate payment. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  // Payment verification mutation
  const verifyPaymentMutation = useMutation({
    mutationFn: async (paymentData: any) => {
      const res = await apiRequest("POST", "/api/payments/verify", paymentData);
      return res.json();
    },
    onSuccess: (data) => {
      setIsProcessing(false);
      setSelectedPlan(null);
      
      toast({
        title: "Payment Successful!",
        description: `You received ${data.coinsAdded} coins. New balance: ${data.newBalance} coins`,
      });
      
      // Update the user's coin balance in the query cache
      queryClient.setQueryData(["/api/user"], (oldUser: any) => ({
        ...oldUser,
        coins: data.newBalance
      }));
      
      // Redirect to dashboard after success
      setTimeout(() => {
        setLocation("/dashboard");
      }, 2000);
    },
    onError: (error: any) => {
      setIsProcessing(false);
      setSelectedPlan(null);
      
      toast({
        title: "Payment Verification Failed",
        description: "Payment completed but verification failed. Contact support if coins weren't added.",
        variant: "destructive",
      });
    },
  });

  const handlePayment = (planId: string) => {
    setSelectedPlan(planId);
    createPaymentMutation.mutate(planId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-pink-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => setLocation("/dashboard")}
            className="mb-4 text-pink-600 hover:text-pink-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Buy Coins
            </h1>
            <p className="text-gray-600 mb-4">
              Choose your coin package and continue chatting with your AI companion
            </p>
            
            <div className="inline-flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-sm border">
              <Coins className="w-4 h-4 text-yellow-500" />
              <span className="font-medium text-gray-700">
                No login required - Direct payment
              </span>
            </div>
          </div>
        </div>



        {/* Payment Plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {paymentPlans.map((plan) => (
            <Card 
              key={plan.id} 
              className={`relative shadow-lg border-2 transition-all hover:shadow-xl ${
                plan.popular 
                  ? 'border-pink-300 ring-2 ring-pink-100' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-pink-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
              )}
              
              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-3">
                  <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 p-3 rounded-full">
                    <Coins className="w-6 h-6 text-white" />
                  </div>
                </div>
                <CardTitle className="text-lg font-bold text-gray-800">
                  {plan.label}
                </CardTitle>
                <div className="text-3xl font-bold text-gray-900 mt-2">
                  ₹{plan.price}
                </div>
              </CardHeader>
              
              <CardContent className="text-center">
                <div className="mb-4">
                  <div className="text-2xl font-bold text-pink-600 mb-1">
                    {plan.coins} Coins
                  </div>
                  <div className="text-sm text-gray-500">
                    ₹{plan.price / plan.coins} per coin
                  </div>
                </div>
                
                <div className="space-y-2 mb-6 text-sm text-gray-600">
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>{plan.coins} voice/text messages</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Instant delivery</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>No expiry</span>
                  </div>
                </div>
                
                <Button
                  onClick={() => handlePayment(plan.id)}
                  disabled={createPaymentMutation.isPending && selectedPlan === plan.id}
                  className={`w-full text-white font-medium ${plan.color}`}
                >
                  {createPaymentMutation.isPending && selectedPlan === plan.id ? (
                    "Processing..."
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Buy Now
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Payment Processing Status */}
        {(isProcessing || createPaymentMutation.isPending || verifyPaymentMutation.isPending) && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="text-center py-6">
              <div className="text-blue-600 mb-2">
                <CreditCard className="w-8 h-8 mx-auto mb-2" />
                <h3 className="font-semibold">
                  {createPaymentMutation.isPending ? "Initializing Payment..." : 
                   verifyPaymentMutation.isPending ? "Verifying Payment..." : 
                   "Payment in Progress"}
                </h3>
              </div>
              <p className="text-blue-700 text-sm">
                {createPaymentMutation.isPending ? "Setting up your payment with Razorpay..." :
                 verifyPaymentMutation.isPending ? "Confirming your payment and adding coins..." :
                 "Complete your payment in the Razorpay checkout. Your coins will be added automatically."}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Payment Info */}
        <Card className="border-gray-200 bg-gray-50">
          <CardContent className="text-center py-4">
            <p className="text-gray-600 text-sm">
              Secure payments powered by Razorpay • All transactions are encrypted and safe
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}