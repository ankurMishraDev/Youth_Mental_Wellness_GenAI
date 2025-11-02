import {
  Brain,
} from "lucide-react";
import { motion } from "framer-motion";
import { Logo } from "@/components/Logo";

export default function Footer() {
  return (
    <footer className="relative z-10 pt-16 pb-0 bg-gradient-to-b from-orange-100 via-white to-orange-100 mt-auto overflow-hidden w-full">
      {/* Background decorative elements */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-10 left-10 w-20 h-20 bg-primary rounded-full blur-xl"></div>
        <div className="absolute bottom-10 right-10 w-32 h-32 bg-secondary rounded-full blur-xl"></div>
        <div className="absolute top-20 right-1/4 w-16 h-16 bg-primary/30 rounded-full blur-lg"></div>
        <div className="absolute bottom-20 left-1/4 w-24 h-24 bg-secondary/30 rounded-full blur-lg"></div>
      </div>

      <div className="w-full relative">
        <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-none pt-8 pb-4 px-8 md:pt-12 md:pb-6 md:px-12 shadow-xl">
          {/* Main Footer Content */}
          <div className="flex flex-col md:flex-row justify-between items-center mb-12">
            {/* Brand Section */}
            <motion.div 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="cursor-pointer"
            >
              <Logo size={48} showText={true} href="" />
            </motion.div>
            
            {/* Description */}
            <div className="flex-1 max-w-2xl mx-8 mt-4 md:mt-0">
              <p className="text-muted-foreground leading-relaxed text-pretty text-center md:text-left">
                Your AI-powered companion for mental wellness. We're committed
                to supporting young people with personalized, accessible mental
                health resources and guidance.
              </p>
            </div>
          </div>

          {/* Sub-footer */}
          <div className="border-t border-border/50 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-muted-foreground text-sm">
                © 2025 CureZ. Powered by GenAI for Mental Wellness.
              </p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>Made with Respect and Care for mental wellness</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
