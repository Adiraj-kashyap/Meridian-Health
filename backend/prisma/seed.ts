import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("Password123!", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@clinic.local" },
    update: {},
    create: { email: "admin@clinic.local", name: "Clinic Admin", role: "ADMIN", passwordHash: password },
  });

  const doctorUser = await prisma.user.upsert({
    where: { email: "dr.rao@clinic.local" },
    update: {},
    create: {
      email: "dr.rao@clinic.local",
      name: "Anjali Rao",
      role: "DOCTOR",
      passwordHash: password,
      doctorProfile: {
        create: {
          specialization: "General Medicine",
          bio: "12 years of experience in family medicine and preventive care.",
          slotDurationMinutes: 30,
          workingHours: {
            create: [
              { dayOfWeek: 1, startTime: "09:00", endTime: "17:00" },
              { dayOfWeek: 2, startTime: "09:00", endTime: "17:00" },
              { dayOfWeek: 3, startTime: "09:00", endTime: "13:00" },
              { dayOfWeek: 4, startTime: "09:00", endTime: "17:00" },
              { dayOfWeek: 5, startTime: "09:00", endTime: "15:00" },
            ],
          },
        },
      },
    },
    include: { doctorProfile: true },
  });

  const doctor2 = await prisma.user.upsert({
    where: { email: "dr.iyer@clinic.local" },
    update: {},
    create: {
      email: "dr.iyer@clinic.local",
      name: "Karthik Iyer",
      role: "DOCTOR",
      passwordHash: password,
      doctorProfile: {
        create: {
          specialization: "Cardiology",
          bio: "Interventional cardiologist focused on preventive heart health.",
          slotDurationMinutes: 45,
          workingHours: {
            create: [
              { dayOfWeek: 1, startTime: "10:00", endTime: "16:00" },
              { dayOfWeek: 3, startTime: "10:00", endTime: "16:00" },
              { dayOfWeek: 5, startTime: "10:00", endTime: "16:00" },
            ],
          },
        },
      },
    },
  });

  const patient = await prisma.user.upsert({
    where: { email: "patient@example.com" },
    update: {},
    create: {
      email: "patient@example.com",
      name: "Asha Menon",
      role: "PATIENT",
      passwordHash: password,
      patientProfile: { create: { dateOfBirth: new Date("1994-03-12") } },
    },
  });

  console.log("Seeded:");
  console.log(` Admin:    admin@clinic.local / Password123!`);
  console.log(` Doctor 1: dr.rao@clinic.local / Password123! (General Medicine)`);
  console.log(` Doctor 2: dr.iyer@clinic.local / Password123! (Cardiology)`);
  console.log(` Patient:  patient@example.com / Password123!`);
  void admin;
  void doctorUser;
  void doctor2;
  void patient;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
