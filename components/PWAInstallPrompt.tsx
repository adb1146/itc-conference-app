'use client'

import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PWAInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    setIsIOS(isIOSDevice)

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('PWA is already installed')
      return
    }

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration)
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error)
        })
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)

      // Show prompt after a delay or based on user engagement
      setTimeout(() => {
        setShowPrompt(true)
      }, 30000) // Show after 30 seconds
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // iOS doesn't support beforeinstallprompt, show custom instructions
    if (isIOSDevice && !window.navigator.standalone) {
      setTimeout(() => {
        setShowPrompt(true)
      }, 30000)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!installPrompt) {
      // For iOS, show instructions
      if (isIOS) {
        alert('To install this app on iOS:\n1. Tap the Share button\n2. Scroll down and tap "Add to Home Screen"\n3. Tap "Add"')
      }
      return
    }

    // Show the install prompt
    installPrompt.prompt()

    // Wait for the user's response
    const { outcome } = await installPrompt.userChoice

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt')
      // Track installation
      localStorage.setItem('pwa-installed', 'true')
    } else {
      console.log('User dismissed the install prompt')
    }

    // Clear the prompt
    setInstallPrompt(null)
    setShowPrompt(false)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    // Don't show again for 7 days
    localStorage.setItem('pwa-prompt-dismissed', new Date().toISOString())
  }

  // Check if we should suppress the prompt
  useEffect(() => {
    const dismissed = localStorage.getItem('pwa-prompt-dismissed')
    if (dismissed) {
      const dismissedDate = new Date(dismissed)
      const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24)
      if (daysSinceDismissed < 7) {
        setShowPrompt(false)
      }
    }
  }, [])

  if (!showPrompt) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50 animate-slide-up">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
            <Download className="w-5 h-5 text-white" />
          </div>
        </div>

        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">
            Install ITC Vegas App
          </h3>
          <p className="text-xs text-gray-600 mb-3">
            Get quick access from your home screen and use offline features
          </p>

          <div className="flex space-x-2">
            <button
              onClick={handleInstallClick}
              className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs font-medium rounded-md hover:from-purple-700 hover:to-blue-700 transition-colors"
            >
              Install Now
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 text-gray-600 text-xs font-medium hover:text-gray-800 transition-colors"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>

      {isIOS && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            iOS: Tap Share → Add to Home Screen
          </p>
        </div>
      )}
    </div>
  )
}