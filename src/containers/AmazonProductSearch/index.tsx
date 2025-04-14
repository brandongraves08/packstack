import { useState } from 'react'

import { Button } from '../../components/ui/Button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/Dialog'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { ScrollArea } from '../../components/ui/ScrollArea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/Select'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../components/ui/Tabs'
import { useToast } from '../../hooks/useToast'
import { AmazonProduct, searchAmazonProducts } from '../../lib/amazonApi'
import { Mixpanel } from '../../lib/mixpanel'
import ProductDetails from './ProductDetails'

interface AmazonProductSearchProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSelectProduct?: (product: AmazonProduct) => void
  standalone?: boolean
}

export const AmazonProductSearch = ({
  open,
  onOpenChange,
  onSelectProduct,
  standalone = false,
}: AmazonProductSearchProps) => {
  const [keywords, setKeywords] = useState('')
  const [category, setCategory] = useState('Outdoors')
  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState<AmazonProduct[]>([])
  const [selectedProduct, setSelectedProduct] = useState<AmazonProduct | null>(
    null
  )
  const [activeTab, setActiveTab] = useState<string>('search')
  const { toast } = useToast()

  const handleSearch = async () => {
    if (!keywords.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter search keywords',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    setProducts([])

    try {
      const result = await searchAmazonProducts(keywords, category)

      if (result.success && result.products) {
        setProducts(result.products)
        Mixpanel.track('Amazon:Search', { keywords, category })
      } else {
        toast({
          title: 'Error',
          description: result.message || 'Failed to search products',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error searching products:', error)
      toast({
        title: 'Error',
        description: 'An error occurred while searching',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !loading) {
      handleSearch()
    }
  }

  const handleSelectProduct = (product: AmazonProduct) => {
    setSelectedProduct(product)
    setActiveTab('details')
    Mixpanel.track('Amazon:ProductSelect', {
      productId: product.id,
      productTitle: product.title,
    })
  }

  const handleAddToInventory = (product: AmazonProduct) => {
    if (onSelectProduct) {
      onSelectProduct(product)
      onOpenChange?.(false)
      Mixpanel.track('Amazon:AddToInventory', {
        productId: product.id,
        productTitle: product.title,
      })
    }
  }

  if (standalone && selectedProduct && activeTab === 'details') {
    return (
      <div className="p-4 border rounded-lg bg-white dark:bg-gray-800">
        <div className="mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveTab('search')}
          >
            ← Back to Search
          </Button>
        </div>
        <ProductDetails
          productId={selectedProduct.id}
          onAddToInventory={() => handleAddToInventory(selectedProduct)}
        />
      </div>
    )
  }

  if (standalone) {
    return (
      <div className="p-4 space-y-4 border rounded-lg bg-white dark:bg-gray-800">
        <h2 className="text-xl font-semibold">Amazon Product Search</h2>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
          <div className="md:col-span-3">
            <Label htmlFor="keywords">Search</Label>
            <Input
              id="keywords"
              placeholder="Enter product name or keywords..."
              value={keywords}
              onChange={e => setKeywords(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className="md:col-span-1">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Outdoors">Outdoors</SelectItem>
                <SelectItem value="Sports">Sports</SelectItem>
                <SelectItem value="Apparel">Clothing</SelectItem>
                <SelectItem value="Electronics">Electronics</SelectItem>
                <SelectItem value="All">All Categories</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-1 flex items-end">
            <Button
              onClick={handleSearch}
              disabled={loading || !keywords.trim()}
              className="w-full"
            >
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </div>
        </div>

        {products.length > 0 ? (
          <ScrollArea className="h-[400px] border rounded-md p-2">
            <div className="space-y-4 p-2">
              {products.map(product => (
                <div
                  key={product.id}
                  className="flex gap-4 p-3 border rounded-md hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer"
                  onClick={() => handleSelectProduct(product)}
                >
                  <div className="w-24 h-24 flex-shrink-0 bg-slate-100 dark:bg-slate-800 rounded-md overflow-hidden">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.title}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        No Image
                      </div>
                    )}
                  </div>
                  <div className="flex-grow">
                    <h3 className="font-medium line-clamp-2">
                      {product.title}
                    </h3>
                    <div className="text-sm text-slate-500 mt-1">
                      <span className="font-medium">{product.price}</span>
                      {product.prime && (
                        <span className="ml-2 text-blue-600 font-medium">
                          Prime
                        </span>
                      )}
                    </div>
                    {product.brand && (
                      <div className="text-xs text-slate-400 mt-1">
                        Brand: {product.brand}
                      </div>
                    )}
                    <div className="mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={e => {
                          e.stopPropagation()
                          handleAddToInventory(product)
                        }}
                      >
                        Add to Inventory
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="h-[400px] flex items-center justify-center border rounded-md">
            {loading ? (
              <div className="text-center text-slate-500">
                Searching products...
              </div>
            ) : (
              <div className="text-center text-slate-500">
                {keywords.trim()
                  ? 'No products found'
                  : 'Search for outdoor gear to find products'}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl min-h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Amazon Product Search</DialogTitle>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-grow flex flex-col"
        >
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="search">Search Products</TabsTrigger>
            <TabsTrigger value="details" disabled={!selectedProduct}>
              Product Details
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="flex-grow flex flex-col">
            <div className="grid grid-cols-5 gap-4 mb-4">
              <div className="col-span-3">
                <Label htmlFor="keywords">Search</Label>
                <Input
                  id="keywords"
                  placeholder="Enter product name or keywords..."
                  value={keywords}
                  onChange={e => setKeywords(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </div>
              <div className="col-span-1">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Outdoors">Outdoors</SelectItem>
                    <SelectItem value="Sports">Sports</SelectItem>
                    <SelectItem value="Apparel">Clothing</SelectItem>
                    <SelectItem value="Electronics">Electronics</SelectItem>
                    <SelectItem value="All">All Categories</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-1 flex items-end">
                <Button
                  onClick={handleSearch}
                  disabled={loading || !keywords.trim()}
                  className="w-full"
                >
                  {loading ? 'Searching...' : 'Search'}
                </Button>
              </div>
            </div>

            {products.length > 0 ? (
              <ScrollArea className="flex-grow border rounded-md p-2">
                <div className="space-y-4 p-2">
                  {products.map(product => (
                    <div
                      key={product.id}
                      className="flex gap-4 p-3 border rounded-md hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer"
                      onClick={() => handleSelectProduct(product)}
                    >
                      <div className="w-24 h-24 flex-shrink-0 bg-slate-100 dark:bg-slate-800 rounded-md overflow-hidden">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.title}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            No Image
                          </div>
                        )}
                      </div>
                      <div className="flex-grow">
                        <h3 className="font-medium line-clamp-2">
                          {product.title}
                        </h3>
                        <div className="text-sm text-slate-500 mt-1">
                          <span className="font-medium">{product.price}</span>
                          {product.prime && (
                            <span className="ml-2 text-blue-600 font-medium">
                              Prime
                            </span>
                          )}
                        </div>
                        {product.brand && (
                          <div className="text-xs text-slate-400 mt-1">
                            Brand: {product.brand}
                          </div>
                        )}
                        <div className="mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={e => {
                              e.stopPropagation()
                              handleAddToInventory(product)
                            }}
                          >
                            Add to Inventory
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex-grow flex items-center justify-center">
                {loading ? (
                  <div className="text-center text-slate-500">
                    Searching products...
                  </div>
                ) : (
                  <div className="text-center text-slate-500">
                    {keywords.trim()
                      ? 'No products found'
                      : 'Search for outdoor gear to find products'}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="details" className="flex-grow">
            {selectedProduct && (
              <ProductDetails
                productId={selectedProduct.id}
                onAddToInventory={() => handleAddToInventory(selectedProduct)}
              />
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
