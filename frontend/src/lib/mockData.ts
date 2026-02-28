export interface MockEmployee {
  address: string;
  role: string;
  tier: "high" | "medium" | "low" | "unscored";
  status: "active" | "inactive";
  hireDate: string;
}

export interface MockPayment {
  id: number;
  date: string;
  employees: number;
  status: "completed" | "processing" | "pending";
  type: "batch" | "individual";
}

export interface MockEmployeePayment {
  id: number;
  date: string;
  amount: string;
  status: "completed" | "delayed" | "escrowed" | "released";
  type: "Instant" | "Delayed" | "Escrowed";
}

export const MOCK_EMPLOYEES: MockEmployee[] = [
  {
    address: "0x1a2B3c4D5e6F7890AbCdEf1234567890aBcDeF12",
    role: "Senior Engineer",
    tier: "high",
    status: "active",
    hireDate: "2025-06-15",
  },
  {
    address: "0x2b3C4d5E6f7890aBcDeF1234567890AbCdEf1234",
    role: "Product Manager",
    tier: "medium",
    status: "active",
    hireDate: "2025-09-01",
  },
  {
    address: "0x3c4D5e6F7890aBcDEf1234567890AbCdEf123456",
    role: "Designer",
    tier: "high",
    status: "active",
    hireDate: "2025-03-20",
  },
  {
    address: "0x4d5E6f7890AbCdEf1234567890aBcDeF12345678",
    role: "Junior Developer",
    tier: "low",
    status: "active",
    hireDate: "2026-01-10",
  },
  {
    address: "0x5e6F7890aBcDeF1234567890AbCdEf1234567890",
    role: "Marketing Lead",
    tier: "medium",
    status: "inactive",
    hireDate: "2025-07-22",
  },
];

export const MOCK_PAYMENTS: MockPayment[] = [
  {
    id: 1,
    date: "2026-02-01",
    employees: 4,
    status: "completed",
    type: "batch",
  },
  {
    id: 2,
    date: "2026-01-01",
    employees: 3,
    status: "completed",
    type: "batch",
  },
  {
    id: 3,
    date: "2025-12-01",
    employees: 3,
    status: "completed",
    type: "batch",
  },
];

export const MOCK_EMPLOYEE_PAYMENTS: MockEmployeePayment[] = [
  {
    id: 1,
    date: "2026-02-01",
    amount: "Encrypted",
    status: "completed",
    type: "Instant",
  },
  {
    id: 2,
    date: "2026-01-01",
    amount: "Encrypted",
    status: "completed",
    type: "Instant",
  },
  {
    id: 3,
    date: "2025-12-01",
    amount: "Encrypted",
    status: "released",
    type: "Delayed",
  },
];

export const MOCK_STATS = {
  totalEmployees: 5,
  activeEmployees: 4,
  totalDistributed: "47,500",
  avgTrustScore: 68,
  totalPayrolls: 3,
};
