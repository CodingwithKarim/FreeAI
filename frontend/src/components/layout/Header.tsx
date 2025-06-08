import React from "react"

export const Header: React.FC = () => {
  return (
    <div className="p-8 text-center">
      <h1 className="text-6xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-purple-700 to-purple-300 text-glow">
        FreeAI
      </h1>
      <p className="mt-2 text-gray-600 text-lg font-medium">
        Run Hugging Face Models Locally — Free, Private, and Fully Offline
      </p>
    </div>
  )
}