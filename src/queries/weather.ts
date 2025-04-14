import { useQuery } from '@tanstack/react-query'

import { getWeatherForecast } from '@/lib/api'

export interface WeatherForecast {
  location: string
  season: string
  forecast: {
    avg_temp: string
    precipitation: string
    conditions: string[]
    alerts: string[]
  }
}

export const useWeatherForecast = (
  location: string,
  season: string,
  enabled: boolean = true
) => {
  return useQuery<WeatherForecast>({
    queryKey: ['weather-forecast', location, season],
    queryFn: async () => {
      const res = await getWeatherForecast(location, season)
      return res.data
    },
    enabled,
    staleTime: 1000 * 60 * 10, // 10 minutes
  })
}
