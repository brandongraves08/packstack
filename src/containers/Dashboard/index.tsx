import React, { useState } from 'react'

import { ImageAnalyzer } from '@/components/ImageAnalyzer'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/Dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'

import { AmazonProductSearch } from '../AmazonProductSearch'
import PriceComparison from '../PriceComparison'
import UserRecommendations from '../UserRecommendations'
import WalmartProductSearch from '../WalmartProductSearch'

const Dashboard: React.FC = () => {
  const [analyzerOpen, setAnalyzerOpen] = useState(false)

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Packstack Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm dark:bg-gray-800 dark:border-gray-700">
          <h3 className="text-lg font-medium mb-2">Quick Actions</h3>
          <div className="space-y-3">
            <Dialog open={analyzerOpen} onOpenChange={setAnalyzerOpen}>
              <DialogTrigger asChild>
                <Button className="w-full justify-start">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-2"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Analyze Image & Scan Barcode
                </Button>
              </DialogTrigger>
              <DialogContent className="p-0">
                <ImageAnalyzer
                  open={analyzerOpen}
                  onOpenChange={setAnalyzerOpen}
                />
              </DialogContent>
            </Dialog>

            <Button variant="outline" className="w-full justify-start">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              Create Packing List
            </Button>

            <Button variant="outline" className="w-full justify-start">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z"
                  clipRule="evenodd"
                />
              </svg>
              Add New Gear Item
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm dark:bg-gray-800 dark:border-gray-700">
          <h3 className="text-lg font-medium mb-2">Stats & Insights</h3>
          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-500">Total Gear Items</div>
              <div className="text-2xl font-bold">124</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Pack Weight</div>
              <div className="text-2xl font-bold">8.2kg</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Gear Value</div>
              <div className="text-2xl font-bold">$3,245</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm dark:bg-gray-800 dark:border-gray-700">
          <h3 className="text-lg font-medium mb-2">Recent Activity</h3>
          <div className="space-y-3">
            <div className="text-sm">
              <span className="text-blue-600 font-medium">Added:</span> MSR
              PocketRocket Stove
              <div className="text-xs text-gray-500">10 minutes ago</div>
            </div>
            <div className="text-sm">
              <span className="text-green-600 font-medium">Updated:</span> Big
              Agnes Copper Spur HV UL2
              <div className="text-xs text-gray-500">2 hours ago</div>
            </div>
            <div className="text-sm">
              <span className="text-purple-600 font-medium">Created Pack:</span>{' '}
              John Muir Trail 2025
              <div className="text-xs text-gray-500">Yesterday</div>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="recommendations" className="w-full">
        <TabsList className="grid grid-cols-4 mb-8">
          <TabsTrigger value="recommendations">
            Personalized Recommendations
          </TabsTrigger>
          <TabsTrigger value="compare">Price Comparison</TabsTrigger>
          <TabsTrigger value="amazon">Amazon Products</TabsTrigger>
          <TabsTrigger value="walmart">Walmart Products</TabsTrigger>
        </TabsList>

        <TabsContent value="recommendations">
          <UserRecommendations />
        </TabsContent>

        <TabsContent value="compare">
          <PriceComparison />
        </TabsContent>

        <TabsContent value="amazon">
          <AmazonProductSearch standalone={true} />
        </TabsContent>

        <TabsContent value="walmart">
          <WalmartProductSearch standalone={true} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default Dashboard
