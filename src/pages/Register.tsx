import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import * as z from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

import { Button, Input } from '@/components/ui'
import { handleException } from '@/lib/utils'
import { useUserRegister } from '@/queries/user'
import { Alert, AlertDescription, AlertIcon } from '../components/ui/Alert'

type RegisterForm = {
  username: string
  email: string
  password: string
}

const schema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters long')
    .max(20, 'Username must be at most 20 characters long')
    .regex(
      /^[a-zA-Z0-9_]+$/,
      'Username can only contain letters, numbers and underscores (_)'
    ),
  email: z.string().email(),
  password: z.string().min(6).max(50),
})

export const RegisterPage = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    mode: 'onBlur',
    resolver: zodResolver(schema),
    defaultValues: { username: '', email: '', password: '' },
  })
  const [error, setError] = useState<string | undefined>()
  const navigate = useNavigate()
  const signUp = useUserRegister()
  const [showPassword, setShowPassword] = useState(false)

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  const onSubmit = (data: RegisterForm) => {
    // Clear previous errors
    setError(undefined)
    
    signUp.mutate(data, {
      onSuccess: () => navigate('/'),
      onError: error => {
        handleException(error, {
          onHttpError: ({ response }) => {
            // Handle different error scenarios
            if (response?.status === 400) {
              const detail = response?.data.detail || 'Invalid registration data';
              const errors = response?.data.errors || {};
              
              // Check for specific validation errors
              if (errors.username) {
                setError(`Username error: ${errors.username}`);
              } else if (errors.email) {
                setError(`Email error: ${errors.email}`);
              } else if (errors.password) {
                setError(`Password error: ${errors.password}`);
              } else {
                setError(detail);
              }
            } else {
              setError(response?.data.detail || 'An error occurred during registration. Please try again.');
            }
          },
          onNetworkError: () => {
            setError('Network error. Please check your internet connection.');
          },
          onUnknownError: () => {
            setError('An unexpected error occurred. Please try again later.');
          }
        })
      },
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <h1>Sign Up</h1>
      {error && (
        <Alert variant="destructive" className="my-2">
          <AlertIcon variant="destructive" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="my-2">
        <label>Username</label>
        <Input
          {...register('username', { required: true })}
          placeholder="username"
        />
        <p className=" text-red-300 text-xs my-1">{errors.username?.message}</p>
      </div>
      <div className="my-2">
        <label>Email</label>
        <Input
          {...register('email', { required: true })}
          placeholder="john@muir.com"
        />
        <p className=" text-red-300 text-xs my-1">{errors.email?.message}</p>
      </div>
      <div className="my-2">
        <label>Password</label>
        <div className="relative">
          <Input
            {...register('password', { required: true })}
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••"
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
        <p className=" text-red-300 text-xs my-1">{errors.password?.message}</p>
      </div>
      <div className="flex justify-end mt-4">
        <Button type="submit" className="w-full" disabled={signUp.isPending}>
          Sign Up
        </Button>
      </div>
      <div className="mt-3">
        <p className="text-xs text-slate-200">
          Already have an account?{' '}
          <Link to="/auth/login" className="text-primary underline">
            Login
          </Link>
        </p>
      </div>
    </form>
  )
}
