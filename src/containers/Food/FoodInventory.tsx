import { useState } from 'react'
import { format } from 'date-fns'
import { CalendarIcon, Clock, Plus, Search, Tag } from 'lucide-react'

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
import { Input } from '@/components/ui/Input'
import { Loading } from '@/components/ui/Loading'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { useInventory } from '@/queries/item'
import { Item } from '@/types/item'

import { FoodItemForm } from './FoodItemForm'

export const FoodInventory = () => {
  const { data: inventory, isLoading } = useInventory()
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<string>('all')

  // Extract and filter food items from inventory
  const foodItems = inventory?.filter(item => item.is_food) || []

  // Filter by search term and active tab
  const filteredItems = foodItems.filter(item => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.brand?.name?.toLowerCase().includes(searchTerm.toLowerCase())

    if (activeTab === 'all') return matchesSearch
    if (activeTab === 'expired') {
      return (
        matchesSearch &&
        item.expiration_date &&
        new Date(item.expiration_date) < new Date()
      )
    }
    return matchesSearch && item.food_type === activeTab
  })

  // Group items by food type
  const groupedByType: Record<string, Item[]> = filteredItems.reduce(
    (acc, item) => {
      const type = item.food_type || 'other'
      if (!acc[type]) acc[type] = []
      acc[type].push(item)
      return acc
    },
    {} as Record<string, Item[]>
  )

  // Calculate nutritional totals for the filtered items
  const nutritionTotals = filteredItems.reduce(
    (totals, item) => {
      if (item.calories_per_serving) {
        totals.calories += item.calories_per_serving
      }
      if (item.nutrition_info?.protein) {
        totals.protein += item.nutrition_info.protein
      }
      if (item.nutrition_info?.carbs) {
        totals.carbs += item.nutrition_info.carbs
      }
      if (item.nutrition_info?.fat) {
        totals.fat += item.nutrition_info.fat
      }
      return totals
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loading />
      </div>
    )
  }

  const renderFoodItem = (item: Item) => {
    const isExpired =
      item.expiration_date && new Date(item.expiration_date) < new Date()
    const isAboutToExpire =
      item.expiration_date &&
      new Date(item.expiration_date).getTime() - new Date().getTime() <
        7 * 24 * 60 * 60 * 1000 // 7 days

    return (
      <Card
        key={item.id}
        className={`mb-3 ${
          isExpired
            ? 'border-red-500'
            : isAboutToExpire
              ? 'border-yellow-400'
              : ''
        }`}
      >
        <CardHeader className="p-4 pb-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg">{item.name}</CardTitle>
              <CardDescription>
                {item.brand?.name && (
                  <span className="mr-2">{item.brand.name}</span>
                )}
                {item.weight && (
                  <span className="text-sm">
                    {item.weight}
                    {item.unit}
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="flex space-x-1">
              {item.calories_per_serving && (
                <Badge variant="secondary">
                  {item.calories_per_serving} cal/serving
                </Badge>
              )}
              {item.food_type && (
                <Badge variant="outline">{item.food_type}</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <div className="flex flex-col space-y-1 text-sm">
            {item.notes && (
              <p className="text-muted-foreground">{item.notes}</p>
            )}

            <div className="flex flex-wrap gap-2 mt-2">
              {item.preparation_time && (
                <div className="flex items-center text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  <span>{item.preparation_time} min prep</span>
                </div>
              )}

              {item.expiration_date && (
                <div className="flex items-center text-xs">
                  <CalendarIcon className="h-3 w-3 mr-1" />
                  <span
                    className={
                      isExpired
                        ? 'text-red-500 font-medium'
                        : isAboutToExpire
                          ? 'text-yellow-600'
                          : ''
                    }
                  >
                    {isExpired ? 'Expired: ' : 'Expires: '}
                    {format(new Date(item.expiration_date), 'MMM d, yyyy')}
                  </span>
                </div>
              )}

              {item.dietary_tags && item.dietary_tags.length > 0 && (
                <div className="flex items-center text-xs">
                  <Tag className="h-3 w-3 mr-1" />
                  <span>{item.dietary_tags.join(', ')}</span>
                </div>
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
        <h1 className="text-2xl font-bold">Food Inventory</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Food Item
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Add New Food Item</DialogTitle>
            </DialogHeader>
            <FoodItemForm onComplete={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-6">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search food items..."
            className="pl-10"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="all">All Items</TabsTrigger>
            <TabsTrigger value="meal">Meals</TabsTrigger>
            <TabsTrigger value="breakfast">Breakfast</TabsTrigger>
            <TabsTrigger value="lunch">Lunch</TabsTrigger>
            <TabsTrigger value="dinner">Dinner</TabsTrigger>
            <TabsTrigger value="snack">Snacks</TabsTrigger>
            <TabsTrigger value="drink">Drinks</TabsTrigger>
            <TabsTrigger value="expired">Expired</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-0">
            {filteredItems.length === 0 ? (
              <EmptyState
                heading="No food items found"
                subheading="Food Inventory"
              >
                <p>
                  Add food items to your inventory to track meals, nutrition,
                  and expiration dates.
                </p>
              </EmptyState>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.keys(groupedByType).map(type => (
                  <div key={type} className="mb-6">
                    <h3 className="text-lg font-medium mb-3 capitalize">
                      {type}
                    </h3>
                    {groupedByType[type].map(renderFoodItem)}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {(
            [
              'meal',
              'breakfast',
              'lunch',
              'dinner',
              'snack',
              'drink',
              'expired',
            ] as const
          ).map(tab => (
            <TabsContent key={tab} value={tab} className="mt-0">
              {filteredItems.length === 0 ? (
                <EmptyState
                  heading={`No ${tab} items found`}
                  subheading="Food Inventory"
                >
                  <p>
                    {tab === 'expired'
                      ? 'No expired food items found in your inventory.'
                      : `Add ${tab} items to your inventory to track nutrition and expiration dates.`}
                  </p>
                </EmptyState>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredItems.map(renderFoodItem)}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {filteredItems.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Nutrition Summary</CardTitle>
            <CardDescription>
              Total nutrition for {filteredItems.length} items
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                <p className="text-2xl font-bold">
                  {nutritionTotals.calories.toFixed(0)}
                </p>
                <p className="text-sm text-muted-foreground">Calories</p>
              </div>
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-md">
                <p className="text-2xl font-bold">
                  {nutritionTotals.protein.toFixed(1)}g
                </p>
                <p className="text-sm text-muted-foreground">Protein</p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
                <p className="text-2xl font-bold">
                  {nutritionTotals.carbs.toFixed(1)}g
                </p>
                <p className="text-sm text-muted-foreground">Carbs</p>
              </div>
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                <p className="text-2xl font-bold">
                  {nutritionTotals.fat.toFixed(1)}g
                </p>
                <p className="text-sm text-muted-foreground">Fat</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
