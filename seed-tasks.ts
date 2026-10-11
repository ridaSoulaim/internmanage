import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding sample intern Kanban tasks...");

  const employees = await prisma.employee.findMany();
  if (employees.length === 0) {
    console.log("No employees found to assign tasks to.");
    return;
  }

  const emp1 = employees[0];
  const emp2 = employees.length > 1 ? employees[1] : emp1;

  const sampleTasks = [
    {
      title: "Setup local Docker environment & database migrations",
      description: "Configure docker-compose.yml for local PostgreSQL instances and verify Prisma seed scripts.",
      priority: "HIGH" as const,
      status: "TODO" as const,
      tags: "DevOps, Infrastructure",
      assigneeId: emp1.id,
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    },
    {
      title: "Write unit tests for Authentication & RBAC roles",
      description: "Ensure role protection works as expected for Admin, HR, and Employee routes.",
      priority: "MEDIUM" as const,
      status: "TODO" as const,
      tags: "Testing, Security",
      assigneeId: emp2.id,
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    },
    {
      title: "Build REST API endpoint for timesheet data export",
      description: "Create an endpoint returning attendance logs in CSV/JSON format for monthly payroll audit.",
      priority: "HIGH" as const,
      status: "IN_PROGRESS" as const,
      tags: "Backend, API",
      assigneeId: emp1.id,
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    },
    {
      title: "Design Internship Performance Review form in Figma",
      description: "Draft 5-star rubric evaluation interface for mentors to rate intern deliverables.",
      priority: "MEDIUM" as const,
      status: "IN_PROGRESS" as const,
      tags: "Design, UI/UX",
      assigneeId: emp2.id,
      dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
    },
    {
      title: "Refactor Employee Profile Page with Tailwind v4",
      description: "Migrated legacy inline CSS to modern Tailwind utility classes and added responsive mobile drawer.",
      priority: "URGENT" as const,
      status: "IN_REVIEW" as const,
      tags: "Frontend, UI",
      assigneeId: emp1.id,
      dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      deliverableUrl: "https://github.com/organization/internmanage/pull/24",
      reviewFeedback: "Intern note: Tested on Chrome, Safari and mobile viewpoints. Ready for mentor sign-off.",
    },
    {
      title: "Integrate NextAuth v5 session cookies & middleware",
      description: "Secured all /dashboard routes with server-side session checks and automatic login redirection.",
      priority: "HIGH" as const,
      status: "DONE" as const,
      tags: "Auth, Core",
      assigneeId: emp2.id,
      dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      deliverableUrl: "https://github.com/organization/internmanage/pull/12",
      reviewFeedback: "Approved by Administrator: Great work on session validation and type casting!",
    },
  ];

  for (const t of sampleTasks) {
    await prisma.task.create({
      data: t,
    });
  }

  console.log("Successfully seeded 6 sample Kanban tasks!");
}

main()
  .catch((e) => {
    console.error("Task seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
