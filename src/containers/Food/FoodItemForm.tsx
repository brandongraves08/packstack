import { FC, useState } from 'react'
import { useForm } from 'react-hook-form'
import { format } from 'date-fns'
import { CalendarIcon, Camera, ScanLine } from 'lucide-react'
import * as z from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

import { ImageAnalyzer } from '@/components/ImageAnalyzer'
import { Button } from '@/components/ui/Button'
import { Calendar } from '@/components/ui/Calendar'
import { Checkbox } from '@/components/ui/Checkbox'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/Form'
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
import { Textarea } from '@/components/ui/Textarea'
import { useToast } from '@/hooks/useToast'
import { useCategories } from '@/queries/category'
import { useCreateItem, useUpdateItem } from '@/queries/item'
import { FoodItemType, Item } from '@/types/item'

interface FoodItemFormProps {
  item?: Item
  onComplete: () => void
}

const foodTypes: Array<{ value: FoodItemType; label: string }> = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'meal', label: 'Complete Meal' },
  { value: 'snack', label: 'Snack' },
  { value: 'drink', label: 'Drink' },
  { value: 'dessert', label: 'Dessert' },
  { value: 'other', label: 'Other' },
]

const dietaryTags = [
  { id: 'vegan', label: 'Vegan' },
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'gluten-free', label: 'Gluten Free' },
  { id: 'dairy-free', label: 'Dairy Free' },
  { id: 'nut-free', label: 'Nut Free' },
  { id: 'keto', label: 'Keto' },
  { id: 'paleo', label: 'Paleo' },
  { id: 'high-protein', label: 'High Protein' },
  { id: 'low-sodium', label: 'Low Sodium' },
  { id: 'freeze-dried', label: 'Freeze Dried' },
  { id: 'dehydrated', label: 'Dehydrated' },
  { id: 'instant', label: 'Instant' },
]

const schema = z.object({
  name: z.string().min(1, { message: 'Name is required' }),
  brand_id: z.number().optional(),
  brand_new: z.string().optional(),
  category_id: z.number().optional(),
  category_new: z.string().optional(),
  weight: z.coerce.number().min(0).optional(),
  unit: z.string().optional(),
  price: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
  product_url: z.string().optional(),
  food_type: z.string().optional(),
  calories_per_serving: z.coerce.number().min(0).optional(),
  expiration_date: z.date().optional(),
  preparation_time: z.coerce.number().min(0).optional(),
  dietary_tags: z.array(z.string()).optional(),
  protein: z.coerce.number().min(0).optional(),
  carbs: z.coerce.number().min(0).optional(),
  fat: z.coerce.number().min(0).optional(),
  servingSize: z.coerce.number().min(0).optional(),
  servingUnit: z.string().optional(),
  servingsPerContainer: z.coerce.number().min(0).optional(),
})

type FormValues = z.infer<typeof schema>

export const FoodItemForm: FC<FoodItemFormProps> = ({ item, onComplete }) => {
  const createItem = useCreateItem()
  const updateItem = useUpdateItem()
  const { toast } = useToast()
  const { data: categories } = useCategories()
  const [imageAnalyzerOpen, setImageAnalyzerOpen] = useState(false)
  const [analysisMode, setAnalysisMode] = useState<'barcode' | 'image'>(
    'barcode'
  )

  const isEdit = !!item

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: item?.name || '',
      brand_id: item?.brand_id,
      category_id: item?.category_id,
      weight: item?.weight || 0,
      unit: item?.unit || 'g',
      price: item?.price || 0,
      notes: item?.notes || '',
      product_url: item?.product_url || '',
      food_type: item?.food_type || 'other',
      calories_per_serving: item?.calories_per_serving || 0,
      expiration_date: item?.expiration_date
        ? new Date(item.expiration_date)
        : undefined,
      preparation_time: item?.preparation_time || 0,
      dietary_tags: item?.dietary_tags || [],
      protein: item?.nutrition_info?.protein || 0,
      carbs: item?.nutrition_info?.carbs || 0,
      fat: item?.nutrition_info?.fat || 0,
      servingSize: item?.nutrition_info?.servingSize || 0,
      servingUnit: item?.nutrition_info?.servingUnit || 'g',
      servingsPerContainer: item?.nutrition_info?.servingsPerContainer || 1,
    },
  })

  // Function to handle item analysis results
  const handleImageAnalyzed = () => {
    setImageAnalyzerOpen(false)

    // Get the current ImageAnalyzer results from local storage
    // This is a temporary solution until we implement proper state management
    const analyzedItemsJson = localStorage.getItem('lastAnalyzedItems')
    if (analyzedItemsJson) {
      try {
        const analyzedItems = JSON.parse(analyzedItemsJson)
        if (analyzedItems && analyzedItems.length > 0) {
          // Get the first analyzed item (either barcode scan or image analysis)
          const analyzedItem = analyzedItems[0]

          if (analyzedItem) {
            // Populate the form with the analyzed item data
            form.setValue('name', analyzedItem.name)

            if (analyzedItem.brand) {
              form.setValue('brand_new', analyzedItem.brand)
            }

            if (analyzedItem.weight) {
              form.setValue('weight', analyzedItem.weight)
            }

            if (analyzedItem.price) {
              form.setValue('price', analyzedItem.price)
            }

            if (analyzedItem.category) {
              // Check if this is an existing category, otherwise set as new
              const existingCategory = categories?.find(
                c =>
                  c.name.toLowerCase() === analyzedItem.category.toLowerCase()
              )

              if (existingCategory) {
                form.setValue('category_id', existingCategory.id)
              } else {
                form.setValue('category_new', analyzedItem.category)
              }
            }

            // Set food-specific defaults
            form.setValue('food_type', 'other')

            // If product URL is available
            if (analyzedItem.productUrl) {
              form.setValue('product_url', analyzedItem.productUrl)
            }

            // If description is available, set it as notes
            if (analyzedItem.description) {
              form.setValue('notes', analyzedItem.description)
            }

            // Special message for barcode detection
            if (analysisMode === 'barcode' && analyzedItem.barcodeValue) {
              toast({
                title: 'Item data imported',
                description: `Scanned item "${analyzedItem.name}" with barcode ${analyzedItem.barcodeValue}`,
              })
            } else {
              toast({
                title: 'Item data imported',
                description: `Analyzed "${analyzedItem.name}" from image`,
              })
            }

            return
          }
        }
      } catch (error) {
        console.error('Error parsing analyzed items:', error)
      }
    }

    toast({
      title:
        analysisMode === 'barcode' ? 'No barcode detected' : 'Analysis failed',
      description:
        analysisMode === 'barcode'
          ? 'Try scanning again with a clearer image of the barcode.'
          : 'Try again with a clearer image of the food item.',
      variant: 'destructive',
    })
  }

  const onSubmit = (values: FormValues) => {
    const formData = {
      ...values,
      // If editing, preserve the ID
      ...(isEdit && { id: item.id }),
      // Format nutrition info
      nutrition_info: {
        protein: values.protein,
        carbs: values.carbs,
        fat: values.fat,
        servingSize: values.servingSize,
        servingUnit: values.servingUnit,
        servingsPerContainer: values.servingsPerContainer,
        calories: values.calories_per_serving,
      },
    }

    // Remove form-specific fields that shouldn't be sent to API
    delete formData.protein
    delete formData.carbs
    delete formData.fat
    delete formData.servingSize
    delete formData.servingUnit
    delete formData.servingsPerContainer

    if (isEdit) {
      updateItem.mutate(formData as any, {
        onSuccess: () => {
          toast({
            title: '✅ Food item updated',
            description: `${values.name} has been updated successfully.`,
          })
          onComplete()
        },
        onError: error => {
          toast({
            title: '❌ Error',
            description: `Failed to update item: ${error.message}`,
            variant: 'destructive',
          })
        },
      })
    } else {
      createItem.mutate(formData as any, {
        onSuccess: () => {
          toast({
            title: '✅ Food item added',
            description: `${values.name} has been added to your inventory.`,
          })
          onComplete()
        },
        onError: error => {
          toast({
            title: '❌ Error',
            description: `Failed to create item: ${error.message}`,
            variant: 'destructive',
          })
        },
      })
    }
  }

  const categoryOptions =
    categories?.map(category => ({
      label: category.name,
      value: category.id.toString(),
    })) || []

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Name*</FormLabel>
                <div className="flex gap-2">
                  <FormControl className="flex-1">
                    <Input placeholder="Food item name" {...field} />
                  </FormControl>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex items-center gap-2"
                    onClick={() => {
                      setAnalysisMode('barcode')
                      setImageAnalyzerOpen(true)
                    }}
                  >
                    <ScanLine className="h-4 w-4" />
                    Scan Barcode
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex items-center gap-2"
                    onClick={() => {
                      setAnalysisMode('image')
                      setImageAnalyzerOpen(true)
                    }}
                  >
                    <Camera className="h-4 w-4" />
                    Analyze Photo
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="brand_new"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Brand</FormLabel>
                <FormControl>
                  <Input placeholder="Brand name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="food_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Food Type</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {foodTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select
                  onValueChange={value => field.onChange(parseInt(value))}
                  defaultValue={field.value?.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categoryOptions.map(category => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category_new"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New Category</FormLabel>
                <FormControl>
                  <Input placeholder="Or create new category" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="col-span-2">
            <h3 className="text-lg font-medium mb-2">Weight & Measurements</h3>
          </div>

          <FormField
            control={form.control}
            name="weight"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Weight</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="unit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unit</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="g">Grams (g)</SelectItem>
                    <SelectItem value="kg">Kilograms (kg)</SelectItem>
                    <SelectItem value="oz">Ounces (oz)</SelectItem>
                    <SelectItem value="lb">Pounds (lb)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="expiration_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Expiration Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={'outline'}
                        className={`w-full pl-3 text-left font-normal ${
                          !field.value && 'text-muted-foreground'
                        }`}
                      >
                        {field.value ? (
                          format(field.value, 'PPP')
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="col-span-2">
            <h3 className="text-lg font-medium mb-2">Nutrition Information</h3>
          </div>

          <FormField
            control={form.control}
            name="calories_per_serving"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Calories (per serving)</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="preparation_time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preparation Time (minutes)</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="protein"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Protein (g)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.1" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="carbs"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Carbs (g)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.1" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="fat"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fat (g)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.1" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="servingSize"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Serving Size</FormLabel>
                <FormControl>
                  <Input type="number" step="0.1" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="servingUnit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Serving Unit</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="g">Grams (g)</SelectItem>
                    <SelectItem value="oz">Ounces (oz)</SelectItem>
                    <SelectItem value="cup">Cup</SelectItem>
                    <SelectItem value="tbsp">Tablespoon</SelectItem>
                    <SelectItem value="tsp">Teaspoon</SelectItem>
                    <SelectItem value="ml">Milliliter (ml)</SelectItem>
                    <SelectItem value="piece">Piece</SelectItem>
                    <SelectItem value="package">Package</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="servingsPerContainer"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Servings Per Container</FormLabel>
                <FormControl>
                  <Input type="number" step="0.1" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="col-span-2">
            <h3 className="text-lg font-medium mb-2">Dietary Information</h3>
          </div>

          <FormField
            control={form.control}
            name="dietary_tags"
            render={() => (
              <FormItem className="col-span-2">
                <FormLabel>Dietary Tags</FormLabel>
                <div className="grid grid-cols-3 gap-2">
                  {dietaryTags.map(tag => (
                    <FormField
                      key={tag.id}
                      control={form.control}
                      name="dietary_tags"
                      render={({ field }) => {
                        return (
                          <FormItem
                            key={tag.id}
                            className="flex flex-row items-start space-x-3 space-y-0"
                          >
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(tag.id)}
                                onCheckedChange={checked => {
                                  const currentValues = field.value || []
                                  if (checked) {
                                    field.onChange([...currentValues, tag.id])
                                  } else {
                                    field.onChange(
                                      currentValues.filter(
                                        value => value !== tag.id
                                      )
                                    )
                                  }
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal">
                              {tag.label}
                            </FormLabel>
                          </FormItem>
                        )
                      }}
                    />
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Any special preparation instructions or notes about this food item"
                    {...field}
                    rows={3}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="product_url"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Product URL</FormLabel>
                <FormControl>
                  <Input placeholder="Link to purchase this item" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onComplete}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createItem.isPending || updateItem.isPending}
          >
            {isEdit ? 'Update' : 'Add'} Food Item
          </Button>
        </div>
      </form>

      {/* Image/Barcode Analyzer */}
      <ImageAnalyzer
        open={imageAnalyzerOpen}
        onOpenChange={setImageAnalyzerOpen}
        onItemCreated={handleImageAnalyzed}
      />
    </Form>
  )
}
