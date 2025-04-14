import { useState } from 'react'
import { addDays, format } from 'date-fns'
import { Calendar as CalendarIcon, Plus, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Calendar } from '@/components/ui/Calendar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/Popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { useInventory } from '@/queries/item'
import { Item } from '@/types/item'

type MealPlan = {
  date: Date
  meals: {
    type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
    itemIds: number[]
  }[]
}

type MealPlannerProps = {
  tripStartDate: Date
  tripEndDate: Date
  onMealPlanChange: (mealPlan: MealPlan[]) => void
}

export const MealPlanner = ({
  tripStartDate,
  tripEndDate,
  onMealPlanChange,
}: MealPlannerProps) => {
  const { data: inventory } = useInventory()
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    tripStartDate
  )
  const [selectedMealType, setSelectedMealType] = useState<string>('breakfast')
  const [mealPlan, setMealPlan] = useState<MealPlan[]>(() => {
    // Initialize meal plan for each day of the trip
    const days: MealPlan[] = []
    let currentDate = tripStartDate

    while (currentDate <= tripEndDate) {
      days.push({
        date: new Date(currentDate),
        meals: [
          { type: 'breakfast' as const, itemIds: [] },
          { type: 'lunch' as const, itemIds: [] },
          { type: 'dinner' as const, itemIds: [] },
          { type: 'snack' as const, itemIds: [] },
        ],
      })
      currentDate = addDays(currentDate, 1)
    }

    return days
  })

  // Filter food items from inventory
  const foodItems = inventory?.filter(item => item.is_food) || []

  // Get filtered food items by meal type
  const getFilteredFoodItems = (mealType: string) => {
    return foodItems.filter(
      item => item.food_type === mealType || item.food_type === 'meal'
    )
  }

  const findMealPlanForDate = (date: Date) => {
    return mealPlan.find(
      plan =>
        format(new Date(plan.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    )
  }

  const getMealByType = (plan: MealPlan | undefined, type: string) => {
    if (!plan) return { type: type as any, itemIds: [] }
    return (
      plan.meals.find(meal => meal.type === type) || {
        type: type as any,
        itemIds: [],
      }
    )
  }

  const handleAddFoodItem = (itemId: number) => {
    if (!selectedDate) return

    const updatedMealPlan = [...mealPlan]
    const dayPlanIndex = updatedMealPlan.findIndex(
      plan =>
        format(new Date(plan.date), 'yyyy-MM-dd') ===
        format(selectedDate, 'yyyy-MM-dd')
    )

    if (dayPlanIndex !== -1) {
      const mealIndex = updatedMealPlan[dayPlanIndex].meals.findIndex(
        meal => meal.type === selectedMealType
      )

      if (mealIndex !== -1) {
        // Only add if not already in the list
        if (
          !updatedMealPlan[dayPlanIndex].meals[mealIndex].itemIds.includes(
            itemId
          )
        ) {
          updatedMealPlan[dayPlanIndex].meals[mealIndex].itemIds.push(itemId)
          setMealPlan(updatedMealPlan)
          onMealPlanChange(updatedMealPlan)
        }
      }
    }
  }

  const handleRemoveFoodItem = (
    date: Date,
    mealType: string,
    itemId: number
  ) => {
    const updatedMealPlan = [...mealPlan]
    const dayPlanIndex = updatedMealPlan.findIndex(
      plan =>
        format(new Date(plan.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    )

    if (dayPlanIndex !== -1) {
      const mealIndex = updatedMealPlan[dayPlanIndex].meals.findIndex(
        meal => meal.type === mealType
      )

      if (mealIndex !== -1) {
        updatedMealPlan[dayPlanIndex].meals[mealIndex].itemIds =
          updatedMealPlan[dayPlanIndex].meals[mealIndex].itemIds.filter(
            id => id !== itemId
          )
        setMealPlan(updatedMealPlan)
        onMealPlanChange(updatedMealPlan)
      }
    }
  }

  // Calculate nutrition totals for a specific day
  const calculateDayNutrition = (date: Date) => {
    const dayPlan = findMealPlanForDate(date)
    if (!dayPlan) return { calories: 0, protein: 0, carbs: 0, fat: 0 }

    const allItemIds = dayPlan.meals.flatMap(meal => meal.itemIds)
    return allItemIds.reduce(
      (totals, itemId) => {
        const item = foodItems.find(i => i.id === itemId)

        if (item) {
          totals.calories += item.calories_per_serving || 0
          totals.protein += item.nutrition_info?.protein || 0
          totals.carbs += item.nutrition_info?.carbs || 0
          totals.fat += item.nutrition_info?.fat || 0
        }

        return totals
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    )
  }

  // Get the food item by id
  const getFoodItem = (itemId: number): Item | undefined => {
    return foodItems.find(item => item.id === itemId)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full sm:w-auto justify-start"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate
                ? format(selectedDate, 'MMMM d, yyyy')
                : 'Select a date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={date => date < tripStartDate || date > tripEndDate}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <Select value={selectedMealType} onValueChange={setSelectedMealType}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Select meal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="breakfast">Breakfast</SelectItem>
            <SelectItem value="lunch">Lunch</SelectItem>
            <SelectItem value="dinner">Dinner</SelectItem>
            <SelectItem value="snack">Snack</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {selectedDate && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Available Food Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {getFilteredFoodItems(selectedMealType).map(item => (
                    <Card
                      key={item.id}
                      className="p-3 hover:bg-accent cursor-pointer"
                      onClick={() => handleAddFoodItem(item.id)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-sm">{item.name}</h4>
                          {item.brand?.name && (
                            <p className="text-xs text-muted-foreground">
                              {item.brand.name}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center">
                          <Plus className="h-4 w-4" />
                        </div>
                      </div>
                      {item.calories_per_serving && (
                        <p className="text-xs mt-1">
                          {item.calories_per_serving} calories
                        </p>
                      )}
                    </Card>
                  ))}

                  {getFilteredFoodItems(selectedMealType).length === 0 && (
                    <p className="text-sm text-muted-foreground col-span-2">
                      No {selectedMealType} items found in your inventory. Add
                      some in the Food Inventory.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>
                  Meal Plan for {format(selectedDate, 'MMMM d, yyyy')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {['breakfast', 'lunch', 'dinner', 'snack'].map(mealType => {
                    const meal = getMealByType(
                      findMealPlanForDate(selectedDate),
                      mealType
                    )
                    return (
                      <div
                        key={mealType}
                        className="border-b pb-2 last:border-0"
                      >
                        <h4 className="font-medium text-sm capitalize mb-2">
                          {mealType}
                        </h4>
                        {meal.itemIds.length > 0 ? (
                          <div className="space-y-2">
                            {meal.itemIds.map(itemId => {
                              const item = getFoodItem(itemId)
                              if (!item) return null
                              return (
                                <div
                                  key={itemId}
                                  className="flex justify-between items-center bg-accent/40 p-2 rounded-md"
                                >
                                  <div>
                                    <p className="text-sm font-medium">
                                      {item.name}
                                    </p>
                                    {item.calories_per_serving && (
                                      <p className="text-xs">
                                        {item.calories_per_serving} calories
                                      </p>
                                    )}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      handleRemoveFoodItem(
                                        selectedDate,
                                        mealType,
                                        itemId
                                      )
                                    }
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            No items added
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="mt-4">
              <CardHeader className="pb-2">
                <CardTitle>Nutrition Summary</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedDate && (
                  <div className="grid grid-cols-4 gap-2">
                    {(() => {
                      const nutrition = calculateDayNutrition(selectedDate)
                      return (
                        <>
                          <div className="bg-blue-50 dark:bg-blue-950/30 p-2 rounded-md text-center">
                            <p className="text-lg font-bold">
                              {Math.round(nutrition.calories)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Calories
                            </p>
                          </div>
                          <div className="bg-red-50 dark:bg-red-950/30 p-2 rounded-md text-center">
                            <p className="text-lg font-bold">
                              {nutrition.protein.toFixed(1)}g
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Protein
                            </p>
                          </div>
                          <div className="bg-green-50 dark:bg-green-950/30 p-2 rounded-md text-center">
                            <p className="text-lg font-bold">
                              {nutrition.carbs.toFixed(1)}g
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Carbs
                            </p>
                          </div>
                          <div className="bg-yellow-50 dark:bg-yellow-950/30 p-2 rounded-md text-center">
                            <p className="text-lg font-bold">
                              {nutrition.fat.toFixed(1)}g
                            </p>
                            <p className="text-xs text-muted-foreground">Fat</p>
                          </div>
                        </>
                      )
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <div>
        <h3 className="text-lg font-medium mb-4">
          Trip Overview ({format(tripStartDate, 'MMM d')} -{' '}
          {format(tripEndDate, 'MMM d')})
        </h3>
        <div className="space-y-2">
          {mealPlan.map(dayPlan => (
            <Card key={format(dayPlan.date, 'yyyy-MM-dd')} className="p-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2">
                <h4 className="font-medium">
                  {format(dayPlan.date, 'EEEE, MMMM d')}
                </h4>
                <div className="flex gap-2 mt-2 sm:mt-0">
                  {['breakfast', 'lunch', 'dinner', 'snack'].map(mealType => {
                    const meal = getMealByType(dayPlan, mealType)
                    const itemCount = meal.itemIds.length
                    return (
                      <Badge
                        key={mealType}
                        variant={itemCount > 0 ? 'default' : 'outline'}
                        className="capitalize"
                      >
                        {mealType.substring(0, 1)}: {itemCount}
                      </Badge>
                    )
                  })}
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {(() => {
                  const nutrition = calculateDayNutrition(dayPlan.date)
                  return (
                    <>
                      <div className="bg-blue-50 dark:bg-blue-950/30 p-1 rounded-md text-center">
                        <p className="text-sm font-bold">
                          {Math.round(nutrition.calories)}
                        </p>
                        <p className="text-xs text-muted-foreground">cal</p>
                      </div>
                      <div className="bg-red-50 dark:bg-red-950/30 p-1 rounded-md text-center">
                        <p className="text-sm font-bold">
                          {nutrition.protein.toFixed(1)}g
                        </p>
                        <p className="text-xs text-muted-foreground">protein</p>
                      </div>
                      <div className="bg-green-50 dark:bg-green-950/30 p-1 rounded-md text-center">
                        <p className="text-sm font-bold">
                          {nutrition.carbs.toFixed(1)}g
                        </p>
                        <p className="text-xs text-muted-foreground">carbs</p>
                      </div>
                      <div className="bg-yellow-50 dark:bg-yellow-950/30 p-1 rounded-md text-center">
                        <p className="text-sm font-bold">
                          {nutrition.fat.toFixed(1)}g
                        </p>
                        <p className="text-xs text-muted-foreground">fat</p>
                      </div>
                    </>
                  )
                })()}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => setSelectedDate(dayPlan.date)}
              >
                Edit meals
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
