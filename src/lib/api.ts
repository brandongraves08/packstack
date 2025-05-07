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
export function getApiUrl() {
  // Use a safe approach to avoid initialization errors
  return 'http://localhost:5001';
}

// For compatibility with existing code
export const BASE_API_URL = getApiUrl();

/**
 * User endpoints
 */
export const getUser = () => http.get<User>(`${getApiUrl()}/user`)

export const getProfile = (username: string) =>
  http.get<User>(`${getApiUrl()}/user/profile/${username}`)

export const uploadUserAvatar = (data: UploadAvatar) => {
  const formData = new FormData()
  formData.append('file', data.file)

  return http.post<User>(`${getApiUrl()}/user/avatar`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
}

export const updateUser = (data: UpdateUser) =>
  http.put<User>(`${getApiUrl()}/user`, data)

export const userLogin = (data: LoginRequest) =>
  http.post<AuthResponse>(`${getApiUrl()}/user/login`, data)

export const userRegister = (data: RegisterRequest) =>
  http.post<AuthResponse>(`${getApiUrl()}/user`, data)

export const requestPasswordReset = (email: string) =>
  http.post(`${getApiUrl()}/user/request-password-reset`, { email })

export const resetPassword = (data: PasswordReset) =>
  http.post(`${getApiUrl()}/user/reset-password`, data)

/**
 * Trip endpoints
 */

export const getTrip = (tripId?: string | number) =>
  http.get<Trip>(`${getApiUrl()}/trip/${tripId}`)

export const createTrip = (data: CreateTrip) =>
  http.post<Trip>(`${getApiUrl()}/trip`, data)

export const editTrip = (data: EditTrip) =>
  http.put<Trip>(`${getApiUrl()}/trip`, data)

export const cloneTrip = (tripId: number) =>
  http.post<Trip>(`${getApiUrl()}/trip/${tripId}/clone`)

export const deleteTrip = (tripId: number) =>
  http.delete<boolean>(`${getApiUrl()}/trip/${tripId}`)

/**
 * Pack endpoints
 */

export const getPack = (id?: string | number) =>
  http.get<Pack>(`${getApiUrl()}/pack/${id}`)

export const getTripPacks = (tripId?: string | number) =>
  http.get<Pack[]>(`${getApiUrl()}/pack/trip/${tripId}`)

export const createPack = (data: PackPayload) =>
  http.post<Pack>(`${getApiUrl()}/pack`, data)

export const updatePack = (packId: number, data: PackPayload) =>
  http.put(`${getApiUrl()}/pack/${packId}`, data)

export const deletePack = (packId: number) =>
  http.delete(`${getApiUrl()}/pack/${packId}`)

export const generatePack = (packId: number) =>
  http.post<Trip>(`${getApiUrl()}/pack/${packId}/generate`)

export const getUnassignedPacks = () =>
  http.get<Pack[]>(`${getApiUrl()}/pack/legacy/unassigned`)

/**
 * Category endpoints
 */

export const getCategories = () =>
  http.get<Category[]>(`${getApiUrl()}/category`)

/**
 * Brand endpoints
 */

export const getBrands = () =>
  http.get<Brand[]>(`${getApiUrl()}/resources/brands`)

export const searchBrands = (query: string) =>
  http.get<Brand[]>(`${getApiUrl()}/resources/brand/search/${query}`)

/**
 * Product endpoints
 */

export const getProducts = (brandId?: number) =>
  http.get<BrandProducts>(`${getApiUrl()}/resources/brand/${brandId}`)

export const getProductDetails = (data: {
  brandId?: number
  productId?: number
}) =>
  http.post<ProductDetails>(`${getApiUrl()}/resources/product-details`, data)

export const getProductVariants = (product_id?: number) =>
  http.get<ProductVariant[]>(
    `${getApiUrl()}/resources/product/variants/${product_id}`
  )

/**
 * Item endpoints
 */

export const getInventory = () => http.get<Item[]>(`${getApiUrl()}/items`)

export const createItem = (data: CreateItem) =>
  http.post<Item>(`${getApiUrl()}/item`, data)

export const deleteItem = (itemId: number) =>
  http.delete(`${getApiUrl()}/item/${itemId}`)

export const updateItem = (data: EditItem) =>
  http.put<Item>(`${getApiUrl()}/item`, data)

export const updateItemSortOrder = (data: UpdateItemSortOrder) =>
  http.put(`${getApiUrl()}/item/sort`, data)

export const updateCategorySortOrder = (data: UpdateItemSortOrder) =>
  http.put(`${getApiUrl()}/item/category/sort`, data)

export const importInventory = (data: UploadInventory) => {
  const formData = new FormData()
  formData.append('file', data.file)

  return http.post<ImportInventoryResponse>(
    `${getApiUrl()}/item/import/csv`,
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
    `${getApiUrl()}/item/import/lighterpack`,
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
    `${getApiUrl()}/item/search?query=${encodeURIComponent(query)}`
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
    `${getApiUrl()}/weather-forecast?location=${encodeURIComponent(
      location
    )}&season=${encodeURIComponent(season)}`
  )
