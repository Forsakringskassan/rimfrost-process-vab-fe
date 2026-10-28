import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchProcessSteg } from "../fetchProcessSteg";

// ensureEnvLoaded försöker ladda runtime-config.js, vilket happy-dom inte tillåter.
vi.mock("../../config/env", () => ({
  env: { bffUrl: "" },
  ensureEnvLoaded: () => Promise.resolve(),
}));

const aktivitetId = "3f2b8c1e-4d5a-4b6c-9e7f-1a2b3c4d5e6f";

const giltigtSvar = {
  processId: "vab",
  processnamn: "Vård av boskap",
  steg: [
    { id: "maskinell-kontroll", rubrik: "Maskinell kontroll av rätt till försäkring", status: "KLAR" },
    {
      id: "manuell-kontroll",
      rubrik: "Manuell kontroll av rätt till försäkring",
      beskrivning: "Handläggaren kompletterar yrkandet vid behov och bedömer rätten till försäkring när den maskinella kontrollen inte räcker.",
      status: "PAGAR",
    },
    { id: "bekrafta-beslut", rubrik: "Bekräfta beslut", status: "KOMMANDE" },
  ],
};

function mockFetch(body: unknown, options: { status?: number; contentType?: string } = {}) {
  const { status = 200, contentType = "application/json" } = options;
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (key: string) => (key.toLowerCase() === "content-type" ? contentType : null) },
    json: () => Promise.resolve(body),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("fetchProcessSteg", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("anropar BFF:ens steg-endpoint med aktivitetId", async () => {
    const fetchMock = mockFetch(giltigtSvar);

    await fetchProcessSteg(aktivitetId);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp(`/api/steg\\?aktivitetId=${aktivitetId}$`)),
      expect.anything(),
    );
  });

  it("returnerar stegen när svaret är giltigt", async () => {
    mockFetch(giltigtSvar);

    const resultat = await fetchProcessSteg(aktivitetId);

    expect(resultat).toEqual({ typ: "ok", data: giltigtSvar });
  });

  it("returnerar okand-aktivitet vid 404", async () => {
    mockFetch({ error: "Not found" }, { status: 404 });

    const resultat = await fetchProcessSteg(aktivitetId);

    expect(resultat).toEqual({ typ: "okand-aktivitet" });
    expect(console.error).not.toHaveBeenCalled();
  });

  it.each([400, 500, 502])("returnerar fel vid status %i", async (status) => {
    mockFetch({ error: "Upstream error" }, { status });

    const resultat = await fetchProcessSteg(aktivitetId);

    expect(resultat).toEqual({ typ: "fel" });
    expect(console.error).toHaveBeenCalled();
  });

  it("returnerar fel när nätverksanropet misslyckas", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    const resultat = await fetchProcessSteg(aktivitetId);

    expect(resultat).toEqual({ typ: "fel" });
  });

  it("returnerar fel när svaret inte är JSON", async () => {
    mockFetch("<html></html>", { contentType: "text/html" });

    const resultat = await fetchProcessSteg(aktivitetId);

    expect(resultat).toEqual({ typ: "fel" });
  });

  it.each([
    ["steg saknas", { processId: "vab", processnamn: "Vård av boskap" }],
    ["okänd status", { ...giltigtSvar, steg: [{ id: "a", rubrik: "A", status: "OKAND" }] }],
    ["rubrik saknas", { ...giltigtSvar, steg: [{ id: "a", status: "KLAR" }] }],
  ])("returnerar fel när svaret har fel format (%s)", async (_, body) => {
    mockFetch(body);

    const resultat = await fetchProcessSteg(aktivitetId);

    expect(resultat).toEqual({ typ: "fel" });
  });

  it("loggar inte ett avbrutet anrop som fel", async () => {
    const controller = new AbortController();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => {
        controller.abort();
        return Promise.reject(new DOMException("Aborted", "AbortError"));
      }),
    );

    const resultat = await fetchProcessSteg(aktivitetId, controller.signal);

    expect(resultat).toEqual({ typ: "fel" });
    expect(console.error).not.toHaveBeenCalled();
  });
});
