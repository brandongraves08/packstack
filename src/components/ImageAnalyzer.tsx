import { useState } from 'react'

import { Switch } from '../components/ui/Switch'
import { useToast } from '../hooks/useToast'
import { useCreateItem } from '../queries/item'
import { CreateItem, Unit } from '../types/item'
import { Button } from './ui/Button'
import { Checkbox } from './ui/Checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/Dialog'
import { Label } from './ui/Label'
import { ScrollArea } from './ui/ScrollArea'

// Use a relative path to the config
import { getApiUrl } from '../lib/api'

interface ImageAnalyzerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onItemCreated?: () => void
}

type AnalyzedItem = {
  name: string
  description: string
  weight: number
  price: number
  category: string
  brand: string | null
  productUrl: string
  consumable: boolean
  barcodeValue?: string // For storing detected barcode value
  selected?: boolean // For batch mode item selection
}

export const ImageAnalyzer = ({
  open,
  onOpenChange,
  onItemCreated,
}: ImageAnalyzerProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [analysis, setAnalysis] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [batchMode, setBatchMode] = useState(false)
  const [detectBarcodes, setDetectBarcodes] = useState(false)
  const [analyzedItems, setAnalyzedItems] = useState<AnalyzedItem[]>([])
  const { toast } = useToast()
  const createItem = useCreateItem()

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0])
      setAnalysis('') // Clear previous analysis
      setAnalyzedItems([]) // Clear previous analyzed items
    }
  }

  const toggleItemSelection = (index: number) => {
    setAnalyzedItems(prevItems =>
      prevItems.map((item, i) =>
        i === index ? { ...item, selected: !item.selected } : item
      )
    )
  }

  const selectAllItems = () => {
    setAnalyzedItems(prevItems =>
      prevItems.map(item => ({ ...item, selected: true }))
    )
  }

  const deselectAllItems = () => {
    setAnalyzedItems(prevItems =>
      prevItems.map(item => ({ ...item, selected: false }))
    )
  }

  const handleSubmit = async () => {
    if (!selectedFile) return

    setLoading(true)
    try {
      // Use FormData to send both the image and the batch mode flag
      const formData = new FormData()
      formData.append('image', selectedFile)
      formData.append('batch_mode', batchMode.toString())
      formData.append('detect_barcodes', detectBarcodes.toString())

      // Call server-side image analysis endpoint
      const response = await fetch(`${getApiUrl()}/analyze`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Failed to analyze image: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.success) {
        if (batchMode) {
          // Process array of items for batch mode
          const items = Array.isArray(data.analysis)
            ? data.analysis
            : [data.analysis]
          setAnalyzedItems(items.map((item: any) => ({ ...item, selected: true })))
          setAnalysis(JSON.stringify(data.analysis, null, 2))
        } else {
          // Single item mode
          setAnalyzedItems([{ ...(data.analysis as any), selected: true }])
          setAnalysis(JSON.stringify(data.analysis, null, 2))
        }

        // Show successful barcode detection message if enabled and barcodes were found
        if (detectBarcodes) {
          const barcodeItems = analyzedItems.filter(
            (item: AnalyzedItem) => item.barcodeValue !== undefined
          )
          if (barcodeItems.length > 0) {
            toast({
              title: 'Barcode Detected',
              description: `Found ${barcodeItems.length} barcode${
                barcodeItems.length > 1 ? 's' : ''
              }`,
            })
          }
        }
      } else {
        setAnalysis(data.analysis || 'Analysis failed')
        toast({
          title: 'Error',
          description: data.error || 'Failed to analyze image properly',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Error analyzing image',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const createSelectedItems = async () => {
    const selectedItems = analyzedItems.filter(item => item.selected)

    if (selectedItems.length === 0) {
      toast({
        title: 'Error',
        description: 'No items selected for creation',
        variant: 'destructive',
      })
      return
    }

    try {
      for (const item of selectedItems) {
        const newItem: CreateItem = {
          name: item.name,
          weight: item.weight || 0,
          unit: 'g' as Unit,
          price: item.price || 0,
          consumable: item.consumable || false,
          product_url: item.productUrl || '',
          notes: item.description || '',
          brand_new: item.brand || undefined,
          category_new: item.category || undefined,
        }

        await createItem.mutateAsync(newItem)
      }

      toast({
        title: '✅ Success',
        description: `Created ${selectedItems.length} item${
          selectedItems.length > 1 ? 's' : ''
        }`,
      })

      onItemCreated?.()
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to create items:', error)
      toast({
        title: 'Error',
        description: 'Failed to create items',
        variant: 'destructive',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Analyze Image & Create Item{batchMode ? 's' : ''}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="batchMode"
                  checked={batchMode}
                  onCheckedChange={checked => setBatchMode(checked as boolean)}
                />
                <Label htmlFor="batchMode">
                  Batch mode (detect multiple items)
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="detectBarcodes"
                  checked={detectBarcodes}
                  onCheckedChange={setDetectBarcodes}
                />
                <Label htmlFor="detectBarcodes">Detect barcodes</Label>
              </div>
            </div>

            {detectBarcodes && (
              <div className="text-sm text-gray-500 italic ml-6">
                Will attempt to detect and decode barcodes/QR codes in the image
              </div>
            )}
          </div>

          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />

          <Button
            onClick={handleSubmit}
            disabled={!selectedFile || loading || createItem.isPending}
            className="w-full"
          >
            {loading ? 'Analyzing...' : 'Analyze Image'}
          </Button>

          {analyzedItems.length > 0 && (
            <div className="mt-4">
              <div className="flex justify-between mb-2">
                <h3 className="font-medium">
                  Detected Items ({analyzedItems.length})
                </h3>
                <div className="space-x-2">
                  <Button variant="outline" size="sm" onClick={selectAllItems}>
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={deselectAllItems}
                  >
                    Deselect All
                  </Button>
                </div>
              </div>

              <ScrollArea className="h-60 border rounded-md p-4">
                {analyzedItems.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 py-2 border-b last:border-0"
                  >
                    <Checkbox
                      id={`item-${index}`}
                      checked={item.selected}
                      onCheckedChange={() => toggleItemSelection(index)}
                    />
                    <div>
                      <Label htmlFor={`item-${index}`} className="font-medium">
                        {item.name}
                      </Label>
                      <div className="text-sm text-slate-500">
                        {item.description}
                      </div>
                      <div className="text-xs flex flex-wrap gap-x-4 mt-1">
                        <span>Weight: {item.weight}g</span>
                        <span>Price: ${item.price}</span>
                        <span>Category: {item.category}</span>
                        {item.brand && <span>Brand: {item.brand}</span>}
                        {item.barcodeValue && (
                          <span className="font-medium text-blue-600">
                            Barcode: {item.barcodeValue}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </ScrollArea>

              <Button
                onClick={createSelectedItems}
                disabled={
                  createItem.isPending ||
                  !analyzedItems.some(item => item.selected)
                }
                className="w-full mt-4"
              >
                {createItem.isPending
                  ? 'Creating Items...'
                  : 'Create Selected Items'}
              </Button>
            </div>
          )}

          {analysis && !analyzedItems.length && (
            <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-900 rounded">
              <pre className="whitespace-pre-wrap text-sm">{analysis}</pre>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
