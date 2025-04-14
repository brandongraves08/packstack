import { FC, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

import { ImageAnalyzer } from '@/components/ImageAnalyzer'
import { Input } from '@/components/ui'
import { Button } from '@/components/ui'
import { Checkbox } from '@/components/ui/Checkbox'
import { Combobox } from '@/components/ui/ComboBox'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/Form'
import { Label } from '@/components/ui/Label'
import { ScrollArea } from '@/components/ui/ScrollArea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { AmazonProductSearch } from '@/containers/AmazonProductSearch'
import { AmazonProduct } from '@/lib/amazonApi'
import { convertWeight } from '@/lib/weight'
import { useCategories } from '@/queries/category'
import {
  useCreateItem,
  useDeleteItem,
  useItemSearch,
  useProductDetails,
  useUpdateItem,
} from '@/queries/item'
import {
  useProducts,
  useProductVariants,
  useSearchBrands,
} from '@/queries/resources'
import { Item, ItemForm as ItemFormValues, Unit } from '@/types/item'

// TODO add field max/min length
const schema = z.object({
  itemname: z.string().min(1, 'Name is required'),
  brand_id: z.number().optional(),
  brand_new: z.string().optional(),
  product_id: z.number().optional(),
  product_new: z.string().optional(),
  product_variant_id: z.number().optional(),
  product_variant_new: z.string().optional(),
  category_id: z.number().optional(),
  category_new: z.string().optional(),
  weight: z.coerce.number().min(0, 'Weight must be positive').optional(),
  unit: z.string().optional(),
  price: z.coerce.number().min(0, 'Price must be positive').optional(),
  consumable: z.boolean().optional(),
  product_url: z.string().optional(),
  notes: z.string().optional(),
})

type Props = {
  item?: Item
  open: boolean
  title: string
  onOpenChange: (open: boolean) => void
  onClose: () => void
  children?: React.ReactNode
}

const formDefaults = (item?: Item) => ({
  itemname: item?.name || '',
  brand_id: item?.brand_id || undefined,
  product_id: item?.product_id || undefined,
  product_variant_id: item?.product_variant_id || undefined,
  category_id: item?.category?.category_id || undefined,
  weight: item?.weight || 0,
  unit: item?.unit || 'g',
  price: item?.price || 0,
  consumable: item?.consumable || false,
  product_url: item?.product_url || '',
  notes: item?.notes || '',
})

export const ItemForm: FC<Props> = ({
  item,
  title,
  open,
  onOpenChange,
  onClose,
  children,
}) => {
  const [brandSearch, setBrandSearch] = useState(item?.brand?.name || '')
  const [itemNameSearch, setItemNameSearch] = useState(item?.name || '')
  const [another, setAnother] = useState(false)
  const [imageAnalyzerOpen, setImageAnalyzerOpen] = useState(false)
  const [amazonSearchOpen, setAmazonSearchOpen] = useState(false)

  const createItem = useCreateItem()
  const updateItem = useUpdateItem()
  const deleteItem = useDeleteItem()
  const productDetails = useProductDetails()
  const searchBrands = useSearchBrands({ query: brandSearch, enabled: open })
  const { data: itemSuggestions = [] } = useItemSearch(itemNameSearch, open)

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(schema),
    defaultValues: formDefaults(item),
  })

  useEffect(() => {
    form.reset(formDefaults(item))
  }, [item])

  const brandId = form.watch('brand_id')
  const productId = form.watch('product_id')

  const { data: categories } = useCategories()
  const { data: brand } = useProducts({
    brandId,
    enabled: open,
  })
  const { data: productVariants } = useProductVariants({
    productId,
    enabled: open,
  })

  const noBrandSelected = !brandId && !form.watch('brand_new')
  const noProductSelected = !productId && !form.watch('product_new')

  const brandOptions = useMemo(
    () =>
      (searchBrands.data || []).map(({ id, name }) => ({
        label: name,
        value: id,
      })),
    [searchBrands.data]
  )

  const productOptions = useMemo(
    () =>
      (brand?.products || []).map(({ id, name }) => ({
        label: name,
        value: id,
      })),
    [brand?.products]
  )

  const productVariantOptions = useMemo(
    () =>
      (productVariants || []).map(({ id, name, weight, unit }) => ({
        label: `${name}${
          weight && unit ? ` (${weight}${unit === 'g' ? 'g' : 'oz'})` : ''
        }`,
        value: id,
        weight,
        unit,
      })),
    [productVariants]
  )

  const categoryOptions = useMemo(
    () =>
      (categories || [])
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(({ id, name }) => ({
          label: name,
          value: id,
        })),
    [categories]
  )

  // Auto-fill product details
  useEffect(() => {
    // Only fetch if a product is selected but not the variant
    if (brandId && productId && !form.watch('product_variant_id')) {
      // Fetch product details
      productDetails.mutate(
        { brandId, productId },
        {
          onSuccess: data => {
            if (data.name) {
              form.setValue('itemname', data.name)
            }
            if (data.weight) {
              const { value, unit } = convertWeight(data.weight, data.unit)
              form.setValue('weight', value)
              form.setValue('unit', unit as Unit)
            }
            if (data.price != null) {
              form.setValue('price', data.price)
            }
            if (data.url) {
              form.setValue('product_url', data.url)
            }
            if (data.description) {
              form.setValue('notes', data.description)
            }
          },
        }
      )
    }
  }, [brandId, productId, form, productDetails])

  // Auto-fill product variant details
  useEffect(() => {
    const variantId = form.watch('product_variant_id')
    if (brandId && productId && variantId) {
      const variant = productVariantOptions.find(
        ({ value }) => value === variantId
      )

      if (variant?.weight) {
        const { value, unit } = convertWeight(variant.weight, variant.unit)
        form.setValue('weight', value)
        form.setValue('unit', unit as Unit)
      }
    }
  }, [form.watch('product_variant_id')])

  const onSelectProduct = (id: number) => {
    if (brand && brandId) {
      form.setValue('product_id', id)
      form.setValue('product_new', undefined)
      form.setValue('product_variant_id', undefined)
      form.setValue('product_variant_new', undefined)
    }
  }

  const onSubmit = async (data: ItemFormValues) => {
    try {
      if (item) {
        const res = await updateItem.mutateAsync({
          ...data,
          item_id: item.id,
        })
        onSuccess()
        return res
      } else {
        const res = await createItem.mutateAsync(data)
        onSuccess()
        return res
      }
    } catch (err) {
      // swallow, handled by react-query
    }

    function onSuccess() {
      if (!another) {
        onClose()
      } else {
        form.reset(formDefaults())
      }
    }
  }

  const onDelete = async () => {
    if (!item?.id) return
    await deleteItem.mutateAsync(item.id)
    onClose()
  }

  const handleImageAnalyzed = () => {
    // This will be called after an image was successfully analyzed and added to inventory
    setImageAnalyzerOpen(false)
  }

  const handleAmazonProductSelect = (product: AmazonProduct) => {
    // Set form values based on the Amazon product
    form.setValue('itemname', product.title)

    // Set brand if present
    if (product.brand) {
      form.setValue('brand_new', product.brand)
      form.setValue('brand_id', undefined) // Clear any selected brand ID
    }

    // Extract price - remove currency symbol and convert to number
    if (product.price) {
      const priceNumber = parseFloat(product.price.replace(/[^0-9.]/g, ''))
      if (!isNaN(priceNumber)) {
        form.setValue('price', priceNumber)
      }
    }

    // Set product URL
    if (product.url) {
      form.setValue('product_url', product.url)
    }

    // Close the Amazon search dialog
    setAmazonSearchOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-screen lg:max-w-screen-md overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-grow">
          <Form {...form}>
            <form
              id="item-form"
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4 px-1"
            >
              <div className="flex justify-between items-center mb-4">
                <div className="space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setImageAnalyzerOpen(true)}
                  >
                    Analyze Image
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAmazonSearchOpen(true)}
                  >
                    Search Amazon
                  </Button>
                </div>
              </div>

              {children}

              <FormField
                control={form.control}
                name="itemname"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <div className="relative">
                      <Input
                        placeholder="Item name"
                        {...field}
                        onChange={e => {
                          field.onChange(e)
                          setItemNameSearch(e.target.value)
                        }}
                      />
                      {itemSuggestions.length > 0 &&
                        itemNameSearch.length >= 2 && (
                          <div className="absolute z-10 mt-1 w-full bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
                            {itemSuggestions.map(suggestion => (
                              <div
                                key={suggestion.id}
                                className="px-4 py-2 cursor-pointer hover:bg-accent flex flex-col"
                                onClick={() => {
                                  field.onChange(suggestion.name)
                                  setItemNameSearch(suggestion.name)
                                  // If brand field is empty, also set the brand
                                  if (
                                    !form.getValues('brand_id') &&
                                    !form.getValues('brand_new')
                                  ) {
                                    form.setValue('brand_new', suggestion.brand)
                                    setBrandSearch(suggestion.brand)
                                  }
                                }}
                              >
                                <span className="font-medium">
                                  {suggestion.name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {suggestion.brand}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="brand_id"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Brand</FormLabel>
                    <div className="flex-1 pr-1">
                      <Combobox
                        placeholder="Search brands"
                        value={field.value}
                        onValueChange={value => {
                          field.onChange(value)
                          form.setValue('brand_new', undefined)
                        }}
                        items={brandOptions}
                        onInputChange={value => setBrandSearch(value)}
                        searchValue={brandSearch}
                      />
                    </div>

                    <div className="mt-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        Or,{' '}
                        <FormField
                          control={form.control}
                          name="brand_new"
                          render={({ field }) => (
                            <FormItem>
                              <Input
                                className="h-5"
                                placeholder="Enter new brand name"
                                {...field}
                                value={field.value || ''}
                                onChange={e => {
                                  field.onChange(e.target.value)
                                  form.setValue('brand_id', undefined)
                                }}
                              />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </FormItem>
                )}
              />

              {!noBrandSelected && (
                <FormField
                  control={form.control}
                  name="product_id"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Product</FormLabel>
                      <div className="flex flex-1 gap-2">
                        <div className="flex-1">
                          <Combobox
                            disabled={noBrandSelected}
                            placeholder="Select product"
                            value={field.value}
                            onValueChange={value => {
                              field.onChange(value)
                              form.setValue('product_new', undefined)
                              form.setValue('product_variant_id', undefined)
                              form.setValue('product_variant_new', undefined)
                              onSelectProduct(value)
                            }}
                            items={productOptions}
                          />
                        </div>
                      </div>

                      <div className="mt-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          Or,{' '}
                          <FormField
                            control={form.control}
                            name="product_new"
                            render={({ field }) => (
                              <FormItem>
                                <Input
                                  className="h-5"
                                  placeholder="Add new product"
                                  {...field}
                                  value={field.value || ''}
                                  onChange={e => {
                                    field.onChange(e.target.value)
                                    form.setValue('product_id', undefined)
                                    form.setValue(
                                      'product_variant_id',
                                      undefined
                                    )
                                    form.setValue(
                                      'product_variant_new',
                                      undefined
                                    )
                                  }}
                                  disabled={noBrandSelected}
                                />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </FormItem>
                  )}
                />
              )}

              {!noBrandSelected && !noProductSelected && (
                <FormField
                  control={form.control}
                  name="product_variant_id"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Product Variant</FormLabel>
                      <div className="flex flex-1 gap-2">
                        <div className="flex-1">
                          <Combobox
                            disabled={noBrandSelected || noProductSelected}
                            placeholder="Select variant"
                            value={field.value}
                            onValueChange={value => {
                              field.onChange(value)
                              form.setValue('product_variant_new', undefined)
                            }}
                            items={productVariantOptions}
                          />
                        </div>
                      </div>

                      <div className="mt-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          Or,{' '}
                          <FormField
                            control={form.control}
                            name="product_variant_new"
                            render={({ field }) => (
                              <FormItem>
                                <Input
                                  className="h-5"
                                  placeholder="Add new variant"
                                  {...field}
                                  value={field.value || ''}
                                  onChange={e => {
                                    field.onChange(e.target.value)
                                    form.setValue(
                                      'product_variant_id',
                                      undefined
                                    )
                                  }}
                                  disabled={
                                    noBrandSelected || noProductSelected
                                  }
                                />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Category</FormLabel>
                    <div className="flex flex-1 gap-2">
                      <div className="flex-1">
                        <Combobox
                          placeholder="Select category"
                          value={field.value}
                          onValueChange={value => {
                            field.onChange(value)
                            form.setValue('category_new', undefined)
                          }}
                          items={categoryOptions}
                        />
                      </div>
                    </div>

                    <div className="mt-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        Or,{' '}
                        <FormField
                          control={form.control}
                          name="category_new"
                          render={({ field }) => (
                            <FormItem>
                              <Input
                                className="h-5"
                                placeholder="Add new category"
                                {...field}
                                value={field.value || ''}
                                onChange={e => {
                                  field.onChange(e.target.value)
                                  form.setValue('category_id', undefined)
                                }}
                              />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </FormItem>
                )}
              />

              <div className="flex flex-1 gap-2">
                <FormField
                  control={form.control}
                  name="weight"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Weight</FormLabel>
                      <Input
                        {...field}
                        type="number"
                        step=".01"
                        placeholder="0.00"
                        onFocus={() => {
                          if (!field.value) field.onChange('')
                        }}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex-1">
                  <FormField
                    control={form.control}
                    name="unit"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormLabel>Unit</FormLabel>
                        <SelectTrigger id="unit">
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="g">g</SelectItem>
                          <SelectItem value="kg">kg</SelectItem>
                          <SelectItem value="oz">oz</SelectItem>
                          <SelectItem value="lb">lb</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Price</FormLabel>
                      <Input
                        {...field}
                        type="number"
                        step=".01"
                        placeholder="0.00"
                        onFocus={() => {
                          if (!field.value) field.onChange('')
                        }}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="consumable"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2 space-y-0 my-4">
                    <FormControl>
                      <Checkbox
                        id="consumable"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel htmlFor="consumable" className="font-normal">
                      Consumable
                    </FormLabel>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="product_url"
                render={({ field }) => (
                  <FormItem className="my-4">
                    <FormLabel>Product URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="my-4">
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="https://" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </ScrollArea>
        <DialogFooter>
          <div className={`flex justify-between items-center`}>
            {item && (
              <Button
                type="button"
                variant="outline"
                onClick={onDelete}
                disabled={updateItem.isPending || createItem.isPending}
              >
                Delete Item
              </Button>
            )}
            {!item && (
              <div className="inline-flex gap-1.5">
                <Checkbox
                  id="create-another"
                  checked={another}
                  onCheckedChange={() => setAnother(!another)}
                />
                <Label
                  htmlFor="create-another"
                  className="font-normal text-xs mb-0"
                >
                  Create another
                </Label>
              </div>
            )}
            <Button
              type="submit"
              variant="secondary"
              form="item-form"
              className="min-w-[25%]"
              disabled={updateItem.isPending || createItem.isPending}
            >
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      {/* Image Analyzer Modal */}
      <ImageAnalyzer
        open={imageAnalyzerOpen}
        onOpenChange={setImageAnalyzerOpen}
        onItemCreated={handleImageAnalyzed}
      />

      {/* Amazon Product Search Modal */}
      <AmazonProductSearch
        open={amazonSearchOpen}
        onOpenChange={setAmazonSearchOpen}
        onSelectProduct={handleAmazonProductSelect}
      />
    </Dialog>
  )
}
