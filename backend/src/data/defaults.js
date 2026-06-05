import { nowStamp } from "../utils/date.js";

export const staffRoleOptions = ["dokter", "hb", "aftap", "admin", "driver", "other"];

export function defaultWorkflow() {
  const timestamp = nowStamp();
  return {
    assignments: [],
    schedules: [],
    results: [],
    histories: [],
    staff: [
      {
        id: "ptg-001",
        name: "Admin Utama",
        roles: ["admin", "driver"],
        absen: "0001",
        password: "1234",
        rekening: "BCA 1234567890",
        created_at: timestamp,
        updated_at: timestamp,
      },
      {
        id: "ptg-002",
        name: "Dr. Nadya Putri",
        roles: ["dokter"],
        absen: "0002",
        password: "1234",
        rekening: "Mandiri 1100220033",
        created_at: timestamp,
        updated_at: timestamp,
      },
      {
        id: "ptg-003",
        name: "Raka Pratama",
        roles: ["aftap", "hb"],
        absen: "0003",
        password: "1234",
        rekening: "BNI 77889900",
        created_at: timestamp,
        updated_at: timestamp,
      },
      {
        id: "ptg-004",
        name: "Siti Rahma",
        roles: ["admin", "hb"],
        absen: "0004",
        password: "1234",
        rekening: "BRI 55667788",
        created_at: timestamp,
        updated_at: timestamp,
      },
      {
        id: "ptg-005",
        name: "Bima Saputra",
        roles: ["driver"],
        absen: "0005",
        password: "1234",
        rekening: "BCA 99887766",
        created_at: timestamp,
        updated_at: timestamp,
      },
    ],
    locations: [
      {
        id: "lok-001",
        name: "Mandiri Inhealth",
        address: "Menara Mandiri Inhealth, Jl. Prof. Dr. Satrio, Jakarta Selatan",
        latitude: "-6.224490",
        longitude: "106.823310",
        created_at: timestamp,
        updated_at: timestamp,
      },
      {
        id: "lok-002",
        name: "SMA 12 Jakarta",
        address: "SMA Negeri 12 Jakarta, Jl. Pertanian, Duren Sawit, Jakarta Timur",
        latitude: "-6.232170",
        longitude: "106.915730",
        created_at: timestamp,
        updated_at: timestamp,
      },
      {
        id: "lok-003",
        name: "Universitas Nasional",
        address: "Universitas Nasional, Jl. Sawo Manila, Pejaten, Jakarta Selatan",
        latitude: "-6.280680",
        longitude: "106.832290",
        created_at: timestamp,
        updated_at: timestamp,
      },
    ],
  };
}
