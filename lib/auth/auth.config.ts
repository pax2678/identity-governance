import type { NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { z } from 'zod'

// T029: NextAuth.js v5 Configuration
// Per research.md Decision #5: NextAuth.js for authentication

// Login schema validation
const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // Validate input
        const validatedFields = LoginSchema.safeParse(credentials)

        if (!validatedFields.success) {
          return null
        }

        const { email, password } = validatedFields.data

        // TODO: Implement actual user authentication
        // This will be implemented in Phase 3 with authentication service
        // For now, this is a placeholder that rejects all logins

        // Example implementation (to be replaced):
        // const user = await getUserByEmail(email)
        // if (!user || !user.passwordHash) return null
        // const passwordMatch = await bcrypt.compare(password, user.passwordHash)
        // if (!passwordMatch) return null
        // return { id: user.id, email: user.email, name: user.displayName }

        return null
      },
    }),
  ],
  pages: {
    signIn: '/auth/login',
    signOut: '/auth/logout',
    error: '/auth/error',
  },
  callbacks: {
    async jwt({ token, user }) {
      // Add user ID to token on sign in
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      // Add user ID to session
      if (token.id && session.user) {
        session.user.id = token.id as string
      }
      return session
    },
    async authorized({ auth, request }) {
      // Middleware authorization logic
      const { pathname } = request.nextUrl
      const isLoggedIn = !!auth?.user

      // Public routes that don't require authentication
      const publicRoutes = ['/auth/login', '/auth/register', '/auth/error']
      const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route))

      if (isPublicRoute) {
        return true
      }

      // API routes authentication
      if (pathname.startsWith('/api')) {
        return isLoggedIn
      }

      // Protected routes require authentication
      return isLoggedIn
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  trustHost: true,
}
