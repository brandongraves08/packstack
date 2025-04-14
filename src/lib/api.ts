import {
  AuthResponse,
  ImportInventoryResponse,
  LoginRequest,
  PackPayload,
  PasswordReset,
  RegisterRequest,
  UpdateItemSortOrder,
  UpdateUser,
  UploadAvatar,
  UploadInventory,
} from '@/types/api'
import { Category } from '@/types/category'
import {
  CreateItem,
  EditItem,
  Item,
  ProductDetails,
  ProductVariant,
} from '@/types/item'
import { Pack } from '@/types/pack'
import { Brand, BrandProducts } from '@/types/resources'
import { CreateTrip, EditTrip, Trip } from '@/types/trip'
import { User } from '@/types/user'

import { http } from './base'

// Define the base API URL for backend requests
export const BASE_API_URL =
  process.env.NODE_ENV === 'production'
    ? process.env.REACT_APP_API_URL ||
      (typeof window !== 'undefined' ? window.location.origin : '')
    : 'http://localhost:5001'

/**
 * User endpoints
 */
export const getUser = () => http.get<User>(`${BASE_API_URL}/user`)

export const getProfile = (username: string) =>
  http.get<User>(`${BASE_API_URL}/user/profile/${username}`)

export const uploadUserAvatar = (data: UploadAvatar) => {
  const formData = new FormData()
  formData.append('file', data.file)

  return http.post<User>(`${BASE_API_URL}/user/avatar`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
}

export const updateUser = (data: UpdateUser) =>
  http.put<User>(`${BASE_API_URL}/user`, data)

export const userLogin = (data: LoginRequest) =>
  http.post<AuthResponse>(`${BASE_API_URL}/user/login`, data)

export const userRegister = (data: RegisterRequest) =>
  http.post<AuthResponse>(`${BASE_API_URL}/user`, data)

export const requestPasswordReset = (email: string) =>
  http.post(`${BASE_API_URL}/user/request-password-reset`, { email })

export const resetPassword = (data: PasswordReset) =>
  http.post(`${BASE_API_URL}/user/reset-password`, data)

/**
 * Trip endpoints
 */

export const getTrip = (tripId?: string | number) =>
  http.get<Trip>(`${BASE_API_URL}/trip/${tripId}`)

export const createTrip = (data: CreateTrip) =>
  http.post<Trip>(`${BASE_API_URL}/trip`, data)

export const editTrip = (data: EditTrip) =>
  http.put<Trip>(`${BASE_API_URL}/trip`, data)

export const cloneTrip = (tripId: number) =>
  http.post<Trip>(`${BASE_API_URL}/trip/${tripId}/clone`)

export const deleteTrip = (tripId: number) =>
  http.delete<boolean>(`${BASE_API_URL}/trip/${tripId}`)

/**
 * Pack endpoints
 */

export const getPack = (id?: string | number) =>
  http.get<Pack>(`${BASE_API_URL}/pack/${id}`)

export const getTripPacks = (tripId?: string | number) =>
  http.get<Pack[]>(`${BASE_API_URL}/pack/trip/${tripId}`)

export const createPack = (data: PackPayload) =>
  http.post<Pack>(`${BASE_API_URL}/pack`, data)

export const updatePack = (packId: number, data: PackPayload) =>
  http.put(`${BASE_API_URL}/pack/${packId}`, data)

export const deletePack = (packId: number) =>
  http.delete(`${BASE_API_URL}/pack/${packId}`)

export const generatePack = (packId: number) =>
  http.post<Trip>(`${BASE_API_URL}/pack/${packId}/generate`)

export const getUnassignedPacks = () =>
  http.get<Pack[]>(`${BASE_API_URL}/pack/legacy/unassigned`)

/**
 * Category endpoints
 */

export const getCategories = () =>
  http.get<Category[]>(`${BASE_API_URL}/category`)

/**
 * Brand endpoints
 */

export const getBrands = () =>
  http.get<Brand[]>(`${BASE_API_URL}/resources/brands`)

export const searchBrands = (query: string) =>
  http.get<Brand[]>(`${BASE_API_URL}/resources/brand/search/${query}`)

/**
 * Product endpoints
 */

export const getProducts = (brandId?: number) =>
  http.get<BrandProducts>(`${BASE_API_URL}/resources/brand/${brandId}`)

export const getProductDetails = (data: {
  brandId?: number
  productId?: number
}) =>
  http.post<ProductDetails>(`${BASE_API_URL}/resources/product-details`, data)

export const getProductVariants = (product_id?: number) =>
  http.get<ProductVariant[]>(
    `${BASE_API_URL}/resources/product/variants/${product_id}`
  )

/**
 * Item endpoints
 */

export const getInventory = () => http.get<Item[]>(`${BASE_API_URL}/items`)

export const createItem = (data: CreateItem) =>
  http.post<Item>(`${BASE_API_URL}/item`, data)

export const deleteItem = (itemId: number) =>
  http.delete(`${BASE_API_URL}/item/${itemId}`)

export const updateItem = (data: EditItem) =>
  http.put<Item>(`${BASE_API_URL}/item`, data)

export const updateItemSortOrder = (data: UpdateItemSortOrder) =>
  http.put(`${BASE_API_URL}/item/sort`, data)

export const updateCategorySortOrder = (data: UpdateItemSortOrder) =>
  http.put(`${BASE_API_URL}/item/category/sort`, data)

export const importInventory = (data: UploadInventory) => {
  const formData = new FormData()
  formData.append('file', data.file)

  return http.post<ImportInventoryResponse>(
    `${BASE_API_URL}/item/import/csv`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  )
}

export const importLighterpack = (data: UploadInventory) => {
  const formData = new FormData()
  formData.append('file', data.file)

  return http.post<ImportInventoryResponse>(
    `${BASE_API_URL}/item/import/lighterpack`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  )
}

/**
 * Search endpoints
 */
export const searchItems = (query: string) =>
  http.get<Array<{ id: number; name: string; brand: string }>>(
    `${BASE_API_URL}/item/search?query=${encodeURIComponent(query)}`
  )

/**
 * Weather endpoints
 */
export const getWeatherForecast = (location: string, season: string) =>
  http.get<{
    location: string
    season: string
    forecast: {
      avg_temp: string
      precipitation: string
      conditions: string[]
      alerts: string[]
    }
  }>(
    `${BASE_API_URL}/weather-forecast?location=${encodeURIComponent(
      location
    )}&season=${encodeURIComponent(season)}`
  )
