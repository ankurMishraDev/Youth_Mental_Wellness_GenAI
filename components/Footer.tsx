import React from "react";
import {
  Brain,
  Instagram,
  Twitter,
  Linkedin,
  Mail,
  MapPin,
  Youtube,
  Phone,
  Heart,
  Shield,
  FileText,
} from "lucide-react";

export default function Footer() {
  return (
    <footer className="relative z-10 pt-16 pb-0  mt-auto overflow-hidden w-full">
      {/* Background decorative elements */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-10 left-10 w-20 h-20 bg-primary rounded-full blur-xl"></div>
        <div className="absolute bottom-10 right-10 w-32 h-32 bg-secondary rounded-full blur-xl"></div>
        <div className="absolute top-20 right-1/4 w-16 h-16 bg-primary/30 rounded-full blur-lg"></div>
        <div className="absolute bottom-20 left-1/4 w-24 h-24 bg-secondary/30 rounded-full blur-lg"></div>
      </div>

<div className="w-full relative  bg-yellow-300">
        <div className="bg-white/90 backdrop-blur-sm border border-orange-200/50 rounded-none pt-12 pb-6 px-8 md:pt-16 md:pb-8 md:px-16 shadow-2xl shadow-orange-100/20">
          {/* Main Footer Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pb-12">
            
            {/* Brand Section */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Brain className="w-6 h-6 text-orange-600" />
                </div>
                <h1 className="text-orange-600 font-bold text-3xl">YouthGuide</h1>
              </div>
              <p className="text-gray-600 mb-6 leading-relaxed max-w-md">
                Your trusted mental health companion, empowering young minds with AI-driven wellness support and guidance for a brighter tomorrow.
              </p>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                <MapPin className="w-4 h-4" />
                <span>Supporting youth worldwide</span>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-orange-600 font-semibold text-lg mb-4">Quick Links</h3>
              <ul className="space-y-3">
                <li><a href="#" className="text-gray-600 hover:text-orange-600 transition-colors duration-200 flex items-center gap-2"><Heart className="w-4 h-4" />Get Support</a></li>
                <li><a href="#" className="text-gray-600 hover:text-orange-600 transition-colors duration-200 flex items-center gap-2"><Shield className="w-4 h-4" />Crisis Help</a></li>
                <li><a href="#" className="text-gray-600 hover:text-orange-600 transition-colors duration-200">Resources</a></li>
                <li><a href="#" className="text-gray-600 hover:text-orange-600 transition-colors duration-200">About Us</a></li>
              </ul>
            </div>

            {/* Contact & Social */}
            <div>
              <h3 className="text-orange-600 font-semibold text-lg mb-4">Connect With Us</h3>
              
              {/* Contact Info */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-gray-600">
                  <Mail className="w-4 h-4 text-orange-500" />
                  <span className="text-sm">support@youthguide.ai</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <Phone className="w-4 h-4 text-orange-500" />
                  <span className="text-sm">24/7 Crisis Line</span>
                </div>
              </div>

              {/* Social Media */}
              <div className="flex gap-3">
                <button className="p-2 border border-orange-200 hover:bg-orange-50 hover:border-orange-300 transition-all duration-200 rounded-md">
                  <Instagram className="w-4 h-4 text-orange-600" />
                </button>
                <button className="p-2 border border-orange-200 hover:bg-orange-50 hover:border-orange-300 transition-all duration-200 rounded-md">
                  <Twitter className="w-4 h-4 text-orange-600" />
                </button>
                <button className="p-2 border border-orange-200 hover:bg-orange-50 hover:border-orange-300 transition-all duration-200 rounded-md">
                  <Youtube className="w-4 h-4 text-orange-600" />
                </button>
                <button className="p-2 border border-orange-200 hover:bg-orange-50 hover:border-orange-300 transition-all duration-200 rounded-md">
                  <Linkedin className="w-4 h-4 text-orange-600" />
                </button>
              </div>
            </div>
          </div>

          {/* Crisis Notice Banner */}
          <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200/50 rounded-lg p-4 mb-8">
            <div className="flex items-center justify-center gap-3 text-center">
              <Shield className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-800">
                <span className="font-semibold">Crisis Support:</span> If you're in immediate danger, please contact emergency services or call our 24/7 crisis line.
              </p>
            </div>
          </div>

          {/* Sub-footer */}
          <div className="border-t border-orange-200/50 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex flex-col md:flex-row items-center gap-4 text-sm text-gray-500">
                <p>© 2025 YouthGuide. All rights reserved.</p>
                <div className="flex items-center gap-4">
                  <a href="#" className="hover:text-orange-600 transition-colors duration-200 flex items-center gap-1">
                    <FileText className="w-3 h-3" />Privacy Policy
                  </a>
                  <span>•</span>
                  <a href="#" className="hover:text-orange-600 transition-colors duration-200 flex items-center gap-1">
                    <FileText className="w-3 h-3" />Terms of Service
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">Made with</span>
                <Heart className="w-4 h-4 text-red-500 fill-current animate-pulse" />
                <span className="text-gray-500">for mental wellness</span>
                <div className="ml-2 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                  Powered by Gemini
                </div>
                </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
