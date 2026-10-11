import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding attendance and leave records...");

  const employees = await prisma.employee.findMany();
  if (employees.length === 0) {
    console.log("No employees found to attach attendance and leaves to.");
    return;
  }

  const today = new Date();
  
  for (let i = 0; i < employees.length; i++) {
    const emp = employees[i];

    // Seed past 5 days of attendance
    for (let dayOffset = 0; dayOffset <= 4; dayOffset++) {
      const d = new Date();
      d.setDate(today.getDate() - dayOffset);
      const dateOnly = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));

      // Check-in times
      const checkIn = new Date(d);
      // stagger checkIn between 8:50 and 9:45
      const minute = 45 + (i * 12 + dayOffset * 7) % 30;
      const hour = minute > 59 ? 9 : 8;
      checkIn.setHours(hour, minute % 60, 0, 0);

      const checkOut = new Date(d);
      checkOut.setHours(17, 30 + ((i + dayOffset) * 5) % 25, 0, 0);

      const isLate = checkIn.getHours() > 9 || (checkIn.getHours() === 9 && checkIn.getMinutes() > 30);
      const status = dayOffset === 0 && i === 1 ? "REMOTE" : isLate ? "LATE" : "PRESENT";

      await prisma.attendance.upsert({
        where: {
          employeeId_date: {
            employeeId: emp.id,
            date: dateOnly,
          },
        },
        update: {},
        create: {
          employeeId: emp.id,
          date: dateOnly,
          checkIn,
          checkOut: dayOffset === 0 ? null : checkOut, // today is in progress for some!
          status: status as any,
          workNotes:
            dayOffset === 0
              ? "Working on frontend component styling & API integration"
              : "Completed code reviews, sprint task #104, team standup",
        },
      });
    }

    // Seed some leave requests
    if (i === 0) {
      // 1 Pending leave request
      const start = new Date(today);
      start.setDate(today.getDate() + 3);
      const end = new Date(today);
      end.setDate(today.getDate() + 4);

      await prisma.leaveRequest.create({
        data: {
          employeeId: emp.id,
          leaveType: "EXAM_STUDY",
          startDate: new Date(Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())),
          endDate: new Date(Date.UTC(end.getFullYear(), end.getMonth(), end.getDate())),
          days: 2,
          reason: "Final semester university examination for Software Engineering degree.",
          status: "PENDING",
        },
      });
    } else {
      // 1 Approved leave request in the past
      const pastStart = new Date(today);
      pastStart.setDate(today.getDate() - 10);
      const pastEnd = new Date(today);
      pastEnd.setDate(today.getDate() - 9);

      await prisma.leaveRequest.create({
        data: {
          employeeId: emp.id,
          leaveType: "SICK",
          startDate: new Date(Date.UTC(pastStart.getFullYear(), pastStart.getMonth(), pastStart.getDate())),
          endDate: new Date(Date.UTC(pastEnd.getFullYear(), pastEnd.getMonth(), pastEnd.getDate())),
          days: 2,
          reason: "High fever and medical rest advised by doctor.",
          status: "APPROVED",
          reviewedBy: "Sarah Connor (HR)",
          reviewNote: "Approved. Take care and get well soon!",
          reviewedAt: new Date(),
        },
      });
    }
  }

  console.log("Successfully seeded attendance and leave data!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
