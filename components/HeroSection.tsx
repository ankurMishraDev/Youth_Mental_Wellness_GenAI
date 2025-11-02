import { ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface HeroSectionProps {
  onBeginJourney: () => void;
}

export default function Home({ onBeginJourney }: HeroSectionProps) {
  const [navbarBg, setNavbarBg] = useState("bg-transparent");
  const [navbarOpacity, setNavbarOpacity] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const halfViewportHeight = window.innerHeight / 2;
      const fullViewportHeight = window.innerHeight;
      
      if (scrollPosition >= halfViewportHeight) {
        // Calculate smooth opacity transition from half to full viewport height
        const transitionProgress = Math.min(
          (scrollPosition - halfViewportHeight) / (fullViewportHeight - halfViewportHeight), 
          1
        );
        
        setNavbarBg("bg-orange-500/80 backdrop-blur-sm border rounded-4xl");
        setNavbarOpacity(transitionProgress);
      } else {
        setNavbarBg("bg-transparent");
        setNavbarOpacity(0);
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
          className={`fixed left-1/2 transform -translate-x-1/2 z-50 py-4 px-6 transition-all duration-500 ease-out ${
            navbarOpacity > 0
              ? "w-auto max-w-2xl top-2"
              : "w-full max-w-none top-4"
          }`}
          style={{
            background: navbarOpacity > 0 
              ? `rgba(249, 115, 22, ${0.8 * navbarOpacity})` 
              : 'transparent',
            backdropFilter: navbarOpacity > 0 ? 'blur(8px)' : 'none',
            border: navbarOpacity > 0 ? `1px solid rgba(249, 115, 22, ${0.3 * navbarOpacity})` : 'none',
            borderRadius: navbarOpacity > 0 ? '1rem' : '0',
          }}
        >
          <div className="flex justify-between items-center mx-20">
            {/* Logo */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="text-white ribeye-regular text-3xl drop-shadow-lg pr-6 cursor-pointer transition-all duration-300 hover:text-orange-200"
            >
              CureZ
            </motion.div>

            {/* Navigation Links */}
            <div className="flex items-center gap-4 text-white/90 font-sans text-lg font-semibold drop-shadow-md">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 300 }}
                onClick={() => {
                  const element = document.getElementById('why-choose-curez');
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
                className="hover:text-white transition-all duration-300 px-4 py-2 rounded-lg hover:bg-white/10"
              >
                Our Mission
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 300 }}
                onClick={() => {
                  const element = document.getElementById('wellness-journey');
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
                className="hover:text-white transition-all duration-300 px-4 py-2 rounded-lg hover:bg-white/10"
              >
                Resources
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 300 }}
                onClick={() => {
                  const element = document.getElementById('faq-section');
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
                className="hover:text-white transition-all duration-300 px-4 py-2 rounded-lg hover:bg-white/10"
              >
                FAQ
              </motion.button>
            </div>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="relative z-10 flex items-center justify-end h-screen">
          <div className="px-6 lg:px-12">
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="max-w-2xl fade-in text-right"
            >
              {/* Hero Heading */}
              <motion.h1 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="font-serif text-white text-4xl lg:text-6xl font-bold tracking-tight mb-8 drop-shadow-2xl"
              >
                Your AI-Powered Guide to{" "}
                <em className="text-orange-500 drop-shadow-2xl">
                  Mental Wellness
                </em>
              </motion.h1>

              {/* Call to Action Button */}
              <motion.button
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onBeginJourney}
                id="fancy"
                className="btn-sweep group text-white font-sans font-semibold bg-orange-500 px-8 py-4 rounded-lg text-lg hover:shadow-2xl transition-all duration-300 shadow-xl drop-shadow-2xl"
              >
                  Start Your Wellness Journey
               
              </motion.button>
            </motion.div>
          </div>
        </div>

        {/* Footer */}
        {/* <div className="absolute bottom-6 left-0 right-0 z-10">
          <div className="px-6 lg:px-12">
            <div className="flex justify-between items-center">
              <p className="font-sans text-white/80 text-sm font-medium drop-shadow-lg">
                © 2025 CureZ. All rights reserved.
              </p>
              <p className="font-sans text-white/80 text-sm font-medium drop-shadow-lg">
                Powered by Gemini for Mental Wellness
              </p>
            </div>
          </div>
        </div> */}
      </div>
    </>
  );
}
