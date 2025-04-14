import { useEffect, useState } from 'react'

import { Button } from '../../components/ui/Button'
import { ScrollArea } from '../../components/ui/ScrollArea'
import { useToast } from '../../hooks/useToast'
import {
  AmazonProductDetail,
  getAmazonProductDetails,
} from '../../lib/amazonApi'

interface ProductDetailsProps {
  productId: string
  onAddToInventory: () => void
}

const ProductDetails = ({
  productId,
  onAddToInventory,
}: ProductDetailsProps) => {
  const [product, setProduct] = useState<AmazonProductDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState<string>('')
  const { toast } = useToast()

  useEffect(() => {
    const fetchProductDetails = async () => {
      setLoading(true)
      try {
        const result = await getAmazonProductDetails(productId)

        if (result.success && result.product) {
          setProduct(result.product)
          if (result.product.images && result.product.images.length > 0) {
            setSelectedImage(result.product.images[0])
          }
        } else {
          toast({
            title: 'Error',
            description: result.message || 'Failed to get product details',
            variant: 'destructive',
          })
        }
      } catch (error) {
        console.error('Error getting product details:', error)
        toast({
          title: 'Error',
          description: 'An error occurred while retrieving product details',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    if (productId) {
      fetchProductDetails()
    }
  }, [productId, toast])

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-slate-500">
          Loading product details...
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-slate-500">Product not found</div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
      <div className="flex flex-col gap-4">
        <div className="bg-slate-100 dark:bg-slate-800 rounded-md flex items-center justify-center p-4">
          {selectedImage ? (
            <img
              src={selectedImage}
              alt={product.title}
              className="max-h-[300px] max-w-full object-contain"
            />
          ) : (
            <div className="h-[300px] w-full flex items-center justify-center text-slate-400">
              No Image Available
            </div>
          )}
        </div>

        {product.images && product.images.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {product.images.map((image, index) => (
              <button
                key={index}
                className={`w-16 h-16 rounded-md overflow-hidden border-2 ${
                  selectedImage === image
                    ? 'border-blue-500'
                    : 'border-transparent'
                }`}
                onClick={() => setSelectedImage(image)}
              >
                <img
                  src={image}
                  alt={`Product view ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      <ScrollArea className="h-[500px]">
        <div className="space-y-4 p-2">
          <h2 className="text-xl font-semibold">{product.title}</h2>

          <div className="flex items-center gap-2">
            <div className="text-xl font-bold">{product.price}</div>
            {product.prime && (
              <span className="text-blue-600 font-medium text-sm bg-blue-50 px-2 py-1 rounded">
                Prime
              </span>
            )}
          </div>

          {product.brand && (
            <div className="text-sm">
              <span className="text-slate-500">Brand:</span> {product.brand}
            </div>
          )}

          {product.weight && (
            <div className="text-sm">
              <span className="text-slate-500">Weight:</span> {product.weight}{' '}
              {product.weight_unit}
            </div>
          )}

          <div className="flex gap-3 mt-4">
            <Button onClick={onAddToInventory}>Add to Inventory</Button>
            <Button
              variant="outline"
              onClick={() => window.open(product.url, '_blank')}
            >
              View on Amazon
            </Button>
          </div>

          {product.features && product.features.length > 0 && (
            <div className="mt-4">
              <h3 className="font-medium mb-2">Product Features</h3>
              <ul className="list-disc pl-5 space-y-1">
                {product.features.map((feature, index) => (
                  <li key={index} className="text-sm">
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

export default ProductDetails
