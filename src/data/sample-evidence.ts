import { LearnerEvidence } from "../types/evidence";

export const SAMPLE_EVIDENCE: LearnerEvidence[] = [
  {
    id: "1",
    userId: "BRL-001",
    school: "Nico Hauser Special School for the Visually Impaired",
    county: "Siaya",
    age: 15,
    disabilityType: "Low vision / progressive",
    sessionType: "Teacher training session",
    outcomeRecorded: "Teacher noted 'learner led the group for the first time during a practical activity'",
    createdAt: new Date("2025-03-15"),
    updatedAt: new Date("2025-03-15")
  },
  {
    id: "2",
    userId: "BRL-002",
    school: "Kilimani Primary School Unit for Blind",
    county: "Nairobi",
    age: 12,
    disabilityType: "Blind (congenital)",
    sessionType: "Voice coding workshop",
    outcomeRecorded: "Student successfully created a 5-step program using voice commands independently",
    createdAt: new Date("2025-04-02"),
    updatedAt: new Date("2025-04-02")
  },
  {
    id: "3",
    userId: "BRL-003",
    school: "Mombasa School for the Visually Impaired",
    county: "Mombasa",
    age: 14,
    disabilityType: "Blind (acquired)",
    sessionType: "Prototype assembly session",
    outcomeRecorded: "Assembled the robotics kit with minimal assistance, demonstrated understanding of motor connections",
    createdAt: new Date("2025-04-10"),
    updatedAt: new Date("2025-04-10")
  },
  {
    id: "4",
    userId: "BRL-004",
    school: "St. Oda School for the Blind",
    county: "Siaya",
    age: 16,
    disabilityType: "Low vision (stable)",
    sessionType: "Bootcamp session",
    outcomeRecorded: "Completed the full 3-day bootcamp, built and programmed a line-following robot",
    createdAt: new Date("2025-03-20"),
    updatedAt: new Date("2025-03-20")
  },
  {
    id: "5",
    userId: "BRL-005",
    school: "Thika Primary School - Blind Unit",
    county: "Kiambu",
    age: 11,
    disabilityType: "Blind (congenital)",
    sessionType: "Voice coding workshop",
    outcomeRecorded: "Used voice commands to create a loop that repeated a movement sequence 10 times",
    createdAt: new Date("2025-04-18"),
    updatedAt: new Date("2025-04-18")
  },
  {
    id: "6",
    userId: "BRL-006",
    school: "Eldoret Vision Academy",
    county: "Uasin Gishu",
    age: 13,
    disabilityType: "Low vision / progressive",
    sessionType: "Classroom integration",
    outcomeRecorded: "Teacher reported improved confidence in STEM activities; student now assists peers",
    createdAt: new Date("2025-03-05"),
    updatedAt: new Date("2025-03-05")
  },
  {
    id: "7",
    userId: "BRL-007",
    school: "Kisumu Special School",
    county: "Kisumu",
    age: 17,
    disabilityType: "Blind (acquired)",
    sessionType: "Prototype assembly session",
    outcomeRecorded: "Provided detailed feedback on tactile markers that improved the kit design",
    createdAt: new Date("2025-04-25"),
    updatedAt: new Date("2025-04-25")
  },
  {
    id: "8",
    userId: "BRL-008",
    school: "Nyeri School for the Visually Impaired",
    county: "Nyeri",
    age: 14,
    disabilityType: "Blind (congenital)",
    sessionType: "Bootcamp session",
    outcomeRecorded: "Awarded 'Most Innovative Project' for voice-controlled robot at the closing showcase",
    createdAt: new Date("2025-03-28"),
    updatedAt: new Date("2025-03-28")
  }
];