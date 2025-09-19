'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { Mail, Lock, User, Building, UserPlus, AlertCircle, Loader2, CheckCircle, ExternalLink, Info, Sparkles } from 'lucide-react';

const INTERESTS = [
  'AI & Automation',
  'Claims Technology',
  'Cybersecurity',
  'Embedded Insurance',
  'Digital Distribution',
  'Customer Experience',
  'Underwriting',
  'Data Analytics'
];

const ROLES = [
  'Executive',
  'Product Manager',
  'Developer',
  'Data Scientist',
  'Underwriter',
  'Claims Manager',
  'Sales/BD',
  'Startup Founder',
  'Investor',
  'Consultant'
];

const ORG_TYPES = [
  'Carrier',
  'Broker',
  'MGA/MGU',
  'Reinsurer',
  'Technology Vendor',
  'Consulting Firm',
  'Startup',
  'Investor/VC',
  'Other'
];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form data
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    company: '',
    organizationType: '',
    role: '',
    interests: [] as string[],
    goals: [] as string[],
    usingSalesforce: false,
    interestedInSalesforce: false
  });

  const handleNext = () => {
    if (step === 1) {
      // Validate step 1
      if (!formData.email || !formData.password || !formData.confirmPassword) {
        setError('Please fill in all required fields');
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setError('Please enter a valid email address');
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      if (formData.password.length < 8) {
        setError('Password must be at least 8 characters');
        return;
      }
      setError('');
      setStep(2);
    } else if (step === 2) {
      // Move from step 2 to step 3
      setError('');
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step === 3) {
      setStep(2);
    } else if (step === 2) {
      setStep(1);
    }
    setError('');
  };

  const toggleInterest = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Register user
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      // Auto sign in after registration
      const signInResult = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false
      });

      if (signInResult?.ok) {
        // Redirect directly to Smart Agenda page after registration
        router.push('/smart-agenda');
        router.refresh();
      } else {
        router.push('/auth/signin');
      }
    } catch (error: any) {
      setError(error.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4">
              <UserPlus className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Create Your Account</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-2">
              {step === 1 ? 'Register to explore AI-powered conference features' :
               step === 2 ? 'Help us personalize your experience' :
               'Your Smart Agenda is ready to be created!'}
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center justify-center gap-2 mb-6 sm:mb-8">
            <div className={`w-20 h-1 rounded-full ${step >= 1 ? 'bg-blue-600' : 'bg-gray-200'}`} />
            <div className={`w-20 h-1 rounded-full ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />
            <div className={`w-20 h-1 rounded-full ${step >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`} />
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {step === 1 ? (
              /* Step 1: Account Details */
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none min-h-[44px]"
                      placeholder="you@company.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none min-h-[44px]"
                      placeholder="Minimum 8 characters"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      required
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none min-h-[44px]"
                      placeholder="Re-enter password"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleNext}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-medium hover:shadow-lg transform hover:-translate-y-0.5 transition-all"
                >
                  Next Step
                </button>
              </div>
            ) : step === 2 ? (
              /* Step 2: Profile Information */
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none min-h-[44px]"
                      placeholder="John Doe"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none min-h-[44px]"
                      placeholder="Acme Insurance"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Organization Type
                  </label>
                  <select
                    value={formData.organizationType}
                    onChange={(e) => setFormData({ ...formData, organizationType: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none min-h-[44px]"
                  >
                    <option value="">Select organization type...</option>
                    {ORG_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none min-h-[44px]"
                  >
                    <option value="">Select your role...</option>
                    {ROLES.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>

                {/* Salesforce Questions */}
                <div className="bg-blue-50 rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-3">
                  <div className="flex items-start space-x-2">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                    <p className="text-sm text-blue-900 font-medium">PS Advisory specializes in Salesforce for Insurance</p>
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={formData.usingSalesforce}
                        onChange={(e) => setFormData({ ...formData, usingSalesforce: e.target.checked })}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-sm text-gray-700">We currently use Salesforce</span>
                    </label>
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={formData.interestedInSalesforce}
                        onChange={(e) => setFormData({ ...formData, interestedInSalesforce: e.target.checked })}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-sm text-gray-700">We're interested in Salesforce solutions</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Interests (select all that apply)
                  </label>
                  <div className="flex flex-wrap gap-1 sm:gap-2">
                    {INTERESTS.map(interest => (
                      <button
                        key={interest}
                        type="button"
                        onClick={() => toggleInterest(interest)}
                        className={`px-3 py-1 rounded-full text-sm transition-colors ${
                          formData.interests.includes(interest)
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {interest}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-medium hover:shadow-lg transform hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Continue to Final Step
                  </button>
                </div>
              </div>
            ) : (
              /* Step 3: Smart Agenda Preview */
              <div className="space-y-4 sm:space-y-6">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl mb-4">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
                    Almost There! 🎉
                  </h2>
                  <p className="text-sm text-gray-600 mb-6">
                    We're ready to build your personalized conference schedule
                  </p>
                </div>

                {/* What You'll Get */}
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4 sm:p-5 space-y-3">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    Your Smart Agenda will include:
                  </h3>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Personalized session recommendations based on your interests</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Conflict-free scheduling with break times</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>AI-powered insights matching your role and goals</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Export to calendar and share with colleagues</span>
                    </li>
                  </ul>
                </div>

                {/* Your Interests Summary */}
                {formData.interests.length > 0 && (
                  <div className="bg-white border border-purple-200 rounded-lg p-3 sm:p-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Based on your interests in:</p>
                    <div className="flex flex-wrap gap-1">
                      {formData.interests.slice(0, 5).map(interest => (
                        <span key={interest} className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                          {interest}
                        </span>
                      ))}
                      {formData.interests.length > 5 && (
                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                          +{formData.interests.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-medium hover:shadow-lg transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        Create Account & Build My Agenda
                      </>
                    )}
                  </button>
                </div>

                {/* Trust Badge */}
                <div className="text-center">
                  <p className="text-xs text-gray-500">
                    Join 500+ conference attendees who've built their perfect schedule
                  </p>
                </div>
              </div>
            )}
          </form>

          {/* Sign In Link */}
          <div className="mt-4 sm:mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/auth/signin" className="text-blue-600 hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </div>
          
          {/* Disclaimer */}
          <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-orange-50 rounded-lg border border-orange-200">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs sm:text-sm text-orange-800">
                <p className="font-medium mb-1">Registration Information</p>
                <p>
                  This is a demonstration site by PS Advisory. We are not affiliated with InsureTech Connect. 
                  Your registration data will be used to personalize your conference experience.
                </p>
                <a 
                  href="https://vegas.insuretechconnect.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center mt-2 text-orange-700 hover:text-orange-800 font-medium underline"
                >
                  Visit Official ITC Vegas Site
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}