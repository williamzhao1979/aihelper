import { stripe } from "./stripe"

export interface UserSubscription {
  id: string
  userId: string
  stripeCustomerId: string
  stripeSubscriptionId: string
  stripePriceId: string
  status: string
  currentPeriodStart: Date
  currentPeriodEnd: Date
  createdAt: Date
  updatedAt: Date
}

// In a real app, this would be a database
// For demo purposes, we'll use a simple in-memory store
const subscriptions = new Map<string, UserSubscription>()

export async function getUserSubscription(userId: string): Promise<UserSubscription | null> {
  // In a real app, query your database
  return subscriptions.get(userId) || null
}

export async function createOrUpdateSubscription(subscription: UserSubscription): Promise<void> {
  // In a real app, save to your database
  subscriptions.set(subscription.userId, subscription)
}

export async function deleteSubscription(userId: string): Promise<void> {
  // In a real app, delete from your database
  subscriptions.delete(userId)
}

export async function checkSubscriptionStatus(userId: string): Promise<boolean> {
  const subscription = await getUserSubscription(userId)

  if (!subscription) {
    return false
  }

  // Check if subscription is active and not expired
  const now = new Date()
  const isActive = subscription.status === "active" || subscription.status === "trialing"
  const notExpired = subscription.currentPeriodEnd > now

  return isActive && notExpired
}

export async function createStripeCustomer(email: string, name?: string) {
  const customer = await stripe.customers.create({
    email,
    name,
  })
  return customer
}

export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string,
) {
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
  })

  return session
}

export async function createBillingPortalSession(customerId: string, returnUrl: string) {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })

  return session
}
