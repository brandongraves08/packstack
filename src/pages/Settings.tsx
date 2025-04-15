import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { Check, Eye, EyeOff, LogOut } from 'lucide-react'
import * as z from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { SelectValue } from '@radix-ui/react-select'

import { Box, Button, Input } from '@/components/ui'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/Form'
import { ScrollArea } from '@/components/ui/ScrollArea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/Select'
import { useUser } from '@/hooks/useUser'
import { DISTANCE, distances, weightUnits } from '@/lib/consts'
import { SYSTEM_UNIT } from '@/lib/consts'
import { currencies } from '@/lib/currencies'
import { Mixpanel } from '@/lib/mixpanel'
import { useUpdateUser } from '@/queries/user'

type SettingsForm = {
  email: string
  currency: string
  unit_distance: DISTANCE
  unit_weight: SYSTEM_UNIT
  openai_api_key?: string
  amazon_access_key?: string
  amazon_secret_key?: string
  amazon_associate_tag?: string
  walmart_client_id?: string
  walmart_client_secret?: string
}

const schema = z.object({
  email: z.string().email(),
  currency: z.string(),
  unit_distance: z.string(),
  unit_weight: z.enum(['IMPERIAL', 'METRIC']),
  openai_api_key: z.string().optional(),
  amazon_access_key: z.string().optional(),
  amazon_secret_key: z.string().optional(),
  amazon_associate_tag: z.string().optional(),
  walmart_client_id: z.string().optional(),
  walmart_client_secret: z.string().optional(),
})

export const Settings = () => {
  const user = useUser()
  const navigate = useNavigate()
  const updateUser = useUpdateUser()
  const form = useForm<SettingsForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: user.email || '',
      currency: user.currency.code || '',
      unit_distance: user.unit_distance || DISTANCE.Kilometers,
      unit_weight: user.unit_weight || 'METRIC',
      openai_api_key: user.openai_api_key || '',
      amazon_access_key: user.amazon_access_key || '',
      amazon_secret_key: user.amazon_secret_key || '',
      amazon_associate_tag: user.amazon_associate_tag || '',
      walmart_client_id: user.walmart_client_id || '',
      walmart_client_secret: user.walmart_client_secret || '',
    },
  })

  const [showOpenAIKey, setShowOpenAIKey] = useState(false)
  const [showAmazonKeys, setShowAmazonKeys] = useState(false)
  const [showWalmartKeys, setShowWalmartKeys] = useState(false)
  const [showSaveSuccess, setShowSaveSuccess] = useState(false)

  const toggleOpenAIKeyVisibility = () => setShowOpenAIKey(!showOpenAIKey)
  const toggleAmazonKeysVisibility = () => setShowAmazonKeys(!showAmazonKeys)
  const toggleWalmartKeysVisibility = () => setShowWalmartKeys(!showWalmartKeys)

  const onSubmit = (data: SettingsForm) => {
    updateUser.mutate(data, {
      onSuccess: () => {
        Mixpanel.track('Settings:Updated', { ...data })
        setShowSaveSuccess(true)
        // Hide success message after 3 seconds
        setTimeout(() => setShowSaveSuccess(false), 3000)
      },
    })
  }

  const onLogout = () => {
    localStorage.removeItem('jwt')
    navigate('/auth/login')
  }

  return (
    <div className="max-w-lg mx-auto my-8">
      {showSaveSuccess && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4 flex items-center">
          <Check className="mr-2" size={16} />
          <span>Settings saved successfully!</span>
        </div>
      )}
      <Box>
        <h2>General Settings</h2>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Form {...form}>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="my-4">
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="unit_weight"
              render={({ field }) => (
                <FormItem className="my-4">
                  <FormLabel>Weight Unit</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder="Select weight unit..."
                          defaultValue={field.value}
                        />
                        <SelectContent>
                          {weightUnits.map(({ label, value }) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </SelectTrigger>
                    </FormControl>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem className="my-4">
                  <FormLabel>Currency</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select currency..." />
                        <SelectContent>
                          <ScrollArea className="h-80">
                            {currencies.map(({ code, name }) => (
                              <SelectItem key={code} value={code}>
                                ({code}) {name}
                              </SelectItem>
                            ))}
                          </ScrollArea>
                        </SelectContent>
                      </SelectTrigger>
                    </FormControl>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="unit_distance"
              render={({ field }) => (
                <FormItem className="my-4">
                  <FormLabel>Distance Unit</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder="Select distance unit..."
                          defaultValue={field.value}
                        />
                        <SelectContent>
                          {distances.map(({ label, value }) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </SelectTrigger>
                    </FormControl>
                  </Select>
                </FormItem>
              )}
            />
          </Form>

          <div className="flex justify-between">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => onLogout()}
            >
              <LogOut size={12} /> Logout
            </Button>
            <Button variant="secondary" disabled={updateUser.isPending}>
              Save
            </Button>
          </div>
        </form>
      </Box>

      <Box className="mt-8">
        <h2>API Keys</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Add your API keys to enable shopping integrations and AI-powered
          recommendations. These keys are securely stored and only used for the
          specified services.
        </p>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Form {...form}>
            <h3 className="text-md font-medium mt-6 mb-2">OpenAI</h3>
            <FormField
              control={form.control}
              name="openai_api_key"
              render={({ field }) => (
                <FormItem className="my-4">
                  <FormLabel>OpenAI API Key</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showOpenAIKey ? 'text' : 'password'}
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={toggleOpenAIKeyVisibility}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5"
                        aria-label={
                          showOpenAIKey ? 'Hide API key' : 'Show API key'
                        }
                      >
                        {showOpenAIKey ? (
                          <EyeOff size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Required for AI-powered recommendations.
                    <ol className="mt-1 ml-4 list-decimal">
                      <li>
                        Create an account at{' '}
                        <a
                          href="https://platform.openai.com/signup"
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-500 hover:underline"
                        >
                          OpenAI Platform
                        </a>
                      </li>
                      <li>
                        Navigate to{' '}
                        <a
                          href="https://platform.openai.com/api-keys"
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-500 hover:underline"
                        >
                          API Keys
                        </a>
                      </li>
                      <li>Click "Create new secret key"</li>
                      <li>Copy and paste the key here (starts with "sk-")</li>
                      <li>Make sure your account has available credits</li>
                    </ol>
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <h3 className="text-md font-medium mt-6 mb-2">Amazon</h3>
            <FormField
              control={form.control}
              name="amazon_access_key"
              render={({ field }) => (
                <FormItem className="my-4">
                  <FormLabel>Amazon Access Key</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showAmazonKeys ? 'text' : 'password'}
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={toggleAmazonKeysVisibility}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5"
                        aria-label={
                          showAmazonKeys ? 'Hide API key' : 'Show API key'
                        }
                      >
                        {showAmazonKeys ? (
                          <EyeOff size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amazon_secret_key"
              render={({ field }) => (
                <FormItem className="my-4">
                  <FormLabel>Amazon Secret Key</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showAmazonKeys ? 'text' : 'password'}
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={toggleAmazonKeysVisibility}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5"
                        aria-label={
                          showAmazonKeys ? 'Hide API key' : 'Show API key'
                        }
                      >
                        {showAmazonKeys ? (
                          <EyeOff size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amazon_associate_tag"
              render={({ field }) => (
                <FormItem className="my-4">
                  <FormLabel>Amazon Associate Tag</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Required for Amazon product recommendations. Sign up at{' '}
                    <a
                      href="https://affiliate-program.amazon.com/"
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      Amazon Associates
                    </a>
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <h3 className="text-md font-medium mt-6 mb-2">Walmart</h3>
            <FormField
              control={form.control}
              name="walmart_client_id"
              render={({ field }) => (
                <FormItem className="my-4">
                  <FormLabel>Walmart Client ID</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="walmart_client_secret"
              render={({ field }) => (
                <FormItem className="my-4">
                  <FormLabel>Walmart Client Secret</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showWalmartKeys ? 'text' : 'password'}
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={toggleWalmartKeysVisibility}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5"
                        aria-label={
                          showWalmartKeys ? 'Hide API key' : 'Show API key'
                        }
                      >
                        {showWalmartKeys ? (
                          <EyeOff size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Required for Walmart product recommendations. Sign up at{' '}
                    <a
                      href="https://developer.walmart.com/"
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      Walmart Developer Portal
                    </a>
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              variant="secondary"
              className="mt-4"
              disabled={updateUser.isPending}
            >
              Save API Keys
            </Button>
          </Form>
        </form>
      </Box>

      <Box className="mt-8">
        <p>
          Packstack is open-source software. You can find the code repository on{' '}
          <a
            href="https://github.com/Packstack-Tech/app"
            target="_blank"
            className="link"
            rel="noreferrer"
          >
            Github
          </a>
          .
        </p>
      </Box>
    </div>
  )
}
