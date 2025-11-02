import { Brain, ShieldCheck, MessageCircle, TrendingUp, Heart, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"

export default function Content() {
    return(
        <div>
        {/* Features Section */}
      <section id="why-choose-curez" className="relative z-10 py-24 px-6 bg-gradient-to-b from-orange-50 via-white to-orange-100">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">Why Choose CureZ?</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Experience the future of mental wellness with our AI-powered platform designed specifically for young people.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {/* AI-Powered Insights */}
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
              whileHover={{ 
                y: -8, 
                scale: 1.02,
                transition: { type: "spring", stiffness: 300, damping: 20 }
              }}
              className="rounded-2xl bg-card border border-border p-8 text-center hover:shadow-2xl hover:border-primary/20 transition-all duration-500 ease-out cursor-pointer group"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-primary/10 mb-6 group-hover:bg-primary/15 group-hover:scale-110 transition-all duration-300">
                <Brain className="w-8 h-8 text-primary group-hover:scale-110 transition-transform duration-300" />
              </div>
              <h3 className="text-xl font-semibold mb-4 group-hover:text-primary transition-colors duration-300">AI-Powered Insights</h3>
              <p className="text-muted-foreground leading-relaxed group-hover:text-foreground transition-colors duration-300">Get personalized mental health insights powered by advanced AI algorithms.</p>
            </motion.div>

            {/* 24/7 Support */}
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              whileHover={{ 
                y: -8, 
                scale: 1.02,
                transition: { type: "spring", stiffness: 300, damping: 20 }
              }}
              className="rounded-2xl bg-card border border-border p-8 text-center hover:shadow-2xl hover:border-primary/20 transition-all duration-500 ease-out cursor-pointer group"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-primary/10 mb-6 group-hover:bg-primary/15 group-hover:scale-110 transition-all duration-300">
                <MessageCircle className="w-8 h-8 text-primary group-hover:scale-110 transition-transform duration-300" />
              </div>
              <h3 className="text-xl font-semibold mb-4 group-hover:text-primary transition-colors duration-300">24/7 Support</h3>
              <p className="text-muted-foreground leading-relaxed group-hover:text-foreground transition-colors duration-300">Access round-the-clock AI chat support whenever you need guidance.</p>
            </motion.div>

            {/* Privacy & Security */}
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
              whileHover={{ 
                y: -8, 
                scale: 1.02,
                transition: { type: "spring", stiffness: 300, damping: 20 }
              }}
              className="rounded-2xl bg-card border border-border p-8 text-center hover:shadow-2xl hover:border-primary/20 transition-all duration-500 ease-out cursor-pointer group"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-primary/10 mb-6 group-hover:bg-primary/15 group-hover:scale-110 transition-all duration-300">
                <ShieldCheck className="w-8 h-8 text-primary group-hover:scale-110 transition-transform duration-300" />
              </div>
              <h3 className="text-xl font-semibold mb-4 group-hover:text-primary transition-colors duration-300">Privacy & Security</h3>
              <p className="text-muted-foreground leading-relaxed group-hover:text-foreground transition-colors duration-300">Your data is protected with enterprise-grade security and privacy measures.</p>
            </motion.div>

            {/* Mood Tracking */}
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              viewport={{ once: true }}
              whileHover={{ 
                y: -8, 
                scale: 1.02,
                transition: { type: "spring", stiffness: 300, damping: 20 }
              }}
              className="rounded-2xl bg-card border border-border p-8 text-center hover:shadow-2xl hover:border-primary/20 transition-all duration-500 ease-out cursor-pointer group"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-primary/10 mb-6 group-hover:bg-primary/15 group-hover:scale-110 transition-all duration-300">
                <TrendingUp className="w-8 h-8 text-primary group-hover:scale-110 transition-transform duration-300" />
              </div>
              <h3 className="text-xl font-semibold mb-4 group-hover:text-primary transition-colors duration-300">Mood Tracking</h3>
              <p className="text-muted-foreground leading-relaxed group-hover:text-foreground transition-colors duration-300">Monitor your emotional well-being with intuitive tracking tools.</p>
            </motion.div>

            {/* Personalized Care */}
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              viewport={{ once: true }}
              whileHover={{ 
                y: -8, 
                scale: 1.02,
                transition: { type: "spring", stiffness: 300, damping: 20 }
              }}
              className="rounded-2xl bg-card border border-border p-8 text-center hover:shadow-2xl hover:border-primary/20 transition-all duration-500 ease-out cursor-pointer group"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-primary/10 mb-6 group-hover:bg-primary/15 group-hover:scale-110 transition-all duration-300">
                <Heart className="w-8 h-8 text-primary group-hover:scale-110 transition-transform duration-300" />
              </div>
              <h3 className="text-xl font-semibold mb-4 group-hover:text-primary transition-colors duration-300">Personalized Care</h3>
              <p className="text-muted-foreground leading-relaxed group-hover:text-foreground transition-colors duration-300">Receive tailored recommendations based on your unique needs and goals.</p>
            </motion.div>

            {/* Community Support */}
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              viewport={{ once: true }}
              whileHover={{ 
                y: -8, 
                scale: 1.02,
                transition: { type: "spring", stiffness: 300, damping: 20 }
              }}
              className="rounded-2xl bg-card border border-border p-8 text-center hover:shadow-2xl hover:border-primary/20 transition-all duration-500 ease-out cursor-pointer group"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-primary/10 mb-6 group-hover:bg-primary/15 group-hover:scale-110 transition-all duration-300">
                <Users className="w-8 h-8 text-primary group-hover:scale-110 transition-transform duration-300" />
              </div>
              <h3 className="text-xl font-semibold mb-4 group-hover:text-primary transition-colors duration-300">Community Support</h3>
              <p className="text-muted-foreground leading-relaxed group-hover:text-foreground transition-colors duration-300">Connect with peers and access moderated community resources.</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Journey Section */}
      <section id="wellness-journey" className="relative z-10 py-24 px-6 bg-gradient-to-b from-orange-100 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="rounded-3xl bg-card border border-border p-12 shadow-lg">
            {/* Section Header */}
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6 text-balance">Your Wellness Journey</h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto text-pretty">
                From self-discovery to lasting well-being, here's how CureZ supports your mental health journey.
              </p>
            </motion.div>

            {/* Journey Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
              {/* Phase 1: Assessment */}
              <motion.div 
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                viewport={{ once: true }}
                whileHover={{ 
                  y: -10, 
                  scale: 1.03,
                  transition: { type: "spring", stiffness: 300, damping: 20 }
                }}
                className="rounded-2xl bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/10 p-8 h-80 flex flex-col hover:shadow-2xl hover:border-primary/30 hover:from-primary/10 hover:to-secondary/10 transition-all duration-500 ease-out cursor-pointer group"
              >
                <div className="flex-1">
                  <div className="text-3xl font-bold text-primary mb-4 group-hover:scale-110 group-hover:text-primary/90 transition-all duration-300">01.</div>
                  <h3 className="text-xl font-semibold mb-4 group-hover:text-primary transition-colors duration-300">Initial Assessment</h3>
                  <p className="text-muted-foreground leading-relaxed text-sm group-hover:text-foreground transition-colors duration-300">
                    Start with our comprehensive wellness assessment to understand your current mental health status
                    and identify areas for growth.
                  </p>
                </div>
              </motion.div>

              {/* Phase 2: Personalized Plan */}
              <motion.div 
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                viewport={{ once: true }}
                whileHover={{ 
                  y: -10, 
                  scale: 1.03,
                  transition: { type: "spring", stiffness: 300, damping: 20 }
                }}
                className="rounded-2xl bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/10 p-8 h-80 flex flex-col hover:shadow-2xl hover:border-primary/30 hover:from-primary/10 hover:to-secondary/10 transition-all duration-500 ease-out cursor-pointer group"
              >
                <div className="flex-1">
                  <div className="text-3xl font-bold text-primary mb-4 group-hover:scale-110 group-hover:text-primary/90 transition-all duration-300">02.</div>
                  <h3 className="text-xl font-semibold mb-4 group-hover:text-primary transition-colors duration-300">Personalized Plan</h3>
                  <p className="text-muted-foreground leading-relaxed text-sm group-hover:text-foreground transition-colors duration-300">
                    Receive a customized wellness plan with daily activities, coping strategies, and AI-powered
                    recommendations tailored to your needs.
                  </p>
                </div>
              </motion.div>

              {/* Phase 3: Daily Support */}
              <motion.div 
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                viewport={{ once: true }}
                whileHover={{ 
                  y: -10, 
                  scale: 1.03,
                  transition: { type: "spring", stiffness: 300, damping: 20 }
                }}
                className="rounded-2xl bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/10 p-8 h-80 flex flex-col hover:shadow-2xl hover:border-primary/30 hover:from-primary/10 hover:to-secondary/10 transition-all duration-500 ease-out cursor-pointer group"
              >
                <div className="flex-1">
                  <div className="text-3xl font-bold text-primary mb-4 group-hover:scale-110 group-hover:text-primary/90 transition-all duration-300">03.</div>
                  <h3 className="text-xl font-semibold mb-4 group-hover:text-primary transition-colors duration-300">Daily Support</h3>
                  <p className="text-muted-foreground leading-relaxed text-sm group-hover:text-foreground transition-colors duration-300">
                    Access 24/7 AI chat support, mood tracking tools, and guided exercises to maintain your mental
                    wellness throughout the day.
                  </p>
                </div>
              </motion.div>

              {/* Phase 4: Growth & Community */}
              <motion.div 
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                viewport={{ once: true }}
                whileHover={{ 
                  y: -10, 
                  scale: 1.03,
                  transition: { type: "spring", stiffness: 300, damping: 20 }
                }}
                className="rounded-2xl bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/10 p-8 h-80 flex flex-col hover:shadow-2xl hover:border-primary/30 hover:from-primary/10 hover:to-secondary/10 transition-all duration-500 ease-out cursor-pointer group"
              >
                <div className="flex-1">
                  <div className="text-3xl font-bold text-primary mb-4 group-hover:scale-110 group-hover:text-primary/90 transition-all duration-300">04.</div>
                  <h3 className="text-xl font-semibold mb-4 group-hover:text-primary transition-colors duration-300">Consultation Service</h3>
                  <p className="text-muted-foreground leading-relaxed text-sm group-hover:text-foreground transition-colors duration-300">
                    Connect with a recommended consultant to receive personalized guidance and take your mental wellness from professional help.
                  </p>
                </div>
              </motion.div>
            </div>

            
          </div>
        </div>
      </section>
      </div>
    )
}
