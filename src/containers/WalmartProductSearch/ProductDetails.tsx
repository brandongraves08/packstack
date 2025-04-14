import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Loading } from '@/components/ui/Loading'
import { WalmartProduct } from '@/lib/walmartApi'
import walmartApi from '@/lib/walmartApi'

interface ProductDetailsProps {
  product: WalmartProduct
  onBack: () => void
  onAddToInventory?: (product: any) => void
}

const ProductDetails: React.FC<ProductDetailsProps> = ({
  product,
  onBack,
  onAddToInventory,
}) => {
  const [zipCode, setZipCode] = useState('')
  const [checkingStore, setCheckingStore] = useState(false)
  const [storeAvailability, setStoreAvailability] = useState<any>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['walmartProductDetails', product.asin],
    queryFn: () => walmartApi.getProductDetails(product.asin),
  })

  const handleCheckStore = async () => {
    if (!zipCode) return

    setCheckingStore(true)
    try {
      const result = await walmartApi.checkStoreAvailability(
        product.asin,
        zipCode
      )
      setStoreAvailability(result.storeAvailability)
    } catch (error) {
      console.error('Error checking store availability:', error)
    } finally {
      setCheckingStore(false)
    }
  }

  const handleAddToInventory = () => {
    if (onAddToInventory && data?.product) {
      // Format the product data for inventory
      const inventoryItem = {
        name: data.product.title,
        description: data.product.description || '',
        weight: 0, // Weight would need to be extracted from specifications
        price: data.product.price.amount,
        category: data.product.category.split('/').pop() || 'Uncategorized',
        brand: data.product.brand || '',
        productUrl: data.product.url,
        consumable: false,
        image: data.product.images[0] || '',
      }

      // Extract weight from specifications if available
      const weightSpec = data.product.specifications?.find(spec =>
        spec.name.toLowerCase().includes('weight')
      )

      if (weightSpec) {
        // Try to extract numeric weight value
        const weightMatch = weightSpec.value.match(/(\d+(\.\d+)?)/)
        if (weightMatch) {
          inventoryItem.weight = parseFloat(weightMatch[0])
        }
      }

      onAddToInventory(inventoryItem)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loading />
      </div>
    )
  }

  if (error || !data?.success) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-lg">
        <p>Error loading product details.</p>
        <Button onClick={onBack} variant="outline" className="mt-4">
          Back to Search
        </Button>
      </div>
    )
  }

  const productDetails = data.product

  return (
    <div className="w-full rounded-lg border border-gray-200 p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 bg-white">
      <Button onClick={onBack} variant="outline" size="sm" className="mb-4">
        ← Back to Search
      </Button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Product Images */}
        <div className="col-span-1">
          <div className="border p-2 rounded-lg bg-white dark:bg-gray-700 mb-4">
            {productDetails.images && productDetails.images.length > 0 ? (
              <img
                src={productDetails.images[0]}
                alt={productDetails.title}
                className="w-full h-auto object-contain"
              />
            ) : (
              <div className="w-full h-48 bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                No Image
              </div>
            )}
          </div>

          {/* Price and Buy Actions */}
          <div className="border rounded-lg p-4 space-y-4">
            <div className="text-2xl font-bold text-blue-600">
              {productDetails.price.formatted}
            </div>

            <div className="text-sm">
              <span
                className={`font-medium ${
                  productDetails.availability.includes('In Stock')
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >
                {productDetails.availability}
              </span>
            </div>

            <div className="pt-2">
              {onAddToInventory && (
                <Button onClick={handleAddToInventory} className="w-full mb-2">
                  Add to Inventory
                </Button>
              )}

              <a
                href={productDetails.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" className="w-full">
                  View on Walmart
                </Button>
              </a>
            </div>

            {/* Store Pickup Check */}
            {productDetails.storePickupAvailable && (
              <div className="pt-2 border-t mt-4">
                <h4 className="font-medium mb-2">Check Store Availability</h4>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={zipCode}
                    onChange={e => setZipCode(e.target.value)}
                    placeholder="Enter ZIP code"
                    className="flex-1"
                  />
                  <Button
                    onClick={handleCheckStore}
                    disabled={!zipCode || checkingStore}
                    variant="outline"
                  >
                    {checkingStore ? <Loading size="sm" /> : 'Check'}
                  </Button>
                </div>

                {storeAvailability && (
                  <div className="mt-2 text-sm">
                    {/* Display store availability information */}
                    {storeAvailability.stores?.length > 0 ? (
                      <div>
                        <p className="text-green-600 font-medium">
                          Available at {storeAvailability.stores.length} stores
                          near you
                        </p>
                        <ul className="mt-1 space-y-1">
                          {storeAvailability.stores
                            .slice(0, 3)
                            .map((store: any, index: number) => (
                              <li key={index} className="text-xs">
                                {store.storeName} - {store.distance} miles
                              </li>
                            ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="text-red-600">
                        Not available at stores near you
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Product Details */}
        <div className="col-span-2 space-y-6">
          <div>
            <h1 className="text-xl font-bold mb-2">{productDetails.title}</h1>

            <div className="flex items-center mb-4">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className={`w-5 h-5 ${
                      i < Math.round(productDetails.rating)
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
              <span className="text-sm ml-1 text-gray-600">
                {productDetails.rating.toFixed(1)} (
                {productDetails.totalReviews} reviews)
              </span>
              {productDetails.brand && (
                <span className="ml-4 text-sm text-gray-600">
                  Brand:{' '}
                  <span className="font-medium">{productDetails.brand}</span>
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          {productDetails.description && (
            <div>
              <h2 className="text-lg font-semibold mb-2">Description</h2>
              <div
                className="text-sm text-gray-700 dark:text-gray-300 space-y-2"
                dangerouslySetInnerHTML={{ __html: productDetails.description }}
              />
            </div>
          )}

          {/* Features */}
          {productDetails.features && productDetails.features.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-2">Features</h2>
              <ul className="list-disc list-inside text-sm space-y-1 text-gray-700 dark:text-gray-300">
                {productDetails.features.map((feature, index) => (
                  <li key={index}>{feature}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Specifications */}
          {productDetails.specifications &&
            productDetails.specifications.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-2">Specifications</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                  {productDetails.specifications.map((spec, index) => (
                    <div key={index} className="text-sm">
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {spec.name}:{' '}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {spec.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  )
}

export default ProductDetails
