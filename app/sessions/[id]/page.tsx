import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock, MapPin, Users, Tag, Calendar, Heart, Share2, BookOpen } from 'lucide-react';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const session = await prisma.session.findUnique({
    where: { id },
  });

  if (!session) {
    return {
      title: 'Session Not Found',
    };
  }

  return {
    title: `${session.title} | ITC Conference`,
    description: session.abstract || session.description,
  };
}

async function getSession(id: string) {
  const session = await prisma.session.findUnique({
    where: { id },
    include: {
      speakers: {
        include: {
          speaker: true,
        },
      },
    },
  });

  if (!session) {
    notFound();
  }

  return session;
}

async function getUserFavorite(sessionId: string) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return false;
    }

    // Skip for test/mock emails
    if (session.user.email === 'test@example.com' || session.user.email.includes('@example.')) {
      return false;
    }

    const user = await prisma.user.findFirst({
      where: { email: session.user.email },
      include: {
        favoriteSessions: {
          where: { sessionId },
        },
      },
    });

    return user?.favoriteSessions?.length > 0;
  } catch (error) {
    console.error('Error checking favorite status:', error);
    return false;
  }
}

function formatTime(date: Date | string | null): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

function formatDate(date: Date | string | null): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession(id);
  const isFavorite = await getUserFavorite(id);
  const userSession = await getServerSession(authOptions);

  const sessionDate = session.startTime ? formatDate(session.startTime) : '';
  const startTime = session.startTime ? formatTime(session.startTime) : '';
  const endTime = session.endTime ? formatTime(session.endTime) : '';

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Navigation */}
        <div className="mb-6">
          <Link
            href="/agenda/intelligent"
            className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Smart Agenda
          </Link>
        </div>

        {/* Session Header */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">{session.title}</h1>

              {/* Session Meta */}
              <div className="flex flex-wrap gap-4 text-gray-600 mb-6">
                {sessionDate && (
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                    <span>{sessionDate}</span>
                  </div>
                )}
                {startTime && endTime && (
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-2 text-gray-400" />
                    <span>{startTime} - {endTime}</span>
                  </div>
                )}
                {session.location && (
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                    <span>{session.location}</span>
                  </div>
                )}
                {(session.format || session.sessionType) && (
                  <div className="flex items-center">
                    <BookOpen className="w-4 h-4 mr-2 text-gray-400" />
                    <span>{session.format || session.sessionType}</span>
                  </div>
                )}
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-6">
                {session.track && (
                  <span className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-700 text-sm rounded-full">
                    <Tag className="w-3 h-3 mr-1" />
                    {session.track}
                  </span>
                )}
                {session.level && (
                  <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                    Level: {session.level}
                  </span>
                )}
                {session.sessionType && (
                  <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">
                    {session.sessionType}
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            {userSession && (
              <div className="flex gap-2">
                <button
                  className={`p-3 rounded-lg transition-colors ${
                    isFavorite
                      ? 'bg-red-100 text-red-600 hover:bg-red-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
                </button>
                <button
                  className="p-3 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                  title="Share session"
                >
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          {/* About This Session */}
          {session.description && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-3">About This Session</h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {session.description}
              </p>
            </div>
          )}

          {/* Track Focus */}
          {session.track && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-3">Track Focus</h2>
              <p className="text-gray-700 leading-relaxed">
                This session is part of the <strong>{session.track}</strong> track, bringing together industry leaders to explore cutting-edge solutions and best practices.
              </p>
            </div>
          )}

          {/* What to Expect */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-3">What to Expect</h2>
            <p className="text-gray-700 leading-relaxed">
              Interactive discussion, actionable insights, and networking opportunities with peers facing similar challenges in the insurance and technology landscape.
            </p>
          </div>

          {/* Enriched Summary */}
          {session.enrichedSummary && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-3">Session Overview</h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {session.enrichedSummary}
              </p>
            </div>
          )}

          {/* Key Takeaways */}
          {session.keyTakeaways && session.keyTakeaways.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-3 flex items-center">
                <Tag className="w-5 h-5 mr-2" />
                Key Takeaways
              </h2>
              <ul className="list-disc list-inside space-y-2">
                {session.keyTakeaways.map((takeaway, index) => (
                  <li key={index} className="text-gray-700">
                    {takeaway}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Industry Context */}
          {session.industryContext && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-3">Industry Context</h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {session.industryContext}
              </p>
            </div>
          )}

          {/* Related Topics */}
          {session.relatedTopics && session.relatedTopics.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-3">Related Topics</h2>
              <div className="flex flex-wrap gap-2">
                {session.relatedTopics.map((topic, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {session.tags && session.tags.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-3">Topics</h2>
              <div className="flex flex-wrap gap-2">
                {session.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Why You Should Attend */}
        {(session.enrichedSummary || session.keyTakeaways?.length > 0) && (
          <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
            <h2 className="text-2xl font-bold mb-4 flex items-center text-purple-600">
              💡 Why You Should Attend
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {session.enrichedSummary
                ? `This session offers valuable insights into ${session.track || 'industry trends'}. ${session.enrichedSummary.slice(0, 200)}...`
                : `Join this session to gain practical insights and actionable strategies for ${session.track || 'your business'}. Connect with industry leaders and peers facing similar challenges.`
              }
            </p>
          </div>
        )}

        {/* Speakers */}
        {session.speakers && session.speakers.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-6 flex items-center">
              <Users className="w-6 h-6 mr-2 text-gray-600" />
              Expert Panel
            </h2>
            <div className="space-y-6">
              {session.speakers.map(({ speaker }) => (
                <Link
                  key={speaker.id}
                  href={`/speakers/${speaker.id}`}
                  className="block group"
                >
                  <div className="flex items-start space-x-4 p-4 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-xl">
                      {speaker.firstName?.[0]}{speaker.lastName?.[0]}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {speaker.firstName} {speaker.lastName}
                      </h3>
                      {speaker.title && (
                        <p className="text-gray-600">{speaker.title}</p>
                      )}
                      {speaker.company && (
                        <p className="text-gray-500">{speaker.company}</p>
                      )}
                      {speaker.bio && (
                        <p className="text-gray-700 mt-2 line-clamp-3">
                          {speaker.bio}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Related Sessions */}
        <div className="mt-6 bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/agenda"
              className="flex items-center justify-center p-4 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Calendar className="w-5 h-5 mr-2" />
              View Full Agenda
            </Link>
            <Link
              href="/search"
              className="flex items-center justify-center p-4 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <BookOpen className="w-5 h-5 mr-2" />
              Find Similar Sessions
            </Link>
            <Link
              href="/favorites"
              className="flex items-center justify-center p-4 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
            >
              <Heart className="w-5 h-5 mr-2" />
              My Favorites
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}