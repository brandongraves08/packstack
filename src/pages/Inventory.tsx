import { useEffect, useState } from 'react'
import { MoreHorizontal } from 'lucide-react'

import { ImageAnalyzer } from '@/components/ImageAnalyzer'
import { Button, Input } from '@/components/ui'
import { DialogTrigger } from '@/components/ui/Dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { CategoryManagementModal } from '@/containers/CategoryManagementModal'
import { FoodInventory } from '@/containers/Food/FoodInventory'
import { GearInventory } from '@/containers/Gear/GearInventory'
import { ImportCsvModal } from '@/containers/ImportCsvModal'
import { ImportLighterpackModal } from '@/containers/ImportLighterpackModal'
import { InventoryTable } from '@/containers/Inventory/InventoryTable'
import { ItemForm } from '@/containers/ItemForm'
import { downloadInventory } from '@/lib/download'
import { useInventory } from '@/queries/item'

export const InventoryPage = () => {
  const { data: inventory, isLoading, error } = useInventory()
  const [open, setOpen] = useState(false)
  const [openReorder, setOpenReorder] = useState(false)
  const [openLighterpackImport, setOpenLighterpackImport] = useState(false)
  const [openCsvImport, setOpenCsvImport] = useState(false)
  const [openImageAnalyzer, setOpenImageAnalyzer] = useState(false)
  const [filter, setFilter] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [showToast, setShowToast] = useState(false)

  // Show error toast if error occurs
  useEffect(() => {
    if (error) setShowToast(true)
  }, [error])

  return (
    <div className="px-2 md:px-4 py-2">
      {showToast && (
        <div className="bg-red-200 text-red-800 px-4 py-2 mb-2 rounded">
          Failed to load inventory. Please try again later.
        </div>
      )}
      <div className="flex justify-between mb-4 gap-2">
        <Input
          placeholder="Search inventory..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex justify-end items-center gap-2">
          <ItemForm
            title="New Item"
            open={open}
            onOpenChange={setOpen}
            onClose={() => setOpen(false)}
          >
            <DialogTrigger asChild>
              <Button className="md:text-sm">Add Item</Button>
            </DialogTrigger>
          </ItemForm>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setOpenImageAnalyzer(true)}>
                Analyze Image Inventory
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setOpenLighterpackImport(true)}>
                Import from LighterPack
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setOpenCsvImport(true)}>
                Import CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => downloadInventory(inventory)}>
                Export Inventory
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setOpenReorder(true)}>
                Manage Categories
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Tabs
        defaultValue="all"
        value={activeTab}
        onValueChange={setActiveTab}
        className="mb-6"
      >
        <TabsList className="mb-4">
          <TabsTrigger value="all">All Items</TabsTrigger>
          <TabsTrigger value="gear">Gear</TabsTrigger>
          <TabsTrigger value="food">Food</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-0">
          <InventoryTable searchFilter={filter} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="gear" className="mt-0">
          <GearInventory />
        </TabsContent>

        <TabsContent value="food" className="mt-0">
          <FoodInventory />
        </TabsContent>
      </Tabs>

      <ImportLighterpackModal
        open={openLighterpackImport}
        onOpenChange={setOpenLighterpackImport}
      />
      <ImportCsvModal open={openCsvImport} onOpenChange={setOpenCsvImport} />
      <CategoryManagementModal
        open={openReorder}
        onOpenChange={setOpenReorder}
      />
      <ImageAnalyzer
        open={openImageAnalyzer}
        onOpenChange={setOpenImageAnalyzer}
      />
    </div>
  )
}
