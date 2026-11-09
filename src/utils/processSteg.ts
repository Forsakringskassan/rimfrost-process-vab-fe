import type { Steg } from "../components/StegIndikator";

/** Svaret från BFF:en, enligt GetProcessvyStegResponse i rimfrost-framework-process-openapi. */
export type ProcessStegStatus = "KLAR" | "PAGAR" | "KOMMANDE";

export interface ProcessSteg {
  id: string;
  rubrik: string;
  beskrivning?: string;
  status: ProcessStegStatus;
}

export interface ProcessvySteg {
  processId: string;
  processnamn: string;
  steg: ProcessSteg[];
}

const giltigaStatusar: readonly string[] = ["KLAR", "PAGAR", "KOMMANDE"];

function arProcessSteg(varde: unknown): varde is ProcessSteg {
  if (typeof varde !== "object" || varde === null) {
    return false;
  }
  const steg = varde as Record<string, unknown>;
  return (
    typeof steg.id === "string" &&
    typeof steg.rubrik === "string" &&
    (steg.beskrivning === undefined || typeof steg.beskrivning === "string") &&
    typeof steg.status === "string" &&
    giltigaStatusar.includes(steg.status)
  );
}

export function arProcessvySteg(varde: unknown): varde is ProcessvySteg {
  if (typeof varde !== "object" || varde === null) {
    return false;
  }
  const svar = varde as Record<string, unknown>;
  return (
    typeof svar.processId === "string" &&
    typeof svar.processnamn === "string" &&
    Array.isArray(svar.steg) &&
    svar.steg.every(arProcessSteg)
  );
}

/**
 * Översätter processens steg till StegIndikatorns props. StegIndikatorn markerar
 * stegen utifrån index: stegen före aktivtSteg blir klara och stegen efter kommande.
 */
export function tillStegIndikator(data: ProcessvySteg): {
  steg: Steg[];
  aktivtSteg: number;
} {
  const steg = data.steg.map(({ id, rubrik, beskrivning }) => ({
    id,
    rubrik,
    ...(beskrivning ? { beskrivning } : {}),
  }));

  const pagar = data.steg.findIndex((s) => s.status === "PAGAR");
  if (pagar !== -1) {
    return { steg, aktivtSteg: pagar };
  }
  // Inget steg pågår: första ej klara steget blir aktivt, eller inget alls om allt är klart.
  const forstaEjKlara = data.steg.findIndex((s) => s.status !== "KLAR");
  return { steg, aktivtSteg: forstaEjKlara === -1 ? steg.length : forstaEjKlara };
}
