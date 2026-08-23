export type Role = "PATIENT" | "DOCTOR" | "ADMIN";
export type AppointmentStatus = "HELD" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
export type Urgency = "LOW" | "MEDIUM" | "HIGH";
export type LlmStatus = "PENDING" | "COMPLETED" | "FAILED";

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  role: Role;
}

export interface PatientProfile {
  id: string;
  userId: string;
  user: User;
}

export interface WorkingHour {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface LeaveDay {
  id: string;
  date: string;
  reason?: string | null;
}

export interface DoctorProfile {
  id: string;
  userId: string;
  user: User;
  specialization: string;
  bio?: string | null;
  qualifications?: string | null;
  slotDurationMinutes: number;
  consultationFee?: string | null;
  isActive: boolean;
  workingHours: WorkingHour[];
  leaveDays: LeaveDay[];
}

export interface SlotCandidate {
  start: string;
  end: string;
  available: boolean;
}

export interface SymptomForm {
  id: string;
  symptomsText: string;
  durationDays?: number | null;
  severitySelfRating?: number | null;
  llmStatus: LlmStatus;
  urgencyLevel?: Urgency | null;
  chiefComplaint?: string | null;
  suggestedQuestions?: string[] | null;
  llmError?: string | null;
}

export interface PrescriptionItem {
  medication: string;
  dosage?: string;
  frequencyPerDay: number;
  durationDays: number;
  instructions?: string;
}

export interface VisitNote {
  id: string;
  clinicalNotes: string;
  diagnosis?: string | null;
  prescription: PrescriptionItem[];
  llmStatus: LlmStatus;
  patientSummary?: string | null;
  followUpSteps?: string | null;
  llmError?: string | null;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  slotStart: string;
  slotEnd: string;
  status: AppointmentStatus;
  holdExpiresAt?: string | null;
  cancelledReason?: string | null;
  patient: PatientProfile;
  doctor: DoctorProfile;
  symptomForm?: SymptomForm | null;
  visitNote?: VisitNote | null;
}
