import Link from 'next/link';
import { Home, Mail, Users, Brain, Target, Shield } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      {/* Error Section */}
      <div className="container mx-auto px-4 pt-20 pb-12">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-8xl font-bold text-purple-600 mb-4">404</h1>
          <h2 className="text-3xl font-semibold text-gray-800 mb-4">
            Page Not Found
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            We apologize, but we couldn't find the page you were looking for.
            Let us help you discover what our app can do for you instead.
          </p>

          <div className="flex gap-4 justify-center mb-12">
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Home className="w-5 h-5" />
              Go to Homepage
            </Link>
            <Link
              href="/auth/signin"
              className="inline-flex items-center gap-2 bg-white text-purple-600 border-2 border-purple-600 px-6 py-3 rounded-lg hover:bg-purple-50 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>

      {/* App Capabilities Section */}
      <div className="container mx-auto px-4 py-12 border-t border-gray-200">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-2xl font-semibold text-gray-800 mb-8 text-center">
            Discover the Power of AI-Driven Conference Management
          </h3>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <Brain className="w-10 h-10 text-purple-600 mb-4" />
              <h4 className="font-semibold text-gray-800 mb-2">
                AI-Powered Agenda Builder
              </h4>
              <p className="text-gray-600 text-sm">
                Create your perfect conference schedule with our intelligent recommendation engine that learns from your interests and goals.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <Target className="w-10 h-10 text-purple-600 mb-4" />
              <h4 className="font-semibold text-gray-800 mb-2">
                Smart Session Discovery
              </h4>
              <p className="text-gray-600 text-sm">
                Find exactly what you're looking for with semantic search that understands context and delivers relevant results.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <Users className="w-10 h-10 text-purple-600 mb-4" />
              <h4 className="font-semibold text-gray-800 mb-2">
                Networking Intelligence
              </h4>
              <p className="text-gray-600 text-sm">
                Connect with the right people based on shared interests, goals, and industry focus areas.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* PS Advisory Section */}
      <div className="bg-purple-600 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Shield className="w-16 h-16 mx-auto mb-6 opacity-90" />
            <h3 className="text-3xl font-bold mb-4">
              About PS Advisory LLC
            </h3>
            <p className="text-lg mb-6 opacity-95">
              We're technology consultants specializing in AI-driven solutions for the insurance industry.
              This demo app showcases how intelligent automation can transform your conference experience
              and, more broadly, your business operations.
            </p>

            <div className="bg-white/10 backdrop-blur rounded-lg p-8 mb-8">
              <h4 className="text-xl font-semibold mb-4">Our Services</h4>
              <ul className="text-left max-w-2xl mx-auto space-y-3">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Custom AI Solutions & Integration</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Salesforce Implementation & Optimization</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Digital Transformation Strategy</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Process Automation & Workflow Design</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Data Analytics & Business Intelligence</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col items-center">
              <p className="text-xl mb-4">
                Ready to transform your business with AI?
              </p>
              <a
                href="mailto:contactus@psadvisory.com"
                className="inline-flex items-center gap-2 bg-white text-purple-600 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                <Mail className="w-5 h-5" />
                contactus@psadvisory.com
              </a>
              <p className="mt-4 text-sm opacity-90">
                Schedule your free consultation today
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Disclaimer */}
      <div className="bg-gray-50 py-6 text-center">
        <p className="text-sm text-gray-600 max-w-4xl mx-auto px-4">
          This is a demonstration app created by PS Advisory LLC.
          It is not affiliated with or endorsed by InsureTech Connect or ITC Vegas 2025.
        </p>
      </div>
    </div>
  );
}