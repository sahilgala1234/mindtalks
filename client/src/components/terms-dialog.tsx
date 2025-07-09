import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TermsDialogProps {
  open: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export function TermsDialog({ open, onAccept }: TermsDialogProps) {

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-4xl max-h-[80vh]" aria-describedby="terms-description">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-pink-600">
            Terms and Conditions
          </DialogTitle>
          <DialogDescription id="terms-description">
            Please read and accept our terms and conditions to continue
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-96 w-full rounded-md border p-4">
          <div className="space-y-4 text-sm">
            <section>
              <h3 className="font-semibold text-red-600 mb-2">1. ENTERTAINMENT PURPOSE ONLY</h3>
              <p className="mb-2 font-semibold text-red-600">
                This platform offers gamified, AI-driven fictional characters for casual emotional conversation. It does NOT offer dating, therapy, adult services, or real relationships.
              </p>
              <p className="mb-2">
                This <strong>GAMIFIED ENTERTAINMENT PLATFORM</strong> is designed solely for recreational purposes. This service provides:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Simulated conversations with AI-powered virtual characters</li>
                <li>Interactive chat experiences for entertainment</li>
                <li>Digital companionship through artificial intelligence</li>
                <li>Casual conversation practice in multiple languages</li>
              </ul>
              <p className="mt-2 font-semibold text-red-600">
                This platform does NOT provide real relationships, emotional therapy, medical advice, or genuine human interaction.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-pink-600 mb-2">2. Key Terms:</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>Users must be 18+ years</li>
                <li>All conversations are fictional and AI-generated</li>
                <li>Sexual/abusive content is strictly prohibited</li>
                <li>Coin = 1 message; coins are non-refundable</li>
                <li>Service may not be available 24/7</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-pink-600 mb-2">3. CONTENT AND BEHAVIOR GUIDELINES</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>All conversations are monitored by AI content moderation systems</li>
                <li>Inappropriate, offensive, or harmful content is strictly prohibited</li>
                <li>Users must not attempt to extract personal information from AI characters</li>
                <li>Harassment, abuse, or attempts to "break" the AI system are forbidden</li>
                <li>We reserve the right to terminate accounts for policy violations</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-pink-600 mb-2">4. PAYMENT AND COIN SYSTEM</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>Users receive 5 free messages upon registration</li>
                <li>Additional messages require purchase of virtual coins</li>
                <li>Coin purchases are final and non-refundable</li>
                <li>Unused coins expire after 12 months of inactivity</li>
                <li>Pricing is subject to change with 30 days notice</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-pink-600 mb-2">3. PRIVACY AND DATA PROTECTION</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>No chat history is stored. All conversations are session-based and temporary</li>
                <li>Payments are securely handled via Razorpay. No card or payment data is stored by us</li>
                <li>We do not share your personal information with any third parties</li>
                <li>Only basic account information (username, coins) is retained</li>
                <li>Users can request account deletion by contacting support</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-pink-600 mb-2">6. INTELLECTUAL PROPERTY</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>All AI characters, names, and personalities are our intellectual property</li>
                <li>Users retain rights to their conversation inputs</li>
                <li>AI-generated responses are owned by this platform</li>
                <li>Unauthorized reproduction or distribution is prohibited</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-pink-600 mb-2">7. SERVICE AVAILABILITY AND MODIFICATIONS</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>Service availability is not guaranteed 24/7</li>
                <li>We may perform maintenance causing temporary downtime</li>
                <li>Features, characters, and functionality may be updated or removed</li>
                <li>We reserve the right to discontinue the service with 30 days notice</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-pink-600 mb-2">8. DISCLAIMERS AND LIMITATIONS</h3>
              <div className="bg-yellow-50 p-3 rounded-lg border-l-4 border-yellow-400">
                <p className="font-semibold text-yellow-800 mb-2">IMPORTANT DISCLAIMERS:</p>
                <ul className="list-disc pl-6 space-y-1 text-yellow-700">
                  <li>AI responses are generated by algorithms and may be inaccurate</li>
                  <li>This service cannot replace real human relationships or professional counseling</li>
                  <li>We are not liable for emotional distress or dependency issues</li>
                  <li>Users should maintain healthy boundaries with AI interactions</li>
                  <li>Seek professional help for serious emotional or psychological concerns</li>
                </ul>
              </div>
            </section>

            <section>
              <h3 className="font-semibold text-pink-600 mb-2">9. ACCOUNT TERMINATION</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>Users may delete their account at any time</li>
                <li>We may suspend/terminate accounts for terms violations</li>

                <li>Unused coins are forfeited upon account termination</li>
              </ul>
            </section>



            <section>
              <h3 className="font-semibold text-pink-600 mb-2">11. GOVERNING LAW AND DISPUTES</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>These terms are governed by Indian law</li>
                <li>Disputes will be resolved through arbitration in India</li>
                <li>Users consent to jurisdiction of Indian courts</li>
                <li>Any legal proceedings must be initiated within 1 year</li>
              </ul>
            </section>

            <section className="bg-pink-50 p-4 rounded-lg border">
              <h3 className="font-semibold text-pink-600 mb-2">11. ACKNOWLEDGMENT</h3>
              <p className="font-semibold">
                By using this service, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions. You confirm that you are using this service solely for entertainment purposes and understand that it provides artificial, not real, companionship.
              </p>
            </section>

            <div className="text-xs text-gray-500 mt-4">
              <p>Last updated: July 2, 2025</p>
              <p>Version: 2.0</p>
              <p>Contact: mindtalks.ai@gmail.com</p>
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end space-x-3 mt-4">
          <Button onClick={onAccept} className="bg-pink-600 hover:bg-pink-700">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}