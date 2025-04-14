import { BASE_API_URL } from './config'

export interface WalmartProduct {
  asin: string
  title: string
  url: string
  image: string
  price: {
    amount: number
    currency: string
    formatted: string
  }
  rating: number
  totalReviews: number
  category: string
  source: 'walmart'
}

export interface WalmartProductDetail extends WalmartProduct {
  description: string
  images: string[]
  availability: string
  features: string[]
  brand: string
  specifications: Array<{
    name: string
    value: string
  }>
  storePickupAvailable: boolean
  storePickupLocations?: any[]
}

export interface WalmartSearchResponse {
  success: boolean
  products: WalmartProduct[]
  total: number
  error?: string
}

export interface WalmartProductDetailResponse {
  success: boolean
  product: WalmartProductDetail
  error?: string
}

export interface StoreAvailabilityResponse {
  success: boolean
  storeAvailability: any
  error?: string
}

const walmartApi = {
  /**
   * Search for products on Walmart
   */
  searchProducts: async (
    keywords: string,
    category?: string,
    maxResults: number = 10
  ): Promise<WalmartSearchResponse> => {
    try {
      const params = new URLSearchParams()
      params.append('keywords', keywords)
      if (category) params.append('category', category)
      params.append('max_results', maxResults.toString())

      const response = await fetch(
        `${BASE_API_URL}/walmart/search?${params.toString()}`
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(
          errorData.message || 'Failed to search Walmart products'
        )
      }

      return await response.json()
    } catch (error) {
      console.error('Error searching Walmart products:', error)
      return {
        success: false,
        products: [],
        total: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  },

  /**
   * Get detailed information about a specific Walmart product
   */
  getProductDetails: async (
    itemId: string
  ): Promise<WalmartProductDetailResponse> => {
    try {
      const response = await fetch(`${BASE_API_URL}/walmart/product/${itemId}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(
          errorData.message || 'Failed to get Walmart product details'
        )
      }

      return await response.json()
    } catch (error) {
      console.error('Error getting Walmart product details:', error)
      return {
        success: false,
        product: {} as WalmartProductDetail,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  },

  /**
   * Check store availability for a product
   */
  checkStoreAvailability: async (
    itemId: string,
    zipCode: string
  ): Promise<StoreAvailabilityResponse> => {
    try {
      const params = new URLSearchParams()
      params.append('zip_code', zipCode)

      const response = await fetch(
        `${BASE_API_URL}/walmart/store-availability/${itemId}?${params.toString()}`
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(
          errorData.message || 'Failed to check store availability'
        )
      }

      return await response.json()
    } catch (error) {
      console.error('Error checking store availability:', error)
      return {
        success: false,
        storeAvailability: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  },
}

export default walmartApi
