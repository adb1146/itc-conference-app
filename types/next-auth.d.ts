import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      role?: string
      company?: string
      isAdmin?: boolean
    }
  }

  interface User {
    id: string
    email: string
    name?: string | null
    role?: string | null
    company?: string | null
    isAdmin?: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    email?: string
    name?: string
    role?: string
    company?: string
    isAdmin?: boolean
  }
}