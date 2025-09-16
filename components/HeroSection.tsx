import { ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";

interface HeroSectionProps {
  onBeginJourney: () => void;
}

export default function Home({ onBeginJourney }: HeroSectionProps) {
  const [navbarBg, setNavbarBg] = useState("bg-transparent");

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > window.innerHeight) {
        setNavbarBg("bg-orange-500/80 backdrop-blur-sm border rounded-4xl");
      } else {
        setNavbarBg("bg-transparent");
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>

      <div className="relative min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100 overflow-hidden">
        {/* Background Video */}
        <video
          className="absolute inset-0 w-full h-full object-cover z-0"
          autoPlay
          muted
          loop
          playsInline
        >
          <source src="/hero.mp4" type="video/mp4" />
        </video>

        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 z-0" />

        {/* Decorative Elements */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-primary/10 rounded-full blur-xl z-0" />
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-secondary/10 rounded-full blur-xl z-0" />

        {/* Navigation Bar */}
        <nav
          className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 ${navbarBg} py-4 px-6 transition-all duration-300 ${
            navbarBg.includes("bg-orange-500")
              ? "w-auto max-w-2xl"
              : "w-full max-w-none"
          }`}
        >
          <div className="flex justify-between items-center">
            {/* Logo */}
            <div className="text-white font-bold text-2xl drop-shadow-lg pr-10">
              YouthGuide
            </div>

            {/* Navigation Links */}
            <div className="flex items-center gap-8 text-white/90 font-sans text-sm font-medium drop-shadow-md">
              <a
                href="#wellness-journey"
                className="hover:text-white hover:scale-105 transition-colors duration-300"
              >
                Our Mission
              </a>
              <a
                href="#why-choose-youthguide"
                className="hover:text-white hover:scale-105 transition-colors duration-300"
              >
                Resources
              </a>
              <a
                href="#faq"
                className="hover:text-white hover:scale-105 transition-colors duration-300"
              >
                FAQ
              </a>
            </div>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="relative z-10 flex items-center justify-end h-screen">
          <div className="px-6 lg:px-12">
            <div className="max-w-2xl fade-in text-right">
              {/* Hero Heading */}
              <h1 className="font-serif text-white text-4xl lg:text-6xl font-bold tracking-tight mb-8 drop-shadow-2xl">
                Your AI-Powered Guide to{" "}
                <em className="text-orange-500 drop-shadow-2xl">
                  Mental Wellness
                </em>
              </h1>

              {/* Call to Action Button */}
              <button
                onClick={onBeginJourney}
                id="fancy"
                className="btn-sweep group text-white font-sans font-semibold bg-orange-500 px-8 py-4 rounded-lg text-lg hover:scale-105 hover:shadow-2xl transition-all duration-300 shadow-xl drop-shadow-2xl"
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
              <p className="font-sans text-white/80 text-sm font-medium drop-shadow-lg">
                © 2025 YouthGuide. All rights reserved.
              </p>
              <p className="font-sans text-white/80 text-sm font-medium drop-shadow-lg">
                Powered by Gemini for Mental Wellness
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

