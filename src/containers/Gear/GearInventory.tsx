import { useState } from 'react'
import { Filter, Plus, Search } from 'lucide-react'

import { EmptyState } from '@/components/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/Dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import { Input } from '@/components/ui/Input'
import { Loading } from '@/components/ui/Loading'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { ItemForm } from '@/containers/ItemForm/ItemForm'
import { useInventory } from '@/queries/item'
import { Item } from '@/types/item'

export const GearInventory = () => {
  const { data: inventory, isLoading } = useInventory()
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('name')

  // Extract and filter non-food gear items
  const gearItems = inventory?.filter(item => !item.is_food) || []

  // Filter by search term
  const filteredItems = gearItems.filter(item => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.brand?.name?.toLowerCase().includes(searchTerm.toLowerCase())

    if (activeTab === 'all') return matchesSearch
    if (activeTab === 'wishlist') return matchesSearch && item.wishlist
    if (activeTab === 'consumables') return matchesSearch && item.consumable

    // Otherwise, filter by category
    return (
      matchesSearch &&
      item.category?.category?.name?.toLowerCase() === activeTab.toLowerCase()
    )
  })

  // Sort items based on sortBy
  const sortedItems = [...filteredItems].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name)
      case 'weight-asc':
        return (a.weight || 0) - (b.weight || 0)
      case 'weight-desc':
        return (b.weight || 0) - (a.weight || 0)
      case 'price-asc':
        return (a.price || 0) - (b.price || 0)
      case 'price-desc':
        return (b.price || 0) - (a.price || 0)
      default:
        return 0
    }
  })

  // Group items by category
  const groupedByCategory: Record<string, Item[]> = sortedItems.reduce(
    (acc, item) => {
      const category = item.category?.category?.name || 'Uncategorized'
      if (!acc[category]) acc[category] = []
      acc[category].push(item)
      return acc
    },
    {} as Record<string, Item[]>
  )

  // Get unique categories for tabs
  const uniqueCategories = [
    ...new Set(
      gearItems.map(item => item.category?.category?.name || 'Uncategorized')
    ),
  ].sort()

  // Calculate total weight and cost
  const totalWeight = filteredItems.reduce(
    (sum, item) => sum + (item.weight || 0),
    0
  )
  const totalCost = filteredItems.reduce(
    (sum, item) => sum + (item.price || 0),
    0
  )

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loading />
      </div>
    )
  }

  const renderGearItem = (item: Item) => {
    return (
      <Card key={item.id} className="mb-3">
        <CardHeader className="p-4 pb-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg">{item.name}</CardTitle>
              <CardDescription>
                {item.brand?.name && (
                  <span className="mr-2">{item.brand.name}</span>
                )}
                {item.weight !== null && item.weight !== undefined && (
                  <span className="text-sm">
                    {item.weight}
                    {item.unit}
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="flex space-x-1">
              {item.wishlist && (
                <Badge
                  variant="outline"
                  className="border-yellow-500 text-yellow-500"
                >
                  Wishlist
                </Badge>
              )}
              {item.consumable && (
                <Badge
                  variant="outline"
                  className="border-blue-500 text-blue-500"
                >
                  Consumable
                </Badge>
              )}
              {item.category?.category?.name && (
                <Badge variant="secondary">{item.category.category.name}</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <div className="flex flex-col space-y-1 text-sm">
            {item.notes && (
              <p className="text-muted-foreground">{item.notes}</p>
            )}

            <div className="flex justify-between mt-2">
              <div className="flex items-center text-xs">
                {item.price !== null &&
                  item.price !== undefined &&
                  item.price > 0 && (
                    <span className="text-green-600 font-medium">
                      ${item.price.toFixed(2)}
                    </span>
                  )}
              </div>

              {item.product_url && (
                <a
                  href={item.product_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-500 hover:text-blue-700"
                >
                  View Product
                </a>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gear Inventory</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Gear Item
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Add New Gear Item</DialogTitle>
            </DialogHeader>
            <ItemForm
              title="Add New Gear Item"
              open={open}
              onOpenChange={setOpen}
              onClose={() => setOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-6">
        <div className="flex gap-2 mb-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search gear..."
              className="pl-10"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                Sort
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSortBy('name')}>
                Name
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('weight-asc')}>
                Weight (Low to High)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('weight-desc')}>
                Weight (High to Low)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('price-asc')}>
                Price (Low to High)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('price-desc')}>
                Price (High to Low)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4 flex-wrap h-auto py-1">
            <TabsTrigger value="all">All Gear</TabsTrigger>
            {uniqueCategories.map(category => (
              <TabsTrigger key={category} value={category.toLowerCase()}>
                {category}
              </TabsTrigger>
            ))}
            <TabsTrigger value="wishlist">Wishlist</TabsTrigger>
            <TabsTrigger value="consumables">Consumables</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-0">
            {filteredItems.length === 0 ? (
              <EmptyState
                heading="No gear items found"
                subheading="Gear Inventory"
              >
                <p>
                  Add gear to your inventory to track your outdoor equipment.
                </p>
              </EmptyState>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(groupedByCategory).map(
                    ([category, items]) => (
                      <div key={category} className="mb-6">
                        <h3 className="text-lg font-medium mb-3">{category}</h3>
                        {items.map(renderGearItem)}
                      </div>
                    )
                  )}
                </div>

                <Card className="mt-8">
                  <CardHeader>
                    <CardTitle>Gear Summary</CardTitle>
                    <CardDescription>
                      Showing {filteredItems.length} of {gearItems.length} items
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                        <p className="text-2xl font-bold">
                          {totalWeight.toFixed(2)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Total Weight
                        </p>
                      </div>
                      <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-md">
                        <p className="text-2xl font-bold">
                          ${totalCost.toFixed(2)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Total Cost
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Category-specific tabs */}
          {[...uniqueCategories, 'wishlist', 'consumables'].map(tabValue => (
            <TabsContent
              key={tabValue}
              value={tabValue.toLowerCase()}
              className="mt-0"
            >
              {filteredItems.length === 0 ? (
                <EmptyState
                  heading={`No ${tabValue} items found`}
                  subheading="Gear Inventory"
                >
                  <p>
                    Add {tabValue} items to your inventory to track your outdoor
                    equipment.
                  </p>
                </EmptyState>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredItems.map(renderGearItem)}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  )
}
