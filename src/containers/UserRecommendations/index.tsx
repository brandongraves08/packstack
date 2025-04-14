import React, { useState } from 'react'
import { useMutation } from '@tanstack/react-query'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Loading } from '@/components/ui/Loading'
import { ScrollArea } from '@/components/ui/ScrollArea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { useWeatherForecast } from '@/queries/weather'

import { BASE_API_URL } from '../../lib/config'

interface UserProfile {
  experience_level: string
  preferred_activities: string[]
  terrain_preferences: string[]
  season_preferences: string[]
  budget_preference: string
  weight_preference: string
}

interface TripParameters {
  trip_type: string
  location: string
  duration: string
  season: string
  group_size: number
}

interface Recommendation {
  name: string
  description: string
  category: string
  estimated_price: number
  weight: number
  importance: 'essential' | 'recommended' | 'optional'
  reason: string
  amazon_url?: string
  walmart_url?: string
}

interface RecommendationCategory {
  category: string
  items: Recommendation[]
}

interface RecommendationResponse {
  success: boolean
  recommendations: {
    profile_based: RecommendationCategory[]
    upgrade_suggestions: Recommendation[]
    new_items: Recommendation[]
    specialized_gear: Recommendation[]
  }
  error?: string
}

const DEFAULT_USER_PROFILE: UserProfile = {
  experience_level: 'intermediate',
  preferred_activities: ['backpacking', 'hiking'],
  terrain_preferences: ['mountain', 'forest'],
  season_preferences: ['summer', 'fall'],
  budget_preference: 'moderate',
  weight_preference: 'ultralight',
}

const DEFAULT_TRIP_PARAMETERS: TripParameters = {
  trip_type: 'backpacking',
  location: 'mountains',
  duration: '3 days',
  season: 'summer',
  group_size: 1,
}

const UserRecommendations: React.FC = () => {
  const [userProfile, setUserProfile] =
    useState<UserProfile>(DEFAULT_USER_PROFILE)
  const [tripParameters, setTripParameters] = useState<TripParameters>(
    DEFAULT_TRIP_PARAMETERS
  )
  const [activeTab, setActiveTab] = useState('profile')
  const [showWeather, setShowWeather] = useState(true)

  const { data: weatherData, isLoading: isWeatherLoading } = useWeatherForecast(
    tripParameters.location,
    tripParameters.season,
    showWeather
  )

  const { mutate, data, isPending, isError, error } = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${BASE_API_URL}/user-recommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_profile: userProfile,
          trip_parameters: tripParameters,
          // Would normally fetch real inventory from user's data
          inventory: [],
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to get recommendations')
      }

      return (await response.json()) as RecommendationResponse
    },
  })

  const handleGetRecommendations = () => {
    mutate()
  }

  const renderImportanceIndicator = (importance: string) => {
    switch (importance) {
      case 'essential':
        return (
          <span className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded dark:bg-red-900 dark:text-red-300">
            Essential
          </span>
        )
      case 'recommended':
        return (
          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded dark:bg-blue-900 dark:text-blue-300">
            Recommended
          </span>
        )
      case 'optional':
        return (
          <span className="bg-gray-100 text-gray-800 text-xs px-2 py-0.5 rounded dark:bg-gray-700 dark:text-gray-300">
            Optional
          </span>
        )
      default:
        return null
    }
  }

  return (
    <div className="w-full p-4 space-y-4 rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">
          Personalized Gear Recommendations
        </h2>
        <Button onClick={handleGetRecommendations} disabled={isPending}>
          {isPending ? <Loading size="sm" /> : 'Get Recommendations'}
        </Button>
      </div>

      {/* Weather Forecast Card */}
      {weatherData && showWeather && (
        <Card className="p-4 mb-4 bg-gray-50 dark:bg-gray-700">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="font-medium text-lg">
                Weather Forecast: {weatherData.location} in {weatherData.season}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                Temperature: {weatherData.forecast.avg_temp}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                Precipitation: {weatherData.forecast.precipitation}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowWeather(false)}
              className="text-xs h-8"
            >
              Hide
            </Button>
          </div>

          <div className="space-y-2">
            <div>
              <span className="text-xs font-medium">Conditions:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {weatherData.forecast.conditions.map((condition, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {condition}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                Weather Alerts:
              </span>
              <div className="flex flex-wrap gap-1 mt-1">
                {weatherData.forecast.alerts.map((alert, i) => (
                  <Badge key={i} variant="destructive" className="text-xs">
                    {alert}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {!showWeather && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowWeather(true)}
          className="text-xs"
        >
          Show Weather Forecast
        </Button>
      )}

      {isError && (
        <div className="bg-red-50 text-red-800 p-4 rounded-lg dark:bg-red-900 dark:text-red-200">
          Error:{' '}
          {error instanceof Error ? error.message : 'Something went wrong'}
        </div>
      )}

      {data?.success && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="profile">Profile Based</TabsTrigger>
            <TabsTrigger value="upgrades">Upgrade Suggestions</TabsTrigger>
            <TabsTrigger value="new">New Items</TabsTrigger>
            <TabsTrigger value="specialized">Specialized Gear</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <ScrollArea className="h-[400px] pr-4">
              {data.recommendations.profile_based.map((category, catIndex) => (
                <div key={catIndex} className="mb-6">
                  <h3 className="text-lg font-medium border-b pb-2 mb-3">
                    {category.category}
                  </h3>
                  <div className="space-y-4">
                    {category.items.map((item, itemIndex) => (
                      <div
                        key={itemIndex}
                        className="border rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <div className="flex justify-between">
                          <h4 className="font-medium">{item.name}</h4>
                          <div className="flex gap-2">
                            {renderImportanceIndicator(item.importance)}
                            <span className="text-green-600 font-medium">
                              ${item.estimated_price}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                          {item.description}
                        </p>
                        <div className="text-xs text-gray-500 mt-2 flex gap-4">
                          <span>Weight: {item.weight}g</span>
                          <span>Category: {item.category}</span>
                        </div>
                        <p className="text-xs text-gray-600 italic mt-2">
                          Why: {item.reason}
                        </p>
                        {(item.amazon_url || item.walmart_url) && (
                          <div className="mt-2 flex gap-2">
                            {item.amazon_url && (
                              <a
                                href={item.amazon_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline"
                              >
                                View on Amazon
                              </a>
                            )}
                            {item.walmart_url && (
                              <a
                                href={item.walmart_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline"
                              >
                                View on Walmart
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="upgrades">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {data.recommendations.upgrade_suggestions.map((item, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <div className="flex justify-between">
                      <h4 className="font-medium">{item.name}</h4>
                      <span className="text-green-600 font-medium">
                        ${item.estimated_price}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                      {item.description}
                    </p>
                    <div className="text-xs text-gray-500 mt-2 flex gap-4">
                      <span>Weight: {item.weight}g</span>
                      <span>Category: {item.category}</span>
                    </div>
                    <p className="text-xs text-gray-600 italic mt-2">
                      Why upgrade: {item.reason}
                    </p>
                    {(item.amazon_url || item.walmart_url) && (
                      <div className="mt-2 flex gap-2">
                        {item.amazon_url && (
                          <a
                            href={item.amazon_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline"
                          >
                            View on Amazon
                          </a>
                        )}
                        {item.walmart_url && (
                          <a
                            href={item.walmart_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline"
                          >
                            View on Walmart
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="new">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {data.recommendations.new_items.map((item, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <div className="flex justify-between">
                      <h4 className="font-medium">{item.name}</h4>
                      <div className="flex gap-2">
                        {renderImportanceIndicator(item.importance)}
                        <span className="text-green-600 font-medium">
                          ${item.estimated_price}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                      {item.description}
                    </p>
                    <div className="text-xs text-gray-500 mt-2 flex gap-4">
                      <span>Weight: {item.weight}g</span>
                      <span>Category: {item.category}</span>
                    </div>
                    <p className="text-xs text-gray-600 italic mt-2">
                      Why needed: {item.reason}
                    </p>
                    {(item.amazon_url || item.walmart_url) && (
                      <div className="mt-2 flex gap-2">
                        {item.amazon_url && (
                          <a
                            href={item.amazon_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline"
                          >
                            View on Amazon
                          </a>
                        )}
                        {item.walmart_url && (
                          <a
                            href={item.walmart_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline"
                          >
                            View on Walmart
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="specialized">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {data.recommendations.specialized_gear.map((item, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <div className="flex justify-between">
                      <h4 className="font-medium">{item.name}</h4>
                      <div className="flex gap-2">
                        {renderImportanceIndicator(item.importance)}
                        <span className="text-green-600 font-medium">
                          ${item.estimated_price}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                      {item.description}
                    </p>
                    <div className="text-xs text-gray-500 mt-2 flex gap-4">
                      <span>Weight: {item.weight}g</span>
                      <span>Category: {item.category}</span>
                    </div>
                    <p className="text-xs text-gray-600 italic mt-2">
                      Why specialized: {item.reason}
                    </p>
                    {(item.amazon_url || item.walmart_url) && (
                      <div className="mt-2 flex gap-2">
                        {item.amazon_url && (
                          <a
                            href={item.amazon_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline"
                          >
                            View on Amazon
                          </a>
                        )}
                        {item.walmart_url && (
                          <a
                            href={item.walmart_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline"
                          >
                            View on Walmart
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      )}

      {!data && !isPending && (
        <div className="text-center text-gray-500 my-8 p-8 border border-dashed rounded-lg">
          <p className="text-lg mb-2">
            Get personalized gear recommendations based on your profile
          </p>
          <p className="text-sm mb-4">
            Click the button above to generate recommendations tailored to your
            preferences and needs
          </p>

          <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto text-left text-sm">
            <div>
              <h4 className="font-medium mb-1">Your Profile</h4>
              <ul className="list-disc list-inside text-gray-600">
                <li>Experience: {userProfile.experience_level}</li>
                <li>
                  Activities: {userProfile.preferred_activities.join(', ')}
                </li>
                <li>Budget: {userProfile.budget_preference}</li>
                <li>Weight priority: {userProfile.weight_preference}</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-1">Trip Parameters</h4>
              <ul className="list-disc list-inside text-gray-600">
                <li>Trip type: {tripParameters.trip_type}</li>
                <li>Location: {tripParameters.location}</li>
                <li>Duration: {tripParameters.duration}</li>
                <li>Season: {tripParameters.season}</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserRecommendations
