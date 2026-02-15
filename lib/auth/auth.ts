import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import { prisma } from '@/lib/db/prisma'
import { Role } from '@/lib/permissions/rbac'

/**
 * NextAuth Configuration
 *
 * Features:
 * - Credential-based authentication
 * - Tenant-aware sessions (includes tenantId in JWT)
 * - Role-based access control (OWNER/STAFF)
 * - Secure password verification with bcryptjs
 */

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: {
          label: 'Email',
          type: 'email',
          placeholder: 'your@email.com',
        },
        password: {
          label: 'Password',
          type: 'password',
        },
      },
      async authorize(credentials) {
        // Validate credentials exist
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required')
        }

        try {
          // Find user by email with tenant relation
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
            include: {
              tenant: true,
            },
          })

          // User not found
          if (!user) {
            throw new Error('Invalid email or password')
          }

          // Verify password
          const isPasswordValid = await compare(
            credentials.password,
            user.password
          )

          if (!isPasswordValid) {
            throw new Error('Invalid email or password')
          }

          // Check if tenant is active
          if (user.tenant.status === 'SUSPENDED') {
            throw new Error('Your account has been suspended. Please contact support.')
          }

          // Return user data for session
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role as unknown as Role,
            tenantId: user.tenantId,
          }
        } catch (error) {
          // Log error server-side for debugging
          console.error('Authentication error:', error)

          // Return user-friendly error
          if (error instanceof Error) {
            throw error
          }
          throw new Error('Authentication failed. Please try again.')
        }
      },
    }),
  ],

  // Use JWT strategy for serverless compatibility
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  // Callbacks to add custom data to session
  callbacks: {
    /**
     * JWT Callback - Add user data to token
     * This runs when JWT is created or updated
     */
    async jwt({ token, user }) {
      // On sign in, add user data to token
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.role = user.role
        token.tenantId = user.tenantId
      }
      return token
    },

    /**
     * Session Callback - Add token data to session
     * This runs whenever session is accessed
     */
    async session({ session, token }) {
      // Add token data to session object
      if (session.user) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.name = token.name as string
        session.user.role = token.role as unknown as Role
        session.user.tenantId = token.tenantId as string
      }
      return session
    },
  },

  // Custom pages
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },

  // Security options
  secret: process.env.NEXTAUTH_SECRET,

  // Enable debug messages in development
  debug: process.env.NODE_ENV === 'development',
}
