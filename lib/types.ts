export type CategoryId =
  | "all"
  | "coffee"
  | "tea"
  | "juice"
  | "soda"
  | "water"
  | "energy"
  | "other"
  | "whiskies"
  | "vins"
  | "champagnes"
  | "vodka"
  | "cognacs"
  | "tequilas"
  | "liqueurs"
  | "bieres"
  | "soft"

export interface Category {
  id: CategoryId
  label: string
}

export interface Drink {
  id: string
  name: string
  description: string
  price: number
  category: CategoryId
  image: string
  stock: number
  popularity: number
  sizes?: string[]
}

export interface CartItem {
  drink: Drink
  quantity: number
  size: string
}

export interface Branding {
  companyName: string
  tagline: string
  logoText: string
  // Optional data URL or path to a logo image. If present, shown instead of initials.
  logoImage?: string
  primaryColor: string
  secondaryColor: string
}
