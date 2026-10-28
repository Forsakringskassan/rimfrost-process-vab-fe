import { describe, expect, it } from "vitest";
import { type ProcessStegStatus, type ProcessvySteg, tillStegIndikator } from "../processSteg";

function svar(...statusar: ProcessStegStatus[]): ProcessvySteg {
  return {
    processId: "vah",
    processnamn: "Vård av husdjur",
    steg: statusar.map((status, i) => ({ id: `steg-${i}`, rubrik: `Steg ${i}`, status })),
  };
}

describe("tillStegIndikator", () => {
  it("markerar det pågående steget som aktivt", () => {
    expect(tillStegIndikator(svar("KLAR", "KLAR", "PAGAR", "KOMMANDE")).aktivtSteg).toBe(2);
  });

  it("väljer första ej klara steget när inget pågår", () => {
    expect(tillStegIndikator(svar("KLAR", "KOMMANDE", "KOMMANDE")).aktivtSteg).toBe(1);
  });

  it("markerar alla steg som klara när processen är klar", () => {
    expect(tillStegIndikator(svar("KLAR", "KLAR")).aktivtSteg).toBe(2);
  });

  it("behåller id, rubrik och beskrivning i ordning", () => {
    const data = svar("PAGAR", "KOMMANDE");
    data.steg[0]!.beskrivning = "Om steget";

    expect(tillStegIndikator(data).steg).toEqual([
      { id: "steg-0", rubrik: "Steg 0", beskrivning: "Om steget" },
      { id: "steg-1", rubrik: "Steg 1" },
    ]);
  });
});
