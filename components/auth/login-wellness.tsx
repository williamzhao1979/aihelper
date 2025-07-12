import React from "react"

export default function LoginWellness() {
  return (
    <div className="flex h-screen bg-gradient-to-r from-green-100 to-blue-100">
      {/* Left Section with Image */}
      <div
        className="hidden md:flex w-1/2 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/wellness-bg.jpg')" }}
      >
        <div className="flex flex-col justify-center items-center w-full h-full bg-black bg-opacity-40 text-white p-8">
          <h1 className="text-4xl font-bold mb-4">Welcome to Healthify</h1>
          <p className="text-lg text-center">
            Your journey to better health starts here. Track, improve, and achieve your wellness goals.
          </p>
        </div>
      </div>

      {/* Right Section with Form */}
      <div className="flex flex-col justify-center w-full md:w-1/2 p-8 bg-white shadow-lg">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">Log In to Your Account</h1>
        <form className="space-y-4">
          {/* Email Input */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              className="w-full p-3 mt-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Password Input */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              className="w-full p-3 mt-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full p-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition"
          >
            Log In
          </button>
        </form>

        {/* Additional Links */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{" "}
            <a href="/signup" className="text-blue-500 font-medium hover:underline">
              Sign Up
            </a>
          </p>
          <p className="text-sm text-gray-600 mt-2">
            Forgot your password?{" "}
            <a href="/reset-password" className="text-blue-500 font-medium hover:underline">
              Reset it here
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}