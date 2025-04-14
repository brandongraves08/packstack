import { ItemCategory } from './category'
import { Brand, Product } from './resources'

export type Unit = 'g' | 'kg' | 'oz' | 'lb'

export type NutritionInfo = {
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  servingSize?: number
  servingUnit?: string
  servingsPerContainer?: number
}

export type FoodItemType =
  | 'meal'
  | 'snack'
  | 'breakfast'
  | 'lunch'
  | 'dinner'
  | 'drink'
  | 'dessert'
  | 'other'

export type ItemForm = {
  itemname: string
  brand_id?: number
  brand_new?: string
  product_id?: number
  product_new?: string
  product_variant_id?: number
  product_variant_new?: string
  category_id?: number
  category_new?: string
  weight: number
  unit: Unit
  price: number
  consumable: boolean
  product_url: string
  notes: string
  // Food-specific fields
  is_food?: boolean
  food_type?: FoodItemType
  calories_per_serving?: number
  expiration_date?: string
  nutrition_info?: NutritionInfo
  preparation_time?: number // in minutes
  dietary_tags?: string[] // gluten-free, vegan, etc.
}

export type CreateItem = Omit<ItemForm, 'itemname'> & {
  name: string
}

export type EditItem = CreateItem & {
  id: number
}

export type Item = {
  id: number
  name: string
  user_id: number
  brand_id?: number
  category_id?: number
  consumable: boolean
  created_at: string
  notes: string
  price?: number
  product_id?: number
  product_variant_id?: number
  product_url: string
  removed: boolean
  sort_order: number | null
  unit: Unit
  updated_at: string
  weight?: number | null
  wishlist?: boolean

  // Food-specific fields
  is_food?: boolean
  food_type?: FoodItemType
  calories_per_serving?: number
  expiration_date?: string
  nutrition_info?: NutritionInfo
  preparation_time?: number
  dietary_tags?: string[]

  category?: ItemCategory
  brand?: Brand
  product?: Product
  product_variant?: ProductVariant
}

export type ProductDetails = {
  median: number
  items: number
  unit: Unit
}

export type ProductVariant = {
  id: number
  product_id: number
  name: string
}
