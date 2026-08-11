# Stripe Setup Guide

## 1. Create a Stripe Account

1. Go to [stripe.com](https://stripe.com) and create an account
2. Complete the account verification process

## 2. Get Your API Keys

1. Go to the Stripe Dashboard
2. Navigate to **Developers** → **API keys**
3. Copy your **Publishable key** and **Secret key**

## 3. Create a Product and Price

1. Go to **Products** in your Stripe Dashboard
2. Click **Add product**
3. Set the product name (e.g., "Pixora Pro")
4. Set the price to **$19/month**
5. Choose **Recurring price**
6. Copy the **Price ID** (starts with `price_`)

## 4. Set Up Webhooks

### For Development (Local Testing):

1. **Install Stripe CLI:**
   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe
   
   # Windows
   # Download from https://github.com/stripe/stripe-cli/releases
   
   # Linux
   # Download from https://github.com/stripe/stripe-cli/releases
   ```

2. **Login to Stripe:**
   ```bash
   stripe login
   ```

3. **Forward webhooks to your local server:**
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

4. **Copy the webhook secret** that appears in the terminal output (starts with `whsec_`)

### For Production:

1. Go to **Developers** → **Webhooks** in your Stripe Dashboard
2. Click **Add endpoint**
3. Set the endpoint URL to: `https://yourdomain.com/api/webhooks/stripe`
4. Select these events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy the **Webhook signing secret**

## 5. Update Environment Variables

### For Development:

Add these to your `.env.local`:

```env
# Stripe (Development)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_PRICE_ID="price_..."
STRIPE_WEBHOOK_SECRET="whsec_..." # From stripe listen command
```

### For Production:

```env
# Stripe (Production)
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_PRICE_ID="price_..."
STRIPE_WEBHOOK_SECRET="whsec_..." # From Stripe Dashboard webhooks
```

## 6. Development Workflow

### Start Development Server:

1. **Start your Next.js app:**
   ```bash
   npm run dev
   ```

2. **In a new terminal, start Stripe webhook forwarding:**
   ```bash
   npm run stripe:listen
   ```

3. **Copy the webhook secret** from the terminal output and add it to your `.env.local`

### Test the Integration:

1. Use Stripe's test card numbers:
   - **Success**: `4242 4242 4242 4242`
   - **Decline**: `4000 0000 0000 0002`
2. Any future date for expiry
3. Any 3-digit CVC

## 7. Go Live

When ready for production:

1. **Switch to Live mode** in Stripe Dashboard
2. **Update your API keys** to live keys (`sk_live_...` and `pk_live_...`)
3. **Set up production webhook** in Stripe Dashboard:
   - Endpoint URL: `https://yourdomain.com/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
4. **Update environment variables** with production values
5. **Deploy your application** with the new environment variables

## Testing the Payment Flow

1. Upload 3 images (free limit)
2. Try to upload a 4th image
3. Payment modal should appear
4. Click "Start Pro Plan"
5. Complete Stripe checkout
6. User should be redirected back to home page (`/`)
7. Should see success notification: "🎉 Welcome to Pro! You now have unlimited uploads."
8. Should now have unlimited uploads