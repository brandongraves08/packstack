import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Loading } from '@/components/ui/Loading'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import walmartApi, { WalmartProduct } from '@/lib/walmartApi'

import ProductDetails from './ProductDetails'

interface WalmartProductSearchProps {
  onSelectProduct?: (product: WalmartProduct) => void
  standalone?: boolean
}

const WalmartProductSearch: React.FC<WalmartProductSearchProps> = ({
  onSelectProduct,
  standalone = false,
}) => {
  const [keywords, setKeywords] = useState('')
  const [category, setCategory] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<WalmartProduct | null>(
    null
  )
  const [isSearching, setIsSearching] = useState(false)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['walmartSearch', keywords, category],
    queryFn: () => walmartApi.searchProducts(keywords, category),
    enabled: false, // Don't run query on component mount
  })

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!keywords) return

    setIsSearching(true)
    await refetch()
    setIsSearching(false)
  }

  const handleSelectProduct = (product: WalmartProduct) => {
    setSelectedProduct(product)
    if (onSelectProduct) {
      onSelectProduct(product)
    }
  }

  const handleBackToSearch = () => {
    setSelectedProduct(null)
  }

  // Define Walmart categories
  const categories = [
    { value: '', label: 'All Categories' },
    { value: '4125', label: 'Sports & Outdoors' },
    { value: '4128', label: 'Camping & Hiking' },
    { value: '4129', label: 'Backpacks' },
    { value: '4130', label: 'Tents' },
    { value: '4131', label: 'Sleeping Bags' },
    { value: '4132', label: 'Cooking Equipment' },
  ]

  // If a product is selected and we're in standalone mode, show the product details
  if (selectedProduct && standalone) {
    return (
      <ProductDetails product={selectedProduct} onBack={handleBackToSearch} />
    )
  }

  return (
    <div className="w-full p-4 space-y-4 rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="text-xl font-semibold mb-2">Search Walmart Products</div>

      <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-2">
        <Input
          type="text"
          value={keywords}
          onChange={e => setKeywords(e.target.value)}
          placeholder="Enter keywords..."
          className="flex-1"
        />

        <Select onValueChange={setCategory} value={category}>
          <SelectTrigger className="min-w-[200px]">
            <SelectValue placeholder="Select Category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map(category => (
              <SelectItem key={category.value} value={category.value}>
                {category.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button type="submit" disabled={!keywords || isLoading || isSearching}>
          {isLoading || isSearching ? <Loading size="sm" /> : 'Search'}
        </Button>
      </form>

      {error && (
        <div className="text-red-500 mt-2">
          Error: {error instanceof Error ? error.message : 'An error occurred'}
        </div>
      )}

      {data?.products && data.products.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {data.products.map(product => (
            <div
              key={product.asin}
              className="p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700"
              onClick={() => handleSelectProduct(product)}
            >
              <div className="flex flex-col md:flex-row gap-4">
                <div className="w-24 h-24 flex-shrink-0">
                  {product.image && (
                    <img
                      src={product.image}
                      alt={product.title}
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-sm line-clamp-2">
                    {product.title}
                  </h3>
                  <div className="text-lg font-bold mt-1 text-blue-600">
                    {product.price.formatted}
                  </div>
                  <div className="flex items-center mt-1">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <svg
                          key={i}
                          className={`w-4 h-4 ${
                            i < Math.round(product.rating)
                              ? 'text-yellow-400'
                              : 'text-gray-300'
                          }`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <span className="text-xs ml-1 text-gray-500">
                      ({product.totalReviews})
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : data && data.products.length === 0 ? (
        <div className="text-center text-gray-500 my-8">
          No products found. Try different keywords or categories.
        </div>
      ) : null}
    </div>
  )
}

export default WalmartProductSearch
