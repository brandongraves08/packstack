import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Loading } from '@/components/ui/Loading'

import { BASE_API_URL } from '../../lib/config'

interface ComparisonItem {
  title: string
  amazon_price: number
  amazon_url: string
  walmart_price: number
  walmart_url: string
  price_difference: number
}

interface PriceComparisonResponse {
  success: boolean
  amazon: any[]
  walmart: any[]
  comparison: ComparisonItem[]
  error?: string
}

const PriceComparison: React.FC = () => {
  const [keywords, setKeywords] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['priceComparison', keywords],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.append('keywords', keywords)

      const response = await fetch(
        `${BASE_API_URL}/compare-prices?${params.toString()}`
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to compare prices')
      }

      return (await response.json()) as PriceComparisonResponse
    },
    enabled: false, // Don't run query on component mount
  })

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!keywords) return

    setIsSearching(true)
    await refetch()
    setIsSearching(false)
  }

  const renderPriceDifference = (amazonPrice: number, walmartPrice: number) => {
    const difference = amazonPrice - walmartPrice
    const percentDiff = (
      (Math.abs(difference) / Math.max(amazonPrice, walmartPrice)) *
      100
    ).toFixed(1)

    if (difference > 0) {
      // Walmart is cheaper
      return (
        <div className="text-green-600 font-medium">
          Save ${difference.toFixed(2)} ({percentDiff}%) at Walmart
        </div>
      )
    } else if (difference < 0) {
      // Amazon is cheaper
      return (
        <div className="text-green-600 font-medium">
          Save ${Math.abs(difference).toFixed(2)} ({percentDiff}%) at Amazon
        </div>
      )
    } else {
      return <div className="text-gray-600">Same price</div>
    }
  }

  return (
    <div className="w-full p-4 space-y-4 rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="text-xl font-semibold mb-2">Price Comparison</div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          type="text"
          value={keywords}
          onChange={e => setKeywords(e.target.value)}
          placeholder="Enter product to compare prices..."
          className="flex-1"
        />

        <Button type="submit" disabled={!keywords || isLoading || isSearching}>
          {isLoading || isSearching ? <Loading size="sm" /> : 'Compare'}
        </Button>
      </form>

      {error && (
        <div className="text-red-500 mt-2">
          Error: {error instanceof Error ? error.message : 'An error occurred'}
        </div>
      )}

      {data?.success && (
        <div className="mt-4 space-y-6">
          {/* Price Comparison Results */}
          {data.comparison && data.comparison.length > 0 ? (
            <div>
              <h3 className="text-lg font-medium mb-3">Price Comparison</h3>
              <div className="space-y-4">
                {data.comparison.map((item, index) => (
                  <div
                    key={index}
                    className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-700"
                  >
                    <h4 className="font-medium mb-2">{item.title}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Amazon
                        </div>
                        <div className="font-bold">
                          ${item.amazon_price.toFixed(2)}
                        </div>
                        <a
                          href={item.amazon_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          View on Amazon
                        </a>
                      </div>

                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Walmart
                        </div>
                        <div className="font-bold">
                          ${item.walmart_price.toFixed(2)}
                        </div>
                        <a
                          href={item.walmart_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          View on Walmart
                        </a>
                      </div>

                      <div className="flex items-center">
                        {renderPriceDifference(
                          item.amazon_price,
                          item.walmart_price
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 my-8">
              No direct price comparisons found. You can view individual results
              below.
            </div>
          )}

          {/* Individual Results */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Amazon Results */}
            <div>
              <h3 className="text-lg font-medium mb-3">Amazon Results</h3>
              {data.amazon && data.amazon.length > 0 ? (
                <div className="space-y-3">
                  {data.amazon.slice(0, 5).map((item, index) => (
                    <div
                      key={index}
                      className="p-3 border rounded-lg flex items-center gap-3"
                    >
                      {item.image && (
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-16 h-16 object-contain"
                        />
                      )}
                      <div className="flex-1">
                        <div className="text-sm font-medium line-clamp-2">
                          {item.title}
                        </div>
                        <div className="text-blue-600 font-bold">
                          {item.price.formatted}
                        </div>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          View on Amazon
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 p-4 border rounded-lg">
                  No Amazon results found
                </div>
              )}
            </div>

            {/* Walmart Results */}
            <div>
              <h3 className="text-lg font-medium mb-3">Walmart Results</h3>
              {data.walmart && data.walmart.length > 0 ? (
                <div className="space-y-3">
                  {data.walmart.slice(0, 5).map((item, index) => (
                    <div
                      key={index}
                      className="p-3 border rounded-lg flex items-center gap-3"
                    >
                      {item.image && (
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-16 h-16 object-contain"
                        />
                      )}
                      <div className="flex-1">
                        <div className="text-sm font-medium line-clamp-2">
                          {item.title}
                        </div>
                        <div className="text-blue-600 font-bold">
                          {item.price.formatted}
                        </div>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          View on Walmart
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 p-4 border rounded-lg">
                  No Walmart results found
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PriceComparison
