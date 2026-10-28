export type StegStatus = "klar" | "aktiv" | "kommande";

export interface Steg {
  /** Nyckel för steget **/
  id: string;
  /** Kort text under eller bredvid cirkeln. */
  rubrik: string;
  /** Visas i detaljpanelen om ingen #detaljer-slot används. */
  beskrivning?: string;
  /** FKUI-ikon i cirkeln för aktiva och kommande steg. Stegnumret visas annars. */
  ikon?: string;
}

/** Text som visas och läses upp för varje status. */
export const statusText: Record<StegStatus, string> = {
  klar: "Klart",
  aktiv: "Pågår",
  kommande: "Kommande",
};
