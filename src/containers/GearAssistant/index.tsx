import { useState } from 'react'

import { ChatInterface } from '../../components/ChatInterface'
import { Button } from '../../components/ui/Button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/Dialog'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../components/ui/Tabs'
import { GearRecommendations } from '../GearRecommendations'

interface GearAssistantProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const GearAssistant = ({ open, onOpenChange }: GearAssistantProps) => {
  const [activeTab, setActiveTab] = useState('chat')
  const [isChatLoading, setIsChatLoading] = useState(false)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl min-h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Gear Assistant</DialogTitle>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-grow flex flex-col"
        >
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="chat">Chat with Assistant</TabsTrigger>
            <TabsTrigger value="recommendations">
              Gear Recommendations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="flex-grow flex flex-col">
            <div className="text-sm text-slate-500 mb-4">
              Ask me anything about gear, trip planning, or packing
              recommendations!
            </div>
            <ChatInterface
              className="flex-grow"
              onLoadingChange={setIsChatLoading}
            />
          </TabsContent>

          <TabsContent value="recommendations" className="flex-grow">
            <GearRecommendations />
          </TabsContent>
        </Tabs>

        <div className="flex justify-end mt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isChatLoading}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
