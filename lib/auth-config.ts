import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';

export function getAuthOptions(): NextAuthOptions {
  return {
    providers: [
      CredentialsProvider({
        name: 'credentials',
        credentials: {
          email: { label: 'Email', type: 'email' },
          password: { label: 'Password', type: 'password' }
        },
        async authorize(credentials) {
          try {
            console.log('Starting auth for:', credentials?.email);
            
            if (!credentials?.email || !credentials?.password) {
              console.log('Missing credentials');
              return null;
            }

            const user = await prisma.user.findUnique({
              where: {
                email: credentials.email
              }
            });

              console.log('User lookup result:', !!user);

              if (!user || !user.password) {
                console.log('User not found or no password');
                return null;
              }

              const isPasswordValid = await bcrypt.compare(
                credentials.password,
                user.password
              );

              console.log('Password validation:', isPasswordValid);

              if (!isPasswordValid) {
                return null;
              }

              // Return user object for JWT
              return {
                id: user.id,
                email: user.email,
                name: user.name || undefined,
                role: user.role || undefined,
                company: user.company || undefined
              };
          } catch (error) {
            console.error('Auth error:', error);
            return null;
          }
        }
      })
    ],
    session: {
      strategy: 'jwt',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    pages: {
      signIn: '/auth/signin',
      error: '/auth/error',
    },
    callbacks: {
      async jwt({ token, user }) {
        if (user) {
          token.id = user.id;
          token.email = user.email;
          token.name = user.name || undefined;
          // Type guard to check if it's our custom User type with role and company
          if ('role' in user) {
            token.role = (user as any).role || undefined;
          }
          if ('company' in user) {
            token.company = (user as any).company || undefined;
          }
        }
        return token;
      },
      async session({ session, token }) {
        if (token && session.user) {
          session.user.id = token.id as string;
          session.user.email = token.email as string;
          session.user.name = token.name as string;
          session.user.role = token.role as string;
          session.user.company = token.company as string;
        }
        return session;
      }
    },
    secret: process.env.NEXTAUTH_SECRET || 'your-secret-key-here-change-in-production',
    debug: true,
  };
}