import { env, ensureEnvLoaded } from "../config/env";
import { type ProcessvySteg, arProcessvySteg } from "./processSteg";

/**
 * okand-aktivitet: BFF:en svarade 404, process-vab känner inte till aktiviteten.
 * fel: allt annat som gör att stegen inte kan visas (nätverksfel, felstatus, oväntat svar).
 */
export type HamtaStegResultat =
  | { typ: "ok"; data: ProcessvySteg }
  | { typ: "okand-aktivitet" }
  | { typ: "fel" };

export async function fetchProcessSteg(
  aktivitetId: string,
  signal?: AbortSignal,
): Promise<HamtaStegResultat> {
  try {
    await ensureEnvLoaded();
    const url = `${env.bffUrl}/api/steg?aktivitetId=${encodeURIComponent(aktivitetId)}`;
    const response = await fetch(url, { signal });

    if (response.status === 404) {
      return { typ: "okand-aktivitet" };
    }
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      throw new Error(`Unexpected content type: ${contentType}`);
    }

    const data: unknown = await response.json();
    if (!arProcessvySteg(data)) {
      throw new Error("Invalid response format from backend");
    }
    return { typ: "ok", data };
  } catch (error) {
    if (!signal?.aborted) {
      console.error("Failed to fetch process steps:", error);
    }
    return { typ: "fel" };
  }
}
