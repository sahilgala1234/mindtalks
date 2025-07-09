import Razorpay from "razorpay";

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

// Enhanced environment check
if (!keyId || !keySecret) {
  const errorMessage = "Payment system disabled - no credentials loaded";
  console.error(errorMessage);
  console.log("Current environment variables:", {
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID ? "exists" : "missing",
    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET ? "exists" : "missing",
    NODE_ENV: process.env.NODE_ENV,
  });
  throw new Error(errorMessage);
} else {
  console.log(
    "Payment system enabled with credentials:",
    keyId.substring(0, 10) + "...",
  );
  console.log(
    "Razorpay environment:",
    keyId.startsWith("rzp_live_") ? "PRODUCTION" : "TEST",
  );
}

export const razorpayInstance = new Razorpay({
  key_id: keyId,
  key_secret: keySecret,
});

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
}

export async function createRazorpayOrder(
  amount: number,
  receipt: string,
): Promise<RazorpayOrder> {
  // Validate amount (must be in paise and at least 100 paise = ₹1)
  if (amount < 100) {
    throw new Error("Amount must be at least 100 paise (₹1)");
  }

  try {
    console.log("Creating Razorpay order with amount:", amount, "paise");

    const options = {
      amount: amount,
      currency: "INR",
      receipt: receipt,
      payment_capture: 1, // Auto-capture payments
      notes: {
        purpose: "AI Girlfriend Coins Purchase",
        coins: "10",
      },
    };

    const order = await razorpayInstance.orders.create(options);
    console.log("Razorpay order created successfully:", {
      id: order.id,
      amount: order.amount,
      currency: order.currency,
    });

    return order as RazorpayOrder;
  } catch (error: any) {
    console.error("Razorpay order creation failed:", {
      error: error.message,
      stack: error.stack,
      statusCode: error.statusCode,
      errorDetails: error.error?.description || error.error,
    });

    if (error.statusCode === 401) {
      console.error("Authentication failed - please verify:");
      console.error("1. API credentials are correct");
      console.error(
        "2. Key ID format (should start with rzp_test_ or rzp_live_)",
      );
      console.error("3. Current Key ID:", keyId?.substring(0, 12) + "...");
    }

    throw new Error(`Failed to create payment order: ${error.message}`);
  }
}

export async function verifyRazorpayPayment(
  orderId: string,
  paymentId: string,
  signature: string,
): Promise<boolean> {
  if (!orderId || !paymentId || !signature) {
    console.error("Missing parameters for payment verification");
    return false;
  }

  try {
    console.log("Starting payment verification for order:", orderId);

    const crypto = await import("crypto");
    const generatedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    const isValid = generatedSignature === signature;

    console.log("Payment verification result:", {
      isValid,
      orderId,
      paymentId,
      expectedSignature: generatedSignature,
      receivedSignature: signature,
    });

    return isValid;
  } catch (error: any) {
    console.error("Payment verification failed:", {
      error: error.message,
      stack: error.stack,
    });
    return false;
  }
}
