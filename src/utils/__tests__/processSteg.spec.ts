import { describe, expect, it } from "vitest";
import {
  type ProcessStegStatus,
  type ProcessvySteg,
  arProcessvySteg,
  tillStegIndikator,
} from "../processSteg";

function svar(...statusar: ProcessStegStatus[]): ProcessvySteg {
  return {
    processId: "vab",
    processnamn: "Vård av boskap",
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

  it("lämnar ett platt svar utan understeg", () => {
    expect(tillStegIndikator(svar("PAGAR")).steg[0]).not.toHaveProperty("understeg");
  });

  it("behåller id, rubrik och beskrivning i ordning", () => {
    const data = svar("PAGAR", "KOMMANDE");
    data.steg[0]!.beskrivning = "Om steget";

    expect(tillStegIndikator(data).steg).toEqual([
      { id: "steg-0", rubrik: "Steg 0", beskrivning: "Om steget" },
      { id: "steg-1", rubrik: "Steg 1" },
    ]);
  });

  it("översätter understeg i två nivåer med egen status", () => {
    const data = svar("PAGAR");
    data.steg[0]!.steg = [
      { id: "u1", rubrik: "U1", status: "KLAR" },
      {
        id: "u2",
        rubrik: "U2",
        status: "PAGAR",
        beskrivning: "Om U2",
        steg: [
          { id: "d1", rubrik: "D1", status: "KLAR" },
          { id: "d2", rubrik: "D2", status: "PAGAR" },
        ],
      },
    ];

    expect(tillStegIndikator(data).steg[0]!.understeg).toEqual([
      { id: "u1", rubrik: "U1", status: "klar" },
      {
        id: "u2",
        rubrik: "U2",
        beskrivning: "Om U2",
        status: "aktiv",
        understeg: [
          { id: "d1", rubrik: "D1", status: "klar" },
          { id: "d2", rubrik: "D2", status: "aktiv" },
        ],
      },
    ]);
  });
});

describe("arProcessvySteg", () => {
  const nod = (steg?: unknown) => ({ id: "x", rubrik: "X", status: "KLAR", steg });
  const svarMed = (...steg: unknown[]) => ({ processId: "vab", processnamn: "VAB", steg });

  it("godtar ett platt svar", () => {
    expect(arProcessvySteg(svarMed(nod(), nod()))).toBe(true);
  });

  it("godtar understeg i två nivåer", () => {
    expect(arProcessvySteg(svarMed(nod([nod([nod()])])))).toBe(true);
  });

  it("avvisar en tredje nivå understeg", () => {
    expect(arProcessvySteg(svarMed(nod([nod([nod([nod()])])])))).toBe(false);
  });

  it("godtar en tom lista som inga understeg, även på innersta nivån", () => {
    expect(arProcessvySteg(svarMed(nod([nod([nod([])])])))).toBe(true);
  });

  it("avvisar steg som inte är en lista", () => {
    expect(arProcessvySteg(svarMed(nod({ id: "y" })))).toBe(false);
  });

  it("avvisar ett understeg med okänd status", () => {
    expect(arProcessvySteg(svarMed(nod([{ id: "y", rubrik: "Y", status: "AVBRUTEN" }])))).toBe(
      false,
    );
  });

  it("avvisar ett understeg utan rubrik", () => {
    expect(arProcessvySteg(svarMed(nod([nod([{ id: "y", status: "KLAR" }])])))).toBe(false);
  });
});
