import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'

import { Button, Input } from '@/components/ui'
import { Mixpanel } from '@/lib/mixpanel'
import { handleException } from '@/lib/utils'
import { useUserLogin } from '@/queries/user'
import { Alert, AlertDescription, AlertIcon } from '../components/ui/Alert'

type LoginForm = {
  emailOrUsername: string
  password: string
}

export const LoginPage = () => {
  const { register, handleSubmit } = useForm<LoginForm>()
  const [error, setError] = useState<string | undefined>()
  const navigate = useNavigate()
  const login = useUserLogin()
  const [showPassword, setShowPassword] = useState(false)

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  const onSubmit = (data: LoginForm) => {
    // Clear previous errors
    setError(undefined)
    
    login.mutate(data, {
      onSuccess: ({ user }) => {
        Mixpanel.identify(`${user.id}`)
        Mixpanel.track('User:Login')
        Mixpanel.people.set({
          $name: user.username,
          $email: user.email,
        })
        navigate('/')
      },
      onError: error => {
        handleException(error, {
          onHttpError: ({ response }) => {
            // Handle different error scenarios
            if (response?.status === 400) {
              setError(response?.data.detail || 'Invalid login credentials. Please check your email/username and password.')
            } else if (response?.status === 401) {
              setError('Authentication failed. Please check your credentials.')
            } else if (response?.status === 429) {
              setError('Too many login attempts. Please try again later.')
            } else {
              setError(response?.data.detail || 'An error occurred during login. Please try again.')
            }
          },
          onNetworkError: () => {
            setError('Network error. Please check your internet connection.')
          },
          onUnknownError: () => {
            setError('An unexpected error occurred. Please try again later.')
          }
        })
      },
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <h1>Login</h1>
      {error && (
        <Alert variant="destructive" className="my-2">
          <AlertIcon variant="destructive" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="my-2">
        <label>Email</label>
        <Input
          {...register('emailOrUsername', { required: true })}
          placeholder="Email or username"
          tabIndex={1}
        />
      </div>
      <div className="my-2">
        <div className="flex justify-between items-baseline">
          <label>Password</label>
          <Link
            to="/auth/request-password-reset"
            className="text-slate-200 underline text-xs"
            tabIndex={4}
          >
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <Input
            {...register('password', { required: true })}
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••"
            tabIndex={2}
          />
          <button
            type="button"
            onClick={togglePasswordVisibility}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>
      <div className="flex justify-end mt-4">
        <Button
          type="submit"
          className="w-full"
          disabled={login.isPending}
          tabIndex={3}
        >
          Login
        </Button>
      </div>
      <div className="mt-3">
        <p className="text-xs text-slate-200">
          Don't have an account?{' '}
          <Link to="/auth/register" className="text-primary underline">
            Sign Up
          </Link>
        </p>
      </div>
    </form>
  )
}
