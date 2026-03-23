const cron   = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Runs every Sunday at 11 PM
cron.schedule('0 23 * * 0', async () => {
  try {
    console.log('Running demand stats aggregation...');

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const requestStats = await prisma.$queryRaw`
      SELECT
        COALESCE(u.area, 'Unknown') AS area,
        LOWER(br."cropName")        AS crop_name,
        COUNT(*)::int               AS request_count
      FROM "BuyerRequest" br
      JOIN "User" u ON br."buyerId" = u.id
      WHERE br."createdAt" >= ${weekStart}
      GROUP BY COALESCE(u.area, 'Unknown'), LOWER(br."cropName")
    `;

    for (const stat of requestStats) {
      await prisma.demandStat.create({
        data: {
          area:         stat.area,
          cropName:     stat.crop_name,
          searchCount:  0,
          requestCount: stat.request_count,
          weekStart
        }
      }).catch(() => {}); // ignore duplicates
    }

    console.log(`✅ Demand stats aggregated: ${requestStats.length} entries`);
  } catch (err) {
    console.error('Demand stats error:', err);
  }
});

console.log('✅ Demand stats cron started');
