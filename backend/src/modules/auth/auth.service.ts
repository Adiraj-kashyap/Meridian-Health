import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma";
import { signToken } from "../../middleware/auth";
import { ApiError } from "../../utils/apiError";
import { RegisterInput, LoginInput } from "./auth.validation";

const SALT_ROUNDS = 10;

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw ApiError.conflict("An account with this email already exists");

  if (input.role === "DOCTOR" && !input.specialization) {
    throw ApiError.badRequest("specialization is required when registering as a doctor");
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      name: input.name,
      phone: input.phone,
      role: input.role,
      ...(input.role === "PATIENT" ? { patientProfile: { create: {} } } : {}),
      ...(input.role === "DOCTOR"
        ? {
            doctorProfile: {
              create: {
                specialization: input.specialization!,
                bio: input.bio,
                slotDurationMinutes: input.slotDurationMinutes ?? 30,
              },
            },
          }
        : {}),
    },
    include: { patientProfile: true, doctorProfile: true },
  });

  const token = signToken({ userId: user.id, role: user.role, email: user.email });
  return { token, user: sanitizeUser(user) };
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    include: { patientProfile: true, doctorProfile: true },
  });
  if (!user) throw ApiError.unauthorized("Invalid email or password");

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) throw ApiError.unauthorized("Invalid email or password");

  const token = signToken({ userId: user.id, role: user.role, email: user.email });
  return { token, user: sanitizeUser(user) };
}

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { patientProfile: true, doctorProfile: { include: { workingHours: true, leaveDays: true } } },
  });
  if (!user) throw ApiError.notFound("User not found");
  return sanitizeUser(user);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sanitizeUser(user: any) {
  const { passwordHash, ...rest } = user;
  return rest;
}
