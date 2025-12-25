import NextAuth from 'next-auth'
import { authConfig } from './auth.config'

// T029: NextAuth.js v5 setup with handlers
// Export auth, signIn, signOut handlers and config

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth(authConfig)
