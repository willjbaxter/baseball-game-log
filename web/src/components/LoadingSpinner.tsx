"use client";

export default function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-gray-600 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
        <div className="text-lg text-gray-300">Loading...</div>
      </div>
    </div>
  );
}