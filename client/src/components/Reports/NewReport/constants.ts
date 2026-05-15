export const DAMAGE_TYPES = ["dent", "scratch", "collision", "glass", "paint", "other"] as const;
export type DamageType = (typeof DAMAGE_TYPES)[number];

export const SEVERITIES = ["minor", "moderate", "severe"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const SAVED_VEHICLES = [
  {
    id: "vw-golf-2021",
    label: "Volkswagen Golf 2021 · NL-72-XPF",
    registration: "NL-72-XPF",
    make: "Volkswagen",
    model: "Golf",
  },
  {
    id: "tesla-model3-2022",
    label: "Tesla Model 3 2022 · NL-83-LRA",
    registration: "NL-83-LRA",
    make: "Tesla",
    model: "Model 3",
  },
  {
    id: "renault-clio-2019",
    label: "Renault Clio 2019 · NL-44-PQT",
    registration: "NL-44-PQT",
    make: "Renault",
    model: "Clio",
  },
] as const;

export type Vehicle = (typeof SAVED_VEHICLES)[number];
export type VehicleId = Vehicle["id"];

export type Photo = { url: string; caption: string };
