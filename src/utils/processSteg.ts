import type { Steg, StegStatus, Understeg } from "../components/StegIndikator";

/** Svaret från BFF:en, enligt GetProcessvyStegResponse i rimfrost-framework-process-openapi. */
export type ProcessStegStatus = "KLAR" | "PAGAR" | "KOMMANDE";

export interface ProcessSteg {
  id: string;
  rubrik: string;
  beskrivning?: string;
  status: ProcessStegStatus;
  /** Understeg, högst två nivåer under svarets steg[]. Saknas när steget inte har några. */
  steg?: ProcessSteg[];
}

export interface ProcessvySteg {
  processId: string;
  processnamn: string;
  steg: ProcessSteg[];
}

const tillStegStatus: Record<ProcessStegStatus, StegStatus> = {
  KLAR: "klar",
  PAGAR: "aktiv",
  KOMMANDE: "kommande",
};

const giltigaStatusar: readonly string[] = ["KLAR", "PAGAR", "KOMMANDE"];

/** Steg, understeg och understegens understeg: tre nivåer totalt. */
const MAX_UNDERSTEGSNIVAER = 2;

function arProcessSteg(varde: unknown, nivaerKvar = MAX_UNDERSTEGSNIVAER): varde is ProcessSteg {
  if (typeof varde !== "object" || varde === null) {
    return false;
  }
  const steg = varde as Record<string, unknown>;
  return (
    typeof steg.id === "string" &&
    typeof steg.rubrik === "string" &&
    (steg.beskrivning === undefined || typeof steg.beskrivning === "string") &&
    typeof steg.status === "string" &&
    giltigaStatusar.includes(steg.status) &&
    (steg.steg === undefined ||
      // En tom lista betyder inga understeg, på alla nivåer.
      (Array.isArray(steg.steg) &&
        (steg.steg.length === 0 ||
          (nivaerKvar > 0 && steg.steg.every((u) => arProcessSteg(u, nivaerKvar - 1))))))
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
    svar.steg.every((s) => arProcessSteg(s))
  );
}

function tillUndersteg(u: ProcessSteg): Understeg {
  return {
    id: u.id,
    rubrik: u.rubrik,
    ...(u.beskrivning ? { beskrivning: u.beskrivning } : {}),
    status: tillStegStatus[u.status],
    ...(u.steg?.length ? { understeg: u.steg.map(tillUndersteg) } : {}),
  };
}

/**
 * Översätter processens steg till StegIndikatorns props. StegIndikatorn markerar
 * stegen utifrån index: stegen före aktivtSteg blir klara och stegen efter kommande.
 */
export function tillStegIndikator(data: ProcessvySteg): {
  steg: Steg[];
  aktivtSteg: number;
} {
  const steg = data.steg.map(({ id, rubrik, beskrivning, steg: understeg }) => ({
    id,
    rubrik,
    ...(beskrivning ? { beskrivning } : {}),
    ...(understeg?.length ? { understeg: understeg.map(tillUndersteg) } : {}),
  }));

  const pagar = data.steg.findIndex((s) => s.status === "PAGAR");
  if (pagar !== -1) {
    return { steg, aktivtSteg: pagar };
  }
  // Inget steg pågår: första ej klara steget blir aktivt, eller inget alls om allt är klart.
  const forstaEjKlara = data.steg.findIndex((s) => s.status !== "KLAR");
  return { steg, aktivtSteg: forstaEjKlara === -1 ? steg.length : forstaEjKlara };
}
