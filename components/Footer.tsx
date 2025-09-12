import Link from 'next/link';
import { 
  Calendar, MapPin, Mail, Phone, 
  Twitter, Linkedin, Youtube,
  ExternalLink, AlertTriangle, Briefcase,
  Building2, Shield, ChevronRight
} from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Main footer content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          
          {/* Column 1: Disclaimer */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <h3 className="text-white font-semibold text-lg">Important Notice</h3>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-gray-400">
                This is an <span className="text-orange-400 font-medium">unofficial demonstration</span> of 
                AI-enhanced conference capabilities. We are not affiliated with or endorsed by InsureTech Connect.
              </p>
              <a 
                href="https://vegas.insuretechconnect.com" 
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 px-4 py-2 bg-orange-900/50 hover:bg-orange-900/70 text-orange-300 rounded-lg transition-colors"
              >
                <span className="text-sm font-medium">Visit Official ITC Vegas Site</span>
                <ExternalLink className="w-4 h-4" />
              </a>
              <div className="pt-2">
                <p className="text-xs text-gray-500">
                  ITC Vegas 2025 • Oct 15-17 • Mandalay Bay, Las Vegas
                </p>
              </div>
            </div>
          </div>

          {/* Column 2: PS Advisory */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Building2 className="w-5 h-5 text-blue-500" />
              <h3 className="text-white font-semibold text-lg">Powered by PS Advisory</h3>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-gray-400">
                Your trusted <span className="text-blue-400 font-medium">Salesforce Partner</span> helping 
                insurance organizations leverage technology to improve profitability and reduce friction.
              </p>
              <div className="space-y-2">
                <div className="flex items-start space-x-2">
                  <Shield className="w-4 h-4 text-blue-500 mt-0.5" />
                  <p className="text-sm text-gray-300">Brokers & Carriers</p>
                </div>
                <div className="flex items-start space-x-2">
                  <Briefcase className="w-4 h-4 text-blue-500 mt-0.5" />
                  <p className="text-sm text-gray-300">MGUs & Reinsurers</p>
                </div>
              </div>
              <a 
                href="https://www.psadvisory.com" 
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-900/50 hover:bg-blue-900/70 text-blue-300 rounded-lg transition-colors"
              >
                <span className="text-sm font-medium">Learn About PS Advisory</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Column 3: Explore Demo */}
          <div>
            <h3 className="text-white font-semibold text-lg mb-4">Explore AI Features</h3>
            <div className="space-y-3">
              <p className="text-sm text-gray-400">
                Experience how AI can transform your conference experience with personalized recommendations 
                and intelligent scheduling.
              </p>
              <ul className="space-y-2">
                <li>
                  <Link href="/chat/intelligent" className="flex items-center space-x-2 text-sm text-gray-300 hover:text-white transition-colors">
                    <ChevronRight className="w-4 h-4" />
                    <span>AI Concierge Chat</span>
                  </Link>
                </li>
                <li>
                  <Link href="/agenda/intelligent" className="flex items-center space-x-2 text-sm text-gray-300 hover:text-white transition-colors">
                    <ChevronRight className="w-4 h-4" />
                    <span>Smart Agenda Builder</span>
                  </Link>
                </li>
                <li>
                  <Link href="/speakers" className="flex items-center space-x-2 text-sm text-gray-300 hover:text-white transition-colors">
                    <ChevronRight className="w-4 h-4" />
                    <span>Speaker Insights</span>
                  </Link>
                </li>
                <li>
                  <Link href="/schedule" className="flex items-center space-x-2 text-sm text-gray-300 hover:text-white transition-colors">
                    <ChevronRight className="w-4 h-4" />
                    <span>Personal Schedule</span>
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Copyright section */}
        <div className="border-t border-gray-800 mt-8 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-center md:text-left">
              <p className="text-xs text-gray-500">
                © 2025 PS Advisory LLC • AI-Powered Conference Demo
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Built with Claude 3.5 & Salesforce Integration
              </p>
            </div>
            <div className="flex items-center space-x-6">
              <Link href="/privacy" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
                Terms of Use
              </Link>
              <a 
                href="mailto:info@psadvisory.com" 
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                Contact PS Advisory
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}