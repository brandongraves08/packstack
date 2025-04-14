import { useState } from 'react'
import { addDays, format } from 'date-fns'
import { CalendarIcon, Plus } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Calendar } from '@/components/ui/Calendar'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { useInventory } from '@/queries/item'

import { MealPlanner } from './MealPlanner'
import { PackingList } from './PackingList'

type Trip = {
  id?: number
  name: string
  location: string
  startDate: Date
  endDate: Date
  notes: string
  activity: string
  season: string
  terrain: string
  temperature: string
  distance: number
  duration: number
  difficulty: string
}

type MealPlan = {
  date: Date
  meals: {
    type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
    itemIds: number[]
  }[]
}

export const EnhancedTripPlanner = () => {
  const { data: inventory } = useInventory()

  // Trip details state
  const [trip, setTrip] = useState<Trip>({
    name: '',
    location: '',
    startDate: new Date(),
    endDate: addDays(new Date(), 3),
    notes: '',
    activity: 'hiking',
    season: 'summer',
    terrain: 'mountain',
    temperature: 'moderate',
    distance: 0,
    duration: 3,
    difficulty: 'moderate',
  })

  // Selected items for packing list
  const [selectedGearItems, setSelectedGearItems] = useState<number[]>([])

  // Meal planning state
  const [mealPlan, setMealPlan] = useState<MealPlan[]>([])

  // Trip weight stats
  const [activeTab, setActiveTab] = useState('trip-details')

  // Activities and conditions options
  const activities = [
    { label: 'Hiking', value: 'hiking' },
    { label: 'Backpacking', value: 'backpacking' },
    { label: 'Camping', value: 'camping' },
    { label: 'Mountaineering', value: 'mountaineering' },
    { label: 'Trail Running', value: 'trail-running' },
    { label: 'Cycling', value: 'cycling' },
    { label: 'Fishing', value: 'fishing' },
    { label: 'Kayaking', value: 'kayaking' },
    { label: 'Canoeing', value: 'canoeing' },
    { label: 'Rock Climbing', value: 'rock-climbing' },
  ]

  const seasons = [
    { label: 'Spring', value: 'spring' },
    { label: 'Summer', value: 'summer' },
    { label: 'Fall', value: 'fall' },
    { label: 'Winter', value: 'winter' },
  ]

  const terrains = [
    { label: 'Mountain', value: 'mountain' },
    { label: 'Forest', value: 'forest' },
    { label: 'Desert', value: 'desert' },
    { label: 'Coastal', value: 'coastal' },
    { label: 'Alpine', value: 'alpine' },
    { label: 'River', value: 'river' },
    { label: 'Lake', value: 'lake' },
    { label: 'Urban', value: 'urban' },
  ]

  const temperatures = [
    { label: 'Hot (80°F+)', value: 'hot' },
    { label: 'Warm (65-80°F)', value: 'warm' },
    { label: 'Moderate (50-65°F)', value: 'moderate' },
    { label: 'Cool (35-50°F)', value: 'cool' },
    { label: 'Cold (20-35°F)', value: 'cold' },
    { label: 'Freezing (Below 20°F)', value: 'freezing' },
  ]

  const difficulties = [
    { label: 'Easy', value: 'easy' },
    { label: 'Moderate', value: 'moderate' },
    { label: 'Challenging', value: 'challenging' },
    { label: 'Difficult', value: 'difficult' },
    { label: 'Extreme', value: 'extreme' },
  ]

  // Handlers
  const handleTripChange = (field: keyof Trip, value: any) => {
    setTrip(prev => ({ ...prev, [field]: value }))
  }

  // We're not using this handler directly yet, but we'll need it when we integrate with the actual backend
  // for saving trip data with the selected gear items
  const _handleGearSelectionChange = (itemIds: number[]) => {
    setSelectedGearItems(itemIds)
  }

  const handleMealPlanChange = (updatedMealPlan: MealPlan[]) => {
    setMealPlan(updatedMealPlan)
  }

  // Calculate trip statistics
  const calculateTripStats = () => {
    // Get selected gear items
    const gearItems =
      inventory?.filter(item => selectedGearItems.includes(item.id)) || []

    // Get all food items from the meal plan
    const allFoodItemIds = mealPlan.flatMap(day =>
      day.meals.flatMap(meal => meal.itemIds)
    )
    // Remove duplicates
    const uniqueFoodItemIds = [...new Set(allFoodItemIds)]
    const foodItems =
      inventory?.filter(item => uniqueFoodItemIds.includes(item.id)) || []

    // Calculate totals
    const gearWeight = gearItems.reduce(
      (sum, item) => sum + (item.weight || 0),
      0
    )
    const foodWeight = foodItems.reduce(
      (sum, item) => sum + (item.weight || 0),
      0
    )
    const totalWeight = gearWeight + foodWeight

    const gearCost = gearItems.reduce((sum, item) => sum + (item.price || 0), 0)
    const foodCost = foodItems.reduce((sum, item) => sum + (item.price || 0), 0)
    const totalCost = gearCost + foodCost

    const totalCalories = foodItems.reduce(
      (sum, item) => sum + (item.calories_per_serving || 0),
      0
    )

    return {
      gearCount: gearItems.length,
      foodCount: foodItems.length,
      gearWeight,
      foodWeight,
      totalWeight,
      gearCost,
      foodCost,
      totalCost,
      totalCalories,
    }
  }

  const tripStats = calculateTripStats()

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Trip Planner</h1>
          <p className="text-muted-foreground">
            Plan your trip with gear and meals
          </p>
        </div>
        <Button
          onClick={() =>
            console.log('Save trip', { trip, selectedGearItems, mealPlan })
          }
        >
          Save Trip
        </Button>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="trip-details">Trip Details</TabsTrigger>
          <TabsTrigger value="gear">Gear</TabsTrigger>
          <TabsTrigger value="food">Food & Meals</TabsTrigger>
        </TabsList>

        <TabsContent value="trip-details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Trip Information</CardTitle>
              <CardDescription>Enter details about your trip</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Trip Name</label>
                  <Input
                    value={trip.name}
                    onChange={e => handleTripChange('name', e.target.value)}
                    placeholder="My Awesome Trip"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Location</label>
                  <Input
                    value={trip.location}
                    onChange={e => handleTripChange('location', e.target.value)}
                    placeholder="Yosemite National Park"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(trip.startDate, 'PPP')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={trip.startDate}
                        onSelect={date =>
                          date && handleTripChange('startDate', date)
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">End Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(trip.endDate, 'PPP')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={trip.endDate}
                        onSelect={date =>
                          date && handleTripChange('endDate', date)
                        }
                        disabled={date => date < trip.startDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Activity</label>
                  <Select
                    value={trip.activity}
                    onValueChange={value => handleTripChange('activity', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select activity" />
                    </SelectTrigger>
                    <SelectContent>
                      {activities.map(activity => (
                        <SelectItem key={activity.value} value={activity.value}>
                          {activity.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Season</label>
                  <Select
                    value={trip.season}
                    onValueChange={value => handleTripChange('season', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select season" />
                    </SelectTrigger>
                    <SelectContent>
                      {seasons.map(season => (
                        <SelectItem key={season.value} value={season.value}>
                          {season.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Terrain</label>
                  <Select
                    value={trip.terrain}
                    onValueChange={value => handleTripChange('terrain', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select terrain" />
                    </SelectTrigger>
                    <SelectContent>
                      {terrains.map(terrain => (
                        <SelectItem key={terrain.value} value={terrain.value}>
                          {terrain.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Temperature Range
                  </label>
                  <Select
                    value={trip.temperature}
                    onValueChange={value =>
                      handleTripChange('temperature', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select temperature range" />
                    </SelectTrigger>
                    <SelectContent>
                      {temperatures.map(temp => (
                        <SelectItem key={temp.value} value={temp.value}>
                          {temp.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Difficulty</label>
                  <Select
                    value={trip.difficulty}
                    onValueChange={value =>
                      handleTripChange('difficulty', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      {difficulties.map(diff => (
                        <SelectItem key={diff.value} value={diff.value}>
                          {diff.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Distance (miles)
                  </label>
                  <Input
                    type="number"
                    value={trip.distance.toString()}
                    onChange={e =>
                      handleTripChange(
                        'distance',
                        parseFloat(e.target.value) || 0
                      )
                    }
                    placeholder="10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Notes</label>
                <Input
                  value={trip.notes}
                  onChange={e => handleTripChange('notes', e.target.value)}
                  placeholder="Trip details, plans, etc."
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Trip Summary</CardTitle>
              <CardDescription>
                {trip.startDate && trip.endDate ? (
                  <>
                    {Math.ceil(
                      (trip.endDate.getTime() - trip.startDate.getTime()) /
                        (1000 * 60 * 60 * 24)
                    )}{' '}
                    day trip
                  </>
                ) : (
                  'Enter trip dates'
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-md text-center">
                  <p className="text-lg font-bold">
                    {tripStats.totalWeight.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">Total Weight</p>
                </div>
                <div className="bg-green-50 dark:bg-green-950/30 p-3 rounded-md text-center">
                  <p className="text-lg font-bold">
                    ${tripStats.totalCost.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">Total Cost</p>
                </div>
                <div className="bg-orange-50 dark:bg-orange-950/30 p-3 rounded-md text-center">
                  <p className="text-lg font-bold">
                    {tripStats.gearCount + tripStats.foodCount}
                  </p>
                  <p className="text-xs text-muted-foreground">Total Items</p>
                </div>
                <div className="bg-red-50 dark:bg-red-950/30 p-3 rounded-md text-center">
                  <p className="text-lg font-bold">
                    {Math.floor(tripStats.totalCalories)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Total Calories
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={() => setActiveTab('gear')}>
              Continue to Gear Selection
              <Plus className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="gear" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gear Selection</CardTitle>
              <CardDescription>
                Select gear for your {trip.activity} trip
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PackingList />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Gear Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-md text-center">
                  <p className="text-lg font-bold">
                    {tripStats.gearWeight.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">Gear Weight</p>
                </div>
                <div className="bg-green-50 dark:bg-green-950/30 p-3 rounded-md text-center">
                  <p className="text-lg font-bold">
                    ${tripStats.gearCost.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">Gear Cost</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-950/30 p-3 rounded-md text-center">
                  <p className="text-lg font-bold">{tripStats.gearCount}</p>
                  <p className="text-xs text-muted-foreground">Gear Items</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setActiveTab('trip-details')}
            >
              Back to Trip Details
            </Button>
            <Button onClick={() => setActiveTab('food')}>
              Continue to Meal Planning
              <Plus className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="food" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Meal Planning</CardTitle>
              <CardDescription>
                Plan meals for your{' '}
                {Math.ceil(
                  (trip.endDate.getTime() - trip.startDate.getTime()) /
                    (1000 * 60 * 60 * 24)
                )}{' '}
                day trip
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MealPlanner
                tripStartDate={trip.startDate}
                tripEndDate={trip.endDate}
                onMealPlanChange={handleMealPlanChange}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Food Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-md text-center">
                  <p className="text-lg font-bold">
                    {tripStats.foodWeight.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">Food Weight</p>
                </div>
                <div className="bg-green-50 dark:bg-green-950/30 p-3 rounded-md text-center">
                  <p className="text-lg font-bold">
                    ${tripStats.foodCost.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">Food Cost</p>
                </div>
                <div className="bg-red-50 dark:bg-red-950/30 p-3 rounded-md text-center">
                  <p className="text-lg font-bold">
                    {Math.floor(tripStats.totalCalories)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Total Calories
                  </p>
                </div>
                <div className="bg-orange-50 dark:bg-orange-950/30 p-3 rounded-md text-center">
                  <p className="text-lg font-bold">{tripStats.foodCount}</p>
                  <p className="text-xs text-muted-foreground">Food Items</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setActiveTab('gear')}>
              Back to Gear Selection
            </Button>
            <Button>Save Trip</Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
