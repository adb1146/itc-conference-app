import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';

export async function POST(request: NextRequest) {
  
  try {
    console.log('Registration attempt started');
    console.log('Prisma client:', !!prisma);
    
    const body = await request.json();
    const { 
      email, 
      password,
      confirmPassword, 
      name, 
      role, 
      company, 
      organizationType,
      interests, 
      goals,
      usingSalesforce,
      interestedInSalesforce 
    } = body;
    
    console.log('Registration for email:', email);
    console.log('Organization type:', organizationType);
    console.log('Salesforce interest:', { usingSalesforce, interestedInSalesforce });

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Check if passwords match (if confirmPassword is provided)
    if (confirmPassword && password !== confirmPassword) {
      return NextResponse.json(
        { error: 'Passwords do not match' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists with this email' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || null,
        role: role || null,
        company: company || null,
        organizationType: organizationType || null,
        interests: interests || [],
        goals: goals || [],
        usingSalesforce: usingSalesforce || false,
        interestedInSalesforce: interestedInSalesforce || false
      }
    });

    // Return success (without password)
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        company: user.company
      }
    });

  } catch (error: any) {
    console.error('Registration error:', error);
    
    // Check for specific Prisma errors
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 409 }
      );
    }
    
    // Log more detailed error information
    if (error?.message) {
      console.error('Error message:', error.message);
    }
    
    // Return a more helpful error message
    return NextResponse.json(
      { error: error?.message || 'Failed to create user. Please check all fields and try again.' },
      { status: 500 }
    );
  }
}