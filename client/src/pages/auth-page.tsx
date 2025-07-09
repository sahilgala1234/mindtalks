import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Heart, Shield, Users } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useEffect, useState } from "react";
import { TermsDialog } from "@/components/terms-dialog";

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [showTerms, setShowTerms] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    if (user) {
      setLocation("/dashboard");
    }
  }, [user, setLocation]);

  const loginForm = useForm({
    resolver: zodResolver(insertUserSchema.pick({ username: true, password: true })),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm({
    resolver: zodResolver(insertUserSchema.pick({ username: true, password: true })),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onLogin = (data: any) => {
    loginMutation.mutate(data);
  };

  const onRegister = (data: any) => {
    if (!termsAccepted) {
      return;
    }
    registerMutation.mutate({
      ...data,
      termsAccepted: true
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-pink-100 flex">
      {/* Left side - Forms */}
      <div className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-md">
          <Button
            variant="ghost"
            onClick={() => setLocation("/")}
            className="mb-6 text-gray-600 hover:text-primary"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </Button>

          <Card className="shadow-xl rounded-3xl border-0">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-3xl font-bold text-primary mb-2">
                Welcome to MindTalks
              </CardTitle>
              <p className="text-gray-600">Your AI companion awaits 💖</p>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login">Sign In</TabsTrigger>
                  <TabsTrigger value="register">Create Account</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-6">
                      <FormField
                        control={loginForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                className="rounded-xl border-2 focus:border-primary"
                                disabled={loginMutation.isPending}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="password" 
                                className="rounded-xl border-2 focus:border-primary"
                                disabled={loginMutation.isPending}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="submit" 
                        className="w-full romantic-gradient text-white font-semibold py-3 rounded-xl text-lg"
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? "Signing In..." : "Sign In 💕"}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>

                <TabsContent value="register">
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-6">
                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Choose Username</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                className="rounded-xl border-2 focus:border-primary"
                                disabled={registerMutation.isPending}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Create Password</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="password" 
                                className="rounded-xl border-2 focus:border-primary"
                                disabled={registerMutation.isPending}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex items-start space-x-2 py-2">
                        <input
                          type="checkbox"
                          id="terms-checkbox"
                          checked={termsAccepted}
                          onChange={(e) => setTermsAccepted(e.target.checked)}
                          className="mt-1"
                          required
                        />
                        <label htmlFor="terms-checkbox" className="text-sm text-gray-600">
                          I agree to the{" "}
                          <button
                            type="button"
                            onClick={() => setShowTerms(true)}
                            className="text-pink-600 hover:text-pink-700 underline"
                          >
                            Terms and Conditions
                          </button>
                        </label>
                      </div>
                      
                      <Button 
                        type="submit" 
                        className="w-full romantic-gradient text-white font-semibold py-3 rounded-xl text-lg"
                        disabled={registerMutation.isPending || !termsAccepted}
                      >
                        {registerMutation.isPending ? "Creating Account..." : "Create Account 🎉"}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right side - Hero section */}
      <div className="hidden lg:flex flex-1 items-center justify-center p-8 bg-gradient-to-br from-primary/10 to-primary/5">
        <div className="max-w-md text-center">
          <div className="w-48 h-48 mx-auto mb-8 rounded-full romantic-gradient p-2">
            <img 
              src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400" 
              alt="Beautiful romantic scene" 
              className="w-full h-full rounded-full object-cover"
            />
          </div>
          <h2 className="text-3xl font-bold text-primary mb-4">
            Your Perfect Companion Awaits
          </h2>
          <p className="text-gray-600 mb-8 text-lg">
            Connect with AI girlfriends who understand you, support you, and are always there when you need them.
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3 text-gray-600">
              <Heart className="w-5 h-5 text-primary" />
              <span>Emotional connection and support</span>
            </div>
            <div className="flex items-center justify-center gap-3 text-gray-600">
              <Shield className="w-5 h-5 text-primary" />
              <span>Safe, respectful conversations</span>
            </div>
            <div className="flex items-center justify-center gap-3 text-gray-600">
              <Users className="w-5 h-5 text-primary" />
              <span>Multiple unique personalities</span>
            </div>
          </div>
        </div>
      </div>
      
      <TermsDialog
        open={showTerms}
        onAccept={() => setShowTerms(false)}
        onDecline={() => setShowTerms(false)}
      />
    </div>
  );
}
