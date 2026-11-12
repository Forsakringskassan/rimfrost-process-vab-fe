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
  /** Understeg i steget, t.ex. kontrollerna i en bedömningsfas. Högst två nivåer. */
  understeg?: Understeg[];
}

/**
 * Ett understeg bär sin egen status. Den kan inte härledas från index som för
 * stegen, eftersom ett steg kan pågå med flera understeg klara och några kvar.
 */
export interface Understeg {
  id: string;
  rubrik: string;
  beskrivning?: string;
  status: StegStatus;
  /** Understegets egna understeg. De har inga egna. */
  understeg?: Understeg[];
}

/** Text som visas och läses upp för varje status. */
export const statusText: Record<StegStatus, string> = {
  klar: "Klart",
  aktiv: "Pågår",
  kommande: "Kommande",
};

/** Hovringstext för ett steg eller understeg med understeg. Steg utan understeg har ingen. */
export const OPPNA_TEXT = "Öppna vy för delsteg";
export const STANG_TEXT = "Stäng vy för delsteg";
