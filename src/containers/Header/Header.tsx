import { useState } from 'react'
import { NavLink } from 'react-router-dom'

import logo from '/packstack_logo_white.png'
import { Button } from '@/components/ui/Button'
import DarkModeToggle from '@/components/ui/DarkModeToggle'

import { GearAssistant } from '../GearAssistant'

export const Header = () => {
  const [gearAssistantOpen, setGearAssistantOpen] = useState(false)

  const authenticatedLinks = [
    {
      name: 'Packing Lists',
      path: '/',
    },
    {
      name: 'Inventory',
      path: '/inventory',
    },
    {
      name: 'Trip Planner',
      path: '/trip-planner',
    },
    {
      name: 'Dashboard',
      path: '/dashboard',
    },
    {
      name: 'Create Pack',
      path: '/pack/new',
    },
    {
      name: 'Settings',
      path: '/settings',
    },
  ]

  return (
    <>
      <div className="px-4 bg-slate-50 dark:bg-slate-900">
        <div className="flex justify-between items-center">
          <div className="w-[120px]">
            <img src={logo} className="invert dark:invert-0" alt="" />
          </div>
          <div className="flex gap-6 items-center">
            <Button
              variant="ghost"
              onClick={() => setGearAssistantOpen(true)}
              className="text-sm font-semibold"
            >
              AI Assistant
            </Button>
            {authenticatedLinks.map(({ name, path }) => (
              <NavLink
                key={path}
                to={path}
                className={({ isActive }) =>
                  `py-4 text-sm font-semibold ${
                    isActive ? 'border-b-2 border-primary' : ''
                  }`
                }
              >
                {name}
              </NavLink>
            ))}
            <DarkModeToggle />
          </div>
        </div>
      </div>

      <GearAssistant
        open={gearAssistantOpen}
        onOpenChange={setGearAssistantOpen}
      />
    </>
  )
}
