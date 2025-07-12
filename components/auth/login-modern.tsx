import React from "react"

export default function LoginModern() {
  return (
    <div className="flex h-screen items-center justify-center bg-gradient-to-r from-purple-500 to-pink-500">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-center text-purple-600 mb-6">Healthify</h1>
        <form>
          <input
            type="email"
            placeholder="Email"
            className="w-full p-3 mb-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full p-3 mb-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            type="submit"
            className="w-full p-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Log In
          </button>
        </form>
        <p className="text-sm text-center mt-4">
          Need an account? <a href="/signup" className="text-purple-500">Sign Up</a>
        </p>
      </div>
    </div>
  )
}