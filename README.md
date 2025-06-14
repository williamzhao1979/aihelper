# Multi-Platform AI with Stripe Integration

A modern, multilingual web application with Stripe subscription integration for premium streaming features. Query multiple AI platforms simultaneously and compare their responses in real-time.

## 🌍 Language Support

- **中文 (Chinese)** - 简体中文支持
- **English** - Full English localization  
- **日本語 (Japanese)** - 完全な日本語対応

## 💰 Subscription Features

### Free Tier
- ✅ Standard response mode
- ✅ Multi-platform AI comparison
- ✅ Multilingual support
- ✅ All basic features

### Pro Tier (¥29/month)
- ⚡ **Real-time streaming responses**
- 🚀 **Faster perceived performance**
- 💜 **Premium UI experience**
- 🎯 **Priority support**

## 🚀 Features

- 🤖 **Multi-Platform Support**: Query ChatGPT, DeepSeek, GitHub Copilot, and Microsoft Copilot
- 💳 **Stripe Integration**: Secure subscription management
- 🔐 **Authentication**: NextAuth.js with Google OAuth
- ⚡ **Streaming Responses**: Real-time AI responses (Pro feature)
- 🌐 **Internationalization**: Full i18n support with next-intl
- 📱 **Mobile Responsive**: Works perfectly on all device sizes
- 🎨 **Modern UI**: Beautiful design with Tailwind CSS

## 🛠 Tech Stack

- **Framework**: Next.js 15 with App Router
- **Authentication**: NextAuth.js
- **Payments**: Stripe
- **Internationalization**: next-intl
- **Styling**: Tailwind CSS + Radix UI
- **TypeScript**: Full type safety

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Stripe account
- Google OAuth credentials (for authentication)
- AI API keys

### Installation

1. **Clone and install dependencies:**
\`\`\`bash
git clone <your-repo-url>
cd multi-platform-ai
npm install
\`\`\`

2. **Set up environment variables:**
\`\`\`bash
cp .env.example .env.local
\`\`\`

3. **Configure your `.env.local`:**
\`\`\`env
# AI API Keys
OPENAI_API_KEY=your_openai_api_key
DEEPSEEK_API_KEY=your_deepseek_api_key
AZURE_OPENAI_API_KEY=your_azure_openai_api_key
AZURE_OPENAI_ENDPOINT=your_azure_openai_endpoint

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Stripe
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_PRO_PRICE_ID=price_your_pro_plan_price_id

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
\`\`\`

4. **Set up Stripe:**
   - Create a product in Stripe Dashboard
   - Create a recurring price (e.g., ¥29/month)
   - Copy the price ID to `STRIPE_PRO_PRICE_ID`
   - Set up webhook endpoint: `your-domain.com/api/webhooks/stripe`

5. **Run the development server:**
\`\`\`bash
npm run dev
\`\`\`

6. **Visit the application:**
   - Chinese: http://localhost:3000/zh
   - English: http://localhost:3000/en
   - Japanese: http://localhost:3000/ja

## 🔧 Stripe Configuration

### 1. Create Products and Prices

In your Stripe Dashboard:
1. Go to Products → Add Product
2. Create "Multi-Platform AI Pro"
3. Add recurring pricing (e.g., ¥29/month)
4. Copy the price ID

### 2. Set up Webhooks

1. Go to Developers → Webhooks
2. Add endpoint: `https://your-domain.com/api/webhooks/stripe`
3. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

### 3. Test with Stripe CLI

\`\`\`bash
# Install Stripe CLI
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Test webhook
stripe trigger customer.subscription.created
\`\`\`

## 🔐 Authentication Setup

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://your-domain.com/api/auth/callback/google`

## 📊 API Endpoints

### Authentication
- `GET/POST /api/auth/[...nextauth]` - NextAuth.js endpoints

### Subscriptions
- `POST /api/subscription/create-checkout` - Create Stripe checkout session
- `POST /api/subscription/portal` - Create billing portal session
- `GET /api/subscription/status` - Check subscription status

### AI Chat
- `POST /api/chat` - Standard AI responses
- `POST /api/chat/stream` - Streaming AI responses (Pro feature)

### Webhooks
- `POST /api/webhooks/stripe` - Stripe webhook handler

## 🎯 User Flow

### Free User
1. Visit application
2. Use standard response mode
3. See "Pro Feature" badges on streaming toggle
4. Click upgrade to see subscription dialog

### Subscription Flow
1. User clicks "Upgrade to Pro"
2. Redirected to Stripe Checkout
3. Complete payment
4. Webhook updates subscription status
5. User gains access to streaming features

### Pro User
1. Login with Google
2. Toggle streaming mode
3. Enjoy real-time AI responses
4. Manage subscription via billing portal

## 🚀 Deployment

### Vercel (Recommended)

1. **Deploy to Vercel:**
\`\`\`bash
vercel --prod
\`\`\`

2. **Add environment variables in Vercel Dashboard**

3. **Update Stripe webhook URL:**
   - Change webhook endpoint to: `https://your-domain.vercel.app/api/webhooks/stripe`

4. **Update OAuth redirect URIs:**
   - Add production URL to Google OAuth settings

### Environment Variables for Production

Ensure all environment variables are set in your deployment platform:
- All AI API keys
- NextAuth configuration
- Stripe keys and webhook secret
- Google OAuth credentials

## 🔒 Security Considerations

- **API Keys**: Never expose secret keys in client-side code
- **Webhooks**: Verify Stripe webhook signatures
- **Authentication**: Secure session management with NextAuth.js
- **Subscription Validation**: Always verify subscription status server-side

## 📱 Features by Plan

| Feature | Free | Pro |
|---------|------|-----|
| Standard Responses | ✅ | ✅ |
| Multi-platform AI | ✅ | ✅ |
| Multilingual Support | ✅ | ✅ |
| Streaming Responses | ❌ | ✅ |
| Real-time Updates | ❌ | ✅ |
| Priority Support | ❌ | ✅ |

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

---

**Ready for production with Stripe subscriptions! 🚀💳**
\`\`\`

I've successfully integrated Stripe for streaming feature subscriptions! Here's what I've implemented:

## 🚀 **Complete Stripe Integration:**

### **1. Subscription Management**
- **Stripe Checkout** for secure payment processing
- **Billing Portal** for subscription management
- **Webhook handling** for real-time subscription updates
- **Subscription status checking** to gate premium features

### **2. Authentication System**
- **NextAuth.js** with Google OAuth
- **User session management**
- **Automatic Stripe customer creation**

### **3. Premium Feature Gating**
- **Streaming toggle** requires authentication and subscription
- **Visual indicators** for premium features
- **Subscription dialog** for easy upgrades
- **Graceful degradation** for free users

### **4. User Experience**
- **Professional subscription dialog** with feature comparison
- **Success/cancel pages** for payment flow
- **Subscription status dashboard**
- **Seamless upgrade process**

## 💰 **Monetization Features:**

### **Pricing Structure**
- **Free Tier**: Standard responses, basic features
- **Pro Tier**: ¥29/month for streaming responses + premium features

### **Payment Flow**
1. User clicks streaming toggle without subscription
2. Shows subscription dialog with feature comparison
3. Redirects to Stripe Checkout
4. Webhook updates subscription status
5. User gains immediate access to streaming

### **Subscription Management**
- **Billing portal** for plan changes
- **Automatic renewal** handling
- **Cancellation support**
- **Grace period** management

## 🔧 **Technical Implementation:**

### **API Routes**
- `/api/subscription/create-checkout` - Start subscription
- `/api/subscription/portal` - Manage billing
- `/api/subscription/status` - Check subscription
- `/api/webhooks/stripe` - Handle Stripe events

### **Security Features**
- **Webhook signature verification**
- **Server-side subscription validation**
- **Secure API key management**
- **Authentication-gated endpoints**

## 🎯 **Ready for Production:**
- **Complete Stripe integration**
- **Secure payment processing**
- **Real-time subscription updates**
- **Professional UI/UX**
- **Multilingual support**
- **Mobile responsive**

The application is now ready to generate revenue with a professional subscription system! 💳✨
