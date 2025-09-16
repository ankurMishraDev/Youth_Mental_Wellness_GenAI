import { Brain, ShieldCheck, MessageCircle, TrendingUp, Heart, Users } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ContentProps {
  onBeginJourney: () => void
}

export default function Content({ onBeginJourney }: ContentProps) {
    return(
        <div>
        {/* Features Section */}
      <section id="why-choose-youthguide" className="relative z-10 py-24 px-6 bg-gradient-to-b from-white to-orange-50/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">Why Choose YouthGuide?</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Experience the future of mental wellness with our AI-powered platform designed specifically for young people.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {/* AI-Powered Insights */}
            <div className="rounded-2xl bg-card border border-border p-8 text-center hover:shadow-lg transition-shadow">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-primary/10 mb-6">
                <Brain className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-4">AI-Powered Insights</h3>
              <p className="text-muted-foreground leading-relaxed">Get personalized mental health insights powered by advanced AI algorithms.</p>
            </div>

            {/* 24/7 Support */}
            <div className="rounded-2xl bg-card border border-border p-8 text-center hover:shadow-lg transition-shadow">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-primary/10 mb-6">
                <MessageCircle className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-4">24/7 Support</h3>
              <p className="text-muted-foreground leading-relaxed">Access round-the-clock AI chat support whenever you need guidance.</p>
            </div>

            {/* Privacy & Security */}
            <div className="rounded-2xl bg-card border border-border p-8 text-center hover:shadow-lg transition-shadow">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-primary/10 mb-6">
                <ShieldCheck className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Privacy & Security</h3>
              <p className="text-muted-foreground leading-relaxed">Your data is protected with enterprise-grade security and privacy measures.</p>
            </div>

            {/* Mood Tracking */}
            <div className="rounded-2xl bg-card border border-border p-8 text-center hover:shadow-lg transition-shadow">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-primary/10 mb-6">
                <TrendingUp className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Mood Tracking</h3>
              <p className="text-muted-foreground leading-relaxed">Monitor your emotional well-being with intuitive tracking tools.</p>
            </div>

            {/* Personalized Care */}
            <div className="rounded-2xl bg-card border border-border p-8 text-center hover:shadow-lg transition-shadow">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-primary/10 mb-6">
                <Heart className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Personalized Care</h3>
              <p className="text-muted-foreground leading-relaxed">Receive tailored recommendations based on your unique needs and goals.</p>
            </div>

            {/* Community Support */}
            <div className="rounded-2xl bg-card border border-border p-8 text-center hover:shadow-lg transition-shadow">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-primary/10 mb-6">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Community Support</h3>
              <p className="text-muted-foreground leading-relaxed">Connect with peers and access moderated community resources.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Journey Section */}
      <section id="wellness-journey" className="relative z-10 py-24 px-6 bg-gradient-to-b from-orange-50/50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="rounded-3xl bg-card border border-border p-12 shadow-lg">
            {/* Section Header */}
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6 text-balance">Your Wellness Journey</h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto text-pretty">
                From self-discovery to lasting well-being, here's how YouthGuide supports your mental health journey.
              </p>
            </div>

            {/* Journey Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
              {/* Phase 1: Assessment */}
              <div className="rounded-2xl bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/10 p-8 h-80 flex flex-col">
                <div className="flex-1">
                  <div className="text-3xl font-bold text-primary mb-4">01.</div>
                  <h3 className="text-xl font-semibold mb-4">Initial Assessment</h3>
                  <p className="text-muted-foreground leading-relaxed text-sm">
                    Start with our comprehensive wellness assessment to understand your current mental health status
                    and identify areas for growth.
                  </p>
                </div>
              </div>

              {/* Phase 2: Personalized Plan */}
              <div className="rounded-2xl bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/10 p-8 h-80 flex flex-col">
                <div className="flex-1">
                  <div className="text-3xl font-bold text-primary mb-4">02.</div>
                  <h3 className="text-xl font-semibold mb-4">Personalized Plan</h3>
                  <p className="text-muted-foreground leading-relaxed text-sm">
                    Receive a customized wellness plan with daily activities, coping strategies, and AI-powered
                    recommendations tailored to your needs.
                  </p>
                </div>
              </div>

              {/* Phase 3: Daily Support */}
              <div className="rounded-2xl bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/10 p-8 h-80 flex flex-col">
                <div className="flex-1">
                  <div className="text-3xl font-bold text-primary mb-4">03.</div>
                  <h3 className="text-xl font-semibold mb-4">Daily Support</h3>
                  <p className="text-muted-foreground leading-relaxed text-sm">
                    Access 24/7 AI chat support, mood tracking tools, and guided exercises to maintain your mental
                    wellness throughout the day.
                  </p>
                </div>
              </div>

              {/* Phase 4: Growth & Community */}
              <div className="rounded-2xl bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/10 p-8 h-80 flex flex-col">
                <div className="flex-1">
                  <div className="text-3xl font-bold text-primary mb-4">04.</div>
                  <h3 className="text-xl font-semibold mb-4">Growth & Community</h3>
                  <p className="text-muted-foreground leading-relaxed text-sm">
                    Connect with a supportive community, track your progress, and celebrate milestones on your journey
                    to better mental health.
                  </p>
                </div>
              </div>
            </div>

            {/* Get Started Button */}
            <div className="text-center">
              <Button
                onClick={onBeginJourney}
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-12 py-4 text-lg font-semibold shadow-lg"
              >
                Start Your Journey Today
              </Button>
            </div>
          </div>
        </div>
      </section>
      </div>
    )
}