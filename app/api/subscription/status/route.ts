import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../auth/[...nextauth]/route"
import { checkSubscriptionStatus, getUserSubscription } from "@/lib/subscription"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const hasActiveSubscription = await checkSubscriptionStatus(session.user.id)
    const subscription = await getUserSubscription(session.user.id)

    return NextResponse.json({
      hasActiveSubscription,
      subscription: subscription
        ? {
            status: subscription.status,
            currentPeriodEnd: subscription.currentPeriodEnd,
            stripePriceId: subscription.stripePriceId,
          }
        : null,
    })
  } catch (error) {
    console.error("Error checking subscription status:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
