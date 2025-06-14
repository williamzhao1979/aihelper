import NextAuth from "next-auth"
import type { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { createStripeCustomer } from "@/lib/subscription"

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    // Add more providers as needed
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Create Stripe customer when user signs in for the first time
      if (account?.provider === "google" && user.email) {
        try {
          // Check if user already has a Stripe customer ID
          // In a real app, you'd check your database
          const customer = await createStripeCustomer(user.email, user.name || undefined)
          // Store customer ID in your database associated with the user
          console.log("Created Stripe customer:", customer.id)
        } catch (error) {
          console.error("Error creating Stripe customer:", error)
        }
      }
      return true
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id
      }
      return token
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
