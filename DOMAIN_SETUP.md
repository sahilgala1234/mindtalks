# Domain Setup Guide - aipremika.in

## Replit Domain Linking

### Step 1: Configure Custom Domain in Replit
1. Go to your Replit project dashboard
2. Click on the "Deployments" tab
3. Select "Custom Domain"
4. Enter: `aipremika.in`
5. Copy the CNAME record provided by Replit

### Step 2: Configure DNS at Domain Registrar
Add the following DNS records at your domain registrar:

```
Type: CNAME
Name: @
Value: [PROVIDED_BY_REPLIT]

Type: CNAME  
Name: www
Value: [PROVIDED_BY_REPLIT]
```

### Step 3: SSL Certificate
- Replit automatically provisions SSL certificates
- Wait 10-15 minutes after DNS propagation
- Domain will be accessible via HTTPS

## Current Status
- Domain: aipremika.in
- App: AIpremika - AI Girlfriend Chat
- Payment: ₹1 for 10 coins
- Ready for production deployment

## Payment Integration Status
- Razorpay API authentication needs resolution
- Payment link fallback implemented
- Domain ready for live traffic