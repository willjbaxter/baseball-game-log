"use client";

export default function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center">
      <div className="relative">
        {/* Baseball spinning animation */}
        <div className="w-16 h-16 mb-4 relative">
          <div className="w-16 h-16 rounded-full border-4 border-white/20 border-t-white animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-2xl">⚾</div>
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-xl font-semibold mb-2">Loading Baseball Data</div>
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
          </div>
        </div>
      </div>
    </div>
  );
}