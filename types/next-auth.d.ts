import { Role } from '@/lib/permissions/rbac'
import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  /**
   * Extended User type with tenant and role information
   */
  interface User {
    id: string
    email: string
    name: string
    role: Role
    tenantId: string
  }

  /**
   * Extended Session type with tenant-aware user
   */
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: Role
      tenantId: string
    }
  }
}

declare module 'next-auth/jwt' {
  /**
   * Extended JWT token with tenant and role information
   */
  interface JWT {
    id: string
    email: string
    name: string
    role: Role
    tenantId: string
  }
}
