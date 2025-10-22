import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Video } from "expo-video";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../src/contexts/AuthContext";
import { colors, gradients } from "../src/constants/theme";
import { GradientCard } from "../src/components/GradientCard";
import { faqs, features, heroHighlights, journey } from "../src/data/landing";

const { width } = Dimensions.get("window");

const LandingScreen = () => {
  const { setCurrentView, setAuthMode } = useAuth();
  const [videoReady, setVideoReady] = useState(false);

  const heroVideo = useMemo(() => require("../assets/hero.mp4"), []);
  const landingImage = useMemo(() => require("../assets/images/landing.jpg"), []);

  const handleGetStarted = () => {
    setAuthMode("signup");
    setCurrentView("auth");
  };

  const handleLogin = () => {
    setAuthMode("login");
    setCurrentView("auth");
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        className="flex-1"
        showsVerticalScrollIndicator={false}
      >
        <View className="px-5 pt-10">
          <LinearGradient
            colors={gradients.hero}
            style={{
              borderRadius: 32,
              padding: 20,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.08)",
            }}
          >
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="font-[Ribeye_400Regular] text-3xl text-foreground">
                CureZ
              </Text>
              <Pressable onPress={handleLogin} className="rounded-full bg-white/10 px-4 py-2">
                <Text className="font-[Inter_500Medium] text-sm text-foreground">Sign in</Text>
              </Pressable>
            </View>
            <Text className="mb-3 font-[Inter_700Bold] text-3xl text-foreground">
              Compassionate AI support for every teen and young adult journey.
            </Text>
            <Text className="mb-6 font-[Inter_400Regular] text-base text-muted">
              Join live audio sessions, explore calming exercises, and celebrate your growth with a dashboard that feels like a
              trusted mentor.
            </Text>
            <View className="mb-6 overflow-hidden rounded-3xl border border-white/10">
              <Video
                source={heroVideo}
                style={{ width: "100%", height: width * 0.56 }}
                resizeMode="cover"
                isLooping
                shouldPlay
                useNativeControls={false}
                onLoad={() => setVideoReady(true)}
              />
              {!videoReady && (
                <View className="absolute inset-0 items-center justify-center bg-black/40">
                  <ActivityIndicator color={colors.primary} />
                </View>
              )}
            </View>
            <View className="space-y-3">
              {heroHighlights.map((item) => (
                <View key={item} className="flex-row items-center gap-3">
                  <View className="h-8 w-8 items-center justify-center rounded-full bg-white/10">
                    <Feather name="check" size={18} color={colors.primary} />
                  </View>
                  <Text className="flex-1 font-[Inter_500Medium] text-sm text-foreground">{item}</Text>
                </View>
              ))}
            </View>
            <Pressable onPress={handleGetStarted} className="mt-6 overflow-hidden rounded-full">
              <LinearGradient
                colors={[colors.primary, colors.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ paddingVertical: 14, paddingHorizontal: 24 }}
              >
                <View className="flex-row items-center justify-center">
                  <Text className="font-[Inter_600SemiBold] text-base text-white">
                    Create your free account
                  </Text>
                  <Feather name="arrow-right" size={20} color="#fff" style={{ marginLeft: 8 }} />
                </View>
              </LinearGradient>
            </Pressable>
          </LinearGradient>
        </View>

        <View className="mt-10 px-5">
          <Text className="mb-4 font-[Inter_700Bold] text-2xl text-foreground">Why choose CureZ?</Text>
          <View className="gap-4">
            {features.map((feature) => (
              <GradientCard key={feature.title}>
                <View className="flex-row gap-4">
                  <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                    <Feather name={feature.icon as any} size={22} color={colors.primary} />
                  </View>
                  <View className="flex-1">
                    <Text className="font-[Inter_600SemiBold] text-lg text-foreground">
                      {feature.title}
                    </Text>
                    <Text className="mt-1 font-[Inter_400Regular] text-sm text-muted">
                      {feature.description}
                    </Text>
                  </View>
                </View>
              </GradientCard>
            ))}
          </View>
        </View>

        <View className="mt-10 px-5">
          <GradientCard>
            <Image
              source={landingImage}
              className="h-52 w-full rounded-xl"
              resizeMode="cover"
            />
            <Text className="mt-5 font-[Inter_700Bold] text-xl text-foreground">
              Your healing journey with CureZ
            </Text>
            <View className="mt-4 space-y-4">
              {journey.map((step, index) => (
                <View key={step.title} className="flex-row items-start gap-4">
                  <View className="mt-1 h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                    <Text className="font-[Inter_600SemiBold] text-primary">0{index + 1}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-[Inter_600SemiBold] text-lg text-foreground">
                      {step.title}
                    </Text>
                    <Text className="mt-1 font-[Inter_400Regular] text-sm text-muted">
                      {step.description}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </GradientCard>
        </View>

        <View className="mt-10 px-5">
          <Text className="mb-4 font-[Inter_700Bold] text-2xl text-foreground">FAQs</Text>
          <View className="space-y-4">
            {faqs.map((faq) => (
              <GradientCard key={faq.question}>
                <Text className="font-[Inter_600SemiBold] text-lg text-foreground">
                  {faq.question}
                </Text>
                <Text className="mt-2 font-[Inter_400Regular] text-sm text-muted">{faq.answer}</Text>
              </GradientCard>
            ))}
          </View>
        </View>

        <View className="mt-12 px-5">
          <LinearGradient
            colors={gradients.accent}
            style={{ borderRadius: 28, padding: 24 }}
          >
            <Text className="font-[Inter_700Bold] text-2xl text-background">
              Ready to meet your AI mentor?
            </Text>
            <Text className="mt-2 font-[Inter_400Regular] text-base text-background/80">
              Sign up to unlock personalized sessions, mood analytics, and a library of guided practices.
            </Text>
            <Pressable
              onPress={handleGetStarted}
              className="mt-6 self-start rounded-full bg-background px-6 py-3"
            >
              <Text className="font-[Inter_600SemiBold] text-primary">Join CureZ</Text>
            </Pressable>
          </LinearGradient>
        </View>

        <View className="mt-10 px-5 pb-16">
          <Text className="text-center font-[Inter_400Regular] text-xs text-muted">
            © {new Date().getFullYear()} CureZ Wellness. Built for the next generation of resilient minds.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default LandingScreen;
