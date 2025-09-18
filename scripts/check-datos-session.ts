import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatosSession() {
  try {
    // Search for the Datos session
    const session = await prisma.session.findFirst({
      where: {
        OR: [
          { title: { contains: 'Datos Insights' } },
          { title: { contains: 'Insurance AI Reality' } },
          { id: { contains: 'datos' } }
        ]
      },
      include: {
        speakers: {
          include: {
            speaker: true
          }
        }
      }
    });

    if (session) {
      console.log('✅ Found session:', session.title);
      console.log('ID:', session.id);
      console.log('Slug:', session.slug);
      console.log('Time:', session.time);
      console.log('Location:', session.location);
      console.log('Description:', session.description?.substring(0, 200));
      console.log('Speakers:', session.speakers.map(s => s.speaker.name).join(', '));
    } else {
      console.log('❌ Session not found in database');

      // Let's check all sessions with "AI" in the title
      const aiSessions = await prisma.session.findMany({
        where: {
          title: { contains: 'AI' }
        },
        select: {
          title: true,
          slug: true
        }
      });

      console.log('\nAI-related sessions found:');
      aiSessions.forEach(s => console.log(`- ${s.title}`));
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatosSession();