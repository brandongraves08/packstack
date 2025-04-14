import axios from 'axios'

// Base URL for our server with Amazon API endpoints
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001'

export type AmazonProduct = {
  id: string
  title: string
  brand: string
  url: string
  image: string
  price: string
  prime: boolean
}

export type AmazonProductDetail = {
  id: string
  title: string
  brand: string
  url: string
  images: string[]
  price: string
  features: string[]
  weight: string | null
  weight_unit: string | null
  prime: boolean
}

export type SearchResult = {
  success: boolean
  products?: AmazonProduct[]
  error?: string
  message?: string
}

export type ProductResult = {
  success: boolean
  product?: AmazonProductDetail
  error?: string
  message?: string
}

/**
 * Search for products on Amazon by keywords
 */
export const searchAmazonProducts = async (
  keywords: string,
  category = 'Outdoors',
  maxResults = 10
): Promise<SearchResult> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/amazon/search`, {
      params: {
        keywords,
        category,
        max_results: maxResults,
      },
    })
    return response.data
  } catch (error) {
    console.error('Error searching Amazon products:', error)
    return {
      success: false,
      error: 'Failed to search products',
      message: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get detailed information for a specific Amazon product by ASIN
 */
export const getAmazonProductDetails = async (
  asin: string
): Promise<ProductResult> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/amazon/product/${asin}`)
    return response.data
  } catch (error) {
    console.error('Error getting Amazon product details:', error)
    return {
      success: false,
      error: 'Failed to get product details',
      message: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
