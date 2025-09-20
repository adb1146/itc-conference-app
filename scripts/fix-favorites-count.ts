#!/usr/bin/env npx tsx
/**
 * Script to fix the favorites count in existing agendas
 * This corrects the metrics.favoritesIncluded and day.stats.favoritesCovered values
 */

import prisma from '../lib/db';

async function fixFavoritesCount() {
  console.log('🔧 Fixing favorites count in existing agendas...\n');

  try {
    // Get all active agendas with user data
    const agendas = await prisma.personalizedAgenda.findMany({
      where: {
        isActive: true,
        generatedBy: 'ai_agent'
      },
      include: {
        user: {
          include: {
            favorites: {
              where: {
                type: 'session'
              }
            }
          }
        }
      }
    });

    console.log(`Found ${agendas.length} active agenda(s) to fix\n`);

    for (const agenda of agendas) {
      console.log(`Processing agenda ${agenda.id} for user ${agenda.userId}`);

      const agendaData = agenda.agendaData as any;

      if (!agendaData || !agendaData.days) {
        console.log('  ❌ No agenda data or days found, skipping');
        continue;
      }

      // Calculate correct metrics
      let totalFavoritesIncluded = 0;
      let fixedDays = false;

      agendaData.days.forEach((day: any) => {
        if (!day.schedule) return;

        // Count favorites in this day
        const dayFavorites = day.schedule.filter((item: any) =>
          item.source === 'user-favorite'
        ).length;

        // Update day stats if different
        if (day.stats && day.stats.favoritesCovered !== dayFavorites) {
          console.log(`  📅 Day ${day.dayNumber}: Updating favoritesCovered from ${day.stats.favoritesCovered} to ${dayFavorites}`);
          day.stats.favoritesCovered = dayFavorites;
          fixedDays = true;
        }

        totalFavoritesIncluded += dayFavorites;
      });

      // Update overall metrics if different
      if (agendaData.metrics) {
        const oldFavoritesIncluded = agendaData.metrics.favoritesIncluded || 0;
        const oldTotalFavorites = agendaData.metrics.totalFavorites || 0;
        const actualTotalFavorites = agenda.user.favorites.length;
        let needsUpdate = false;

        if (oldFavoritesIncluded !== totalFavoritesIncluded) {
          console.log(`  📊 Updating metrics.favoritesIncluded from ${oldFavoritesIncluded} to ${totalFavoritesIncluded}`);
          agendaData.metrics.favoritesIncluded = totalFavoritesIncluded;
          needsUpdate = true;
        }

        if (oldTotalFavorites !== actualTotalFavorites) {
          console.log(`  ⭐ Updating metrics.totalFavorites from ${oldTotalFavorites} to ${actualTotalFavorites}`);
          agendaData.metrics.totalFavorites = actualTotalFavorites;
          needsUpdate = true;
        }

        if (needsUpdate) {

          // Update the agenda in database
          await prisma.personalizedAgenda.update({
            where: { id: agenda.id },
            data: { agendaData }
          });

          console.log('  ✅ Agenda updated successfully\n');
        } else if (fixedDays) {
          // Update if only day stats were fixed
          await prisma.personalizedAgenda.update({
            where: { id: agenda.id },
            data: { agendaData }
          });

          console.log('  ✅ Day stats updated successfully\n');
        } else {
          console.log('  ✓ Agenda metrics already correct\n');
        }
      } else {
        console.log('  ❌ No metrics found in agenda\n');
      }
    }

    console.log('🎉 Favorites count fix complete!');

  } catch (error) {
    console.error('❌ Error fixing favorites count:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixFavoritesCount();