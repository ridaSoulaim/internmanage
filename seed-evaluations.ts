import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding internship milestones and performance evaluations...");

  const employees = await prisma.employee.findMany();
  if (employees.length === 0) {
    console.log("No employees found.");
    return;
  }

  const emp1 = employees[0];
  const emp2 = employees.length > 1 ? employees[1] : emp1;

  // Seed Milestones for Employee 1
  const milestonesEmp1 = [
    {
      title: "Week 1: Tooling & Tech Stack Onboarding",
      description: "Clone codebase, configure environment variables, setup Git workflow and shadow senior engineer.",
      targetWeek: 1,
      status: "COMPLETED" as const,
      completedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      mentorFeedback: "Completed early. Strong setup initiative.",
      employeeId: emp1.id,
    },
    {
      title: "Week 4: First Production Pull Request",
      description: "Ship an end-to-end bug fix or feature module with passing unit tests and documentation.",
      targetWeek: 4,
      status: "COMPLETED" as const,
      completedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      mentorFeedback: "Delivered dark-mode polish and component styling. Code quality is high.",
      employeeId: emp1.id,
    },
    {
      title: "Week 8: Mid-term Project Architecture Review",
      description: "Present progress on the assigned quarterly project to technical leads and gather feedback.",
      targetWeek: 8,
      status: "IN_PROGRESS" as const,
      employeeId: emp1.id,
    },
    {
      title: "Week 12: Capstone Demo & Return Offer Evaluation",
      description: "Final capstone showcase to leadership and evaluation for full-time conversion (PPO).",
      targetWeek: 12,
      status: "PENDING" as const,
      employeeId: emp1.id,
    },
  ];

  for (const m of milestonesEmp1) {
    await prisma.milestone.create({ data: m });
  }

  // Seed Milestones for Employee 2 if exists
  if (emp2.id !== emp1.id) {
    const milestonesEmp2 = [
      {
        title: "Week 1: Engineering Onboarding & Codebase Orientation",
        description: "Run migrations, understand NextAuth session structure and review design standards.",
        targetWeek: 1,
        status: "COMPLETED" as const,
        completedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
        mentorFeedback: "Quick learner, well-organized notes.",
        employeeId: emp2.id,
      },
      {
        title: "Week 4: API Integration & Data Validation",
        description: "Build robust server action handlers with Zod schema validation and error handling.",
        targetWeek: 4,
        status: "IN_PROGRESS" as const,
        employeeId: emp2.id,
      },
      {
        title: "Week 8: Performance Profiling & Optimization",
        description: "Benchmark Core Web Vitals and optimize database query latency.",
        targetWeek: 8,
        status: "PENDING" as const,
        employeeId: emp2.id,
      },
    ];

    for (const m of milestonesEmp2) {
      await prisma.milestone.create({ data: m });
    }
  }

  // Seed Performance Reviews
  await prisma.performanceReview.create({
    data: {
      employeeId: emp1.id,
      reviewerName: "Sarah Connor (HR Manager)",
      reviewCycle: "MID_TERM",
      technicalScore: 5,
      communicationScore: 4,
      problemSolvingScore: 5,
      initiativeScore: 5,
      overallScore: 4.8,
      strengths: "Outstanding problem-solving skills and technical maturity. Delivered features ahead of sprint schedules with minimal guidance.",
      areasForGrowth: "Encourage actively documenting complex architecture patterns for incoming junior cohorts.",
      ppoDecision: "RECOMMENDED_FOR_PPO",
    },
  });

  if (emp2.id !== emp1.id) {
    await prisma.performanceReview.create({
      data: {
        employeeId: emp2.id,
        reviewerName: "Admin User (Lead Mentor)",
        reviewCycle: "MID_TERM",
        technicalScore: 4,
        communicationScore: 5,
        problemSolvingScore: 4,
        initiativeScore: 4,
        overallScore: 4.3,
        strengths: "Exceptional team player with strong communicative empathy. Great collaboration across design and backend teammates.",
        areasForGrowth: "Continue practicing deeper database index tuning and query plan reading.",
        ppoDecision: "UNDER_EVALUATION",
      },
    });
  }

  console.log("Successfully seeded milestones and performance evaluations!");
}

main()
  .catch((e) => {
    console.error("Evaluation seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
