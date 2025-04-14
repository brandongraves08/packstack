import { useState } from 'react'

import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Label } from '../components/ui/Label'
import { ScrollArea } from '../components/ui/ScrollArea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/Select'
import { useToast } from '../hooks/useToast'
import { useInventory } from '../queries/item'

export const GearRecommendations = () => {
  const { data: inventory } = useInventory()
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)
  const [recommendations, setRecommendations] = useState<any>(null)

  // Form state
  const [tripType, setTripType] = useState('')
  const [duration, setDuration] = useState('')
  const [season, setSeason] = useState('')
  const [location, setLocation] = useState('')
  const [experienceLevel, setExperienceLevel] = useState('intermediate')
  const [budget, setBudget] = useState('moderate')

  const handleGenerateRecommendations = async () => {
    if (!tripType || !duration || !season) {
      toast({
        title: 'Missing information',
        description: 'Please provide trip type, duration, and season',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    setRecommendations(null)

    try {
      const response = await fetch(
        'http://localhost:5001/gear-recommendation',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            trip_type: tripType,
            duration,
            season,
            location,
            experience_level: experienceLevel,
            budget,
            inventory: inventory || [],
          }),
        }
      )

      if (!response.ok) {
        throw new Error('Failed to generate recommendations')
      }

      const data = await response.json()

      if (data.success) {
        setRecommendations(data.recommendation)
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to generate recommendations',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error generating recommendations:', error)
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const renderRecommendations = () => {
    if (!recommendations) return null

    return (
      <div className="mt-6 border rounded-md p-4">
        <h3 className="font-medium text-lg mb-4">Recommended Gear</h3>

        {Object.entries(recommendations).map(
          ([category, items]: [string, any]) => (
            <div key={category} className="mb-6">
              <h4 className="font-medium text-base mb-2 capitalize">
                {category}
              </h4>
              <div className="pl-4 border-l-2 border-blue-200">
                {Array.isArray(items) ? (
                  items.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className="mb-2 pb-2 border-b border-gray-100 last:border-0"
                    >
                      <div className="font-medium">{item.name}</div>
                      {item.description && (
                        <div className="text-sm text-gray-600">
                          {item.description}
                        </div>
                      )}
                      <div className="text-sm mt-1">
                        {item.weight && (
                          <span className="mr-3">Weight: {item.weight}g</span>
                        )}
                        {item.price && (
                          <span className="mr-3">Price: ${item.price}</span>
                        )}
                        {item.essential !== undefined && (
                          <span
                            className={
                              item.essential ? 'text-red-600' : 'text-gray-600'
                            }
                          >
                            {item.essential ? 'Essential' : 'Optional'}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm">{JSON.stringify(items)}</div>
                )}
              </div>
            </div>
          )
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-slate-500 mb-4">
        Generate AI-powered gear recommendations for your next adventure.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="trip-type">Trip Type</Label>
          <Input
            id="trip-type"
            placeholder="Backpacking, day hiking, etc."
            value={tripType}
            onChange={e => setTripType(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="duration">Duration</Label>
          <Input
            id="duration"
            placeholder="3 days, 1 week, etc."
            value={duration}
            onChange={e => setDuration(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="season">Season</Label>
          <Select value={season} onValueChange={setSeason}>
            <SelectTrigger>
              <SelectValue placeholder="Select season" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="spring">Spring</SelectItem>
              <SelectItem value="summer">Summer</SelectItem>
              <SelectItem value="fall">Fall</SelectItem>
              <SelectItem value="winter">Winter</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            placeholder="Mountains, desert, etc."
            value={location}
            onChange={e => setLocation(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="experience">Experience Level</Label>
          <Select value={experienceLevel} onValueChange={setExperienceLevel}>
            <SelectTrigger>
              <SelectValue placeholder="Experience level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="experienced">Experienced</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="budget">Budget</Label>
          <Select value={budget} onValueChange={setBudget}>
            <SelectTrigger>
              <SelectValue placeholder="Budget" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="budget">Budget-friendly</SelectItem>
              <SelectItem value="moderate">Moderate</SelectItem>
              <SelectItem value="premium">Premium</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button
        onClick={handleGenerateRecommendations}
        disabled={loading || !tripType || !duration || !season}
        className="w-full mt-4"
      >
        {loading ? 'Generating Recommendations...' : 'Generate Recommendations'}
      </Button>

      {recommendations && (
        <ScrollArea className="h-[400px] mt-4">
          {renderRecommendations()}
        </ScrollArea>
      )}
    </div>
  )
}
