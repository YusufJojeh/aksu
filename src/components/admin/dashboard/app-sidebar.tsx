import * as React from 'react'
import {
  BarChart3Icon,
  FilesIcon,
  ArrowRightLeftIcon,
  PhoneIcon,
  UserRoundIcon,
  UsersIcon,
  StethoscopeIcon,
  IdCardIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { NavMain } from '@/components/admin/dashboard/nav-main'
import { NavUser } from '@/components/admin/dashboard/nav-user'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import type { AdminView } from '@/components/admin/dashboard/types'

export function AppSidebar({
  view,
  onViewChange,
  user,
  onLogout,
  onProfile,
  onSalesWorkspace,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  view: AdminView
  onViewChange: (view: AdminView) => void
  user: { name: string; email: string }
  onLogout: () => void
  onProfile: () => void
  onSalesWorkspace: () => void
}) {
  const { t, i18n } = useTranslation()
  const dir = i18n.dir()
  const { isMobile, setOpenMobile } = useSidebar()
  const closeOnMobile = () => {
    if (isMobile) setOpenMobile(false)
  }

  const navItems: { view: AdminView; title: string; icon: React.ReactNode }[] = [
    { view: 'dashboard', title: t('admin.nav.dashboard'), icon: <BarChart3Icon /> },
    { view: 'employees', title: t('admin.nav.employees'), icon: <UserRoundIcon /> },
    { view: 'channels', title: t('admin.nav.channels'), icon: <PhoneIcon /> },
    { view: 'reports', title: t('admin.nav.reports'), icon: <FilesIcon /> },
    { view: 'customers', title: t('admin.nav.customers'), icon: <UsersIcon /> },
    { view: 'profile', title: t('admin.nav.profile', 'Profile'), icon: <IdCardIcon /> },
  ]

  return (
    <Sidebar collapsible="icon" side={dir === 'rtl' ? 'right' : 'left'} dir={dir} {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            {/* The brand is not interactive, so it renders as a div rather than a disabled button. */}
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5! hover:bg-transparent active:bg-transparent"
            >
              <div>
                <StethoscopeIcon className="size-5!" aria-hidden />
                <span className="text-base font-semibold">{t('admin.nav.brand')}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain
          items={navItems.map((item) => ({
            title: item.title,
            icon: item.icon,
            isActive: view === item.view,
            onClick: () => {
              onViewChange(item.view)
              closeOnMobile()
            },
          }))}
        />
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={user}
          onLogout={onLogout}
          onProfile={() => {
            onProfile()
            closeOnMobile()
          }}
        />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => {
                onSalesWorkspace()
                closeOnMobile()
              }}
              tooltip={t('admin.nav.salesWorkspace')}
            >
              <ArrowRightLeftIcon />
              <span>{t('admin.nav.salesWorkspace')}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
