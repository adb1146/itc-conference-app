import Link from 'next/link';
import { 
  Calendar, MapPin, Mail, Phone, 
  Twitter, Linkedin, Youtube,
  ExternalLink
} from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
          {/* About - Simplified for mobile */}
          <div className="col-span-2 md:col-span-1">
            <h3 className="text-white font-semibold text-base md:text-lg mb-2 md:mb-4">ITC Vegas 2025</h3>
            <p className="text-xs md:text-sm text-gray-400 mb-3 md:mb-4 hidden md:block">
              The world's largest insurtech conference bringing together 8,000+ industry leaders.
            </p>
            <div className="flex space-x-2 md:space-x-3">
              <a href="#" className="p-1.5 md:p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                <Twitter className="w-3 h-3 md:w-4 md:h-4" />
              </a>
              <a href="#" className="p-1.5 md:p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                <Linkedin className="w-3 h-3 md:w-4 md:h-4" />
              </a>
              <a href="#" className="p-1.5 md:p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                <Youtube className="w-3 h-3 md:w-4 md:h-4" />
              </a>
            </div>
          </div>

          {/* Quick Links - Hidden on mobile */}
          <div className="hidden md:block">
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/agenda" className="text-sm hover:text-white transition-colors">
                  Conference Agenda
                </Link>
              </li>
              <li>
                <Link href="/speakers" className="text-sm hover:text-white transition-colors">
                  Speakers Directory
                </Link>
              </li>
              <li>
                <Link href="/chat/intelligent" className="text-sm hover:text-white transition-colors">
                  AI Assistant
                </Link>
              </li>
              <li>
                <Link href="/schedule" className="text-sm hover:text-white transition-colors">
                  My Schedule
                </Link>
              </li>
            </ul>
          </div>

          {/* Event Info - Compact on mobile */}
          <div>
            <h4 className="text-white font-semibold text-sm md:text-base mb-2 md:mb-4">Event</h4>
            <ul className="space-y-2 md:space-y-3">
              <li className="flex items-start space-x-2">
                <Calendar className="w-3 h-3 md:w-4 md:h-4 mt-0.5 text-gray-500" />
                <div>
                  <p className="text-xs md:text-sm">Oct 15-17</p>
                  <p className="text-xs text-gray-500 hidden md:block">Wednesday - Friday</p>
                </div>
              </li>
              <li className="flex items-start space-x-2">
                <MapPin className="w-3 h-3 md:w-4 md:h-4 mt-0.5 text-gray-500" />
                <div>
                  <p className="text-xs md:text-sm">Las Vegas</p>
                  <p className="text-xs text-gray-500 hidden md:block">Mandalay Bay</p>
                </div>
              </li>
            </ul>
          </div>

          {/* Contact - Simplified on mobile */}
          <div className="hidden md:block">
            <h4 className="text-white font-semibold mb-4">Need Help?</h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="flex items-center space-x-2 text-sm hover:text-white transition-colors">
                  <Mail className="w-4 h-4" />
                  <span>support@itcvegas.com</span>
                </a>
              </li>
              <li>
                <a href="#" className="flex items-center space-x-2 text-sm hover:text-white transition-colors">
                  <Phone className="w-4 h-4" />
                  <span>1-800-ITC-2025</span>
                </a>
              </li>
              <li className="pt-2">
                <a 
                  href="https://vegas.insuretechconnect.com" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <span>Official Website</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright section - Minimal on mobile */}
        <div className="border-t border-gray-800 mt-6 md:mt-8 pt-4 md:pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-xs text-gray-500">
              © 2025 ITC Vegas • AI-Powered
            </p>
            <div className="flex space-x-4 md:space-x-6 mt-2 md:mt-0">
              <Link href="/privacy" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
                Terms
              </Link>
              <Link href="/help" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
                Help
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}