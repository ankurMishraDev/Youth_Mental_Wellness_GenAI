import designTokens from "../../tailwindconfig.json"

const ASSET_MAP: Record<string, any> = {
  "./assets/icon.png": require("../../assets/icon.png"),
  "./assets/videos/hero.mp4": require("../../assets/videos/hero.mp4"),
}

type Tokens = typeof designTokens

export const tokens: Tokens = designTokens

export const getAsset = (key: keyof Tokens["assets"]) => {
  const configuredPath = designTokens.assets[key]
  return ASSET_MAP[configuredPath] ?? null
}
