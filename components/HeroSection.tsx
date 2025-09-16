import { ChevronDown } from "lucide-react"

interface HeroSectionProps {
  onBeginJourney: () => void
}

export default function Home({ onBeginJourney }: HeroSectionProps) {
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100 overflow-hidden">
      {/* Background Video */}
      <video className="absolute inset-0 w-full h-full object-cover z-0" autoPlay muted loop playsInline>
        <source
          src="/welfare.mp4"
          type="video/mp4"
        />
      </video>

      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 z-0" />

      {/* Decorative Elements */}
      <div className="absolute top-20 left-10 w-32 h-32 bg-primary/10 rounded-full blur-xl z-0" />
      <div className="absolute bottom-20 right-10 w-40 h-40 bg-secondary/10 rounded-full blur-xl z-0" />

      {/* Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-transparent backdrop-blur-sm py-4 px-6">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <div className="text-white font-bold text-2xl drop-shadow-lg">YouthGuide</div>

          {/* Navigation Links */}
          <div className="flex items-center gap-8 text-white/90 font-sans text-sm font-medium drop-shadow-md">
            <a href="#wellness-journey" className="hover:text-white hover:scale-105 transition-colors duration-300">
              Our Mission
            </a>
            <a href="#why-choose-youthguide" className="hover:text-white hover:scale-105 transition-colors duration-300">
              Resources
            </a>
            <a href="#faq" className="hover:text-white hover:scale-105 transition-colors duration-300">
              FAQ
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Content */}
      <div className="relative z-10 flex items-center h-screen">
        <div className="px-6 lg:px-12">
          <div className="max-w-2xl fade-in">
            {/* Hero Heading */}
            <h1 className="font-serif text-white text-4xl lg:text-6xl font-bold tracking-tight mb-8 drop-shadow-2xl">
              Your AI-Powered Guide to <em className="text-orange-500 drop-shadow-2xl">Mental Wellness</em>
            </h1>

            {/* Call to Action Button */}
            <button
              onClick={onBeginJourney}
              className="bg-orange-500 hover:bg-orange-600 text-white font-sans font-semibold px-8 py-4 rounded-lg text-lg hover:scale-105 hover:shadow-2xl transition-all duration-300 shadow-xl drop-shadow-2xl"
            >
              Start Your Wellness Journey
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 left-0 right-0 z-10">
        <div className="px-6 lg:px-12">
          <div className="flex justify-between items-center">
            <p className="font-sans text-white/80 text-sm font-medium drop-shadow-lg">© 2025 YouthGuide. All rights reserved.</p>
            <p className="font-sans text-white/80 text-sm font-medium drop-shadow-lg">Powered by Gemini for Mental Wellness</p>
          </div>
        </div>
      </div>
    </div>
  )
}
