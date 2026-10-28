import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ProcessVy from "../ProcessVy.vue";
import { fetchProcessSteg } from "../../utils/fetchProcessSteg";
import type { HamtaStegResultat } from "../../utils/fetchProcessSteg";

vi.mock("../../utils/fetchProcessSteg", () => ({
  fetchProcessSteg: vi.fn(),
}));

const fetchMock = vi.mocked(fetchProcessSteg);

const aktivitetId = "3f2b8c1e-4d5a-4b6c-9e7f-1a2b3c4d5e6f";

const ok: HamtaStegResultat = {
  typ: "ok",
  data: {
    processId: "vah",
    processnamn: "Vård av husdjur",
    steg: [
      { id: "registrera-ansokan", rubrik: "Registrera ansökan", status: "KLAR" },
      { id: "kontrollera", rubrik: "Kontrollera rätt till försäkring", status: "PAGAR" },
      { id: "besluta", rubrik: "Besluta", status: "KOMMANDE" },
    ],
  },
};

function mountVy(props: Record<string, unknown> = { aktivitetId }) {
  return mount(ProcessVy, {
    props: { handlaggningId: "h-1", ...props },
    global: { stubs: { FIcon: true } },
  });
}

describe("ProcessVy", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("hämtar stegen för aktiviteten och visar dem i stegindikatorn", async () => {
    fetchMock.mockResolvedValue(ok);

    const wrapper = mountVy();
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith(aktivitetId, expect.any(AbortSignal));
    const rubriker = wrapper.findAll(".steg-indikator__steg").map((s) => s.text());
    expect(rubriker).toHaveLength(3);
    expect(rubriker[0]).toContain("Registrera ansökan");
    expect(wrapper.find("nav").attributes("aria-label")).toBe(
      "Steg i processen Vård av husdjur",
    );
  });

  it("markerar det pågående steget", async () => {
    fetchMock.mockResolvedValue(ok);

    const wrapper = mountVy();
    await flushPromises();

    const steg = wrapper.findAll(".steg-indikator__steg");
    expect(steg[0]!.classes()).toContain("steg-indikator__steg--klar");
    expect(steg[1]!.classes()).toContain("steg-indikator__steg--aktiv");
    expect(steg[1]!.find("button").attributes("aria-current")).toBe("step");
    expect(steg[2]!.classes()).toContain("steg-indikator__steg--kommande");
  });

  it("visar ingenting medan stegen hämtas", () => {
    fetchMock.mockReturnValue(new Promise(() => {}));

    const wrapper = mountVy();

    expect(wrapper.find(".process-vy").exists()).toBe(false);
  });

  it("döljs när aktivitets-ID:t är okänt", async () => {
    fetchMock.mockResolvedValue({ typ: "okand-aktivitet" });

    const wrapper = mountVy();
    await flushPromises();

    expect(wrapper.find(".process-vy").exists()).toBe(false);
  });

  it.each([undefined, null, ""])(
    "döljs utan anrop när aktivitetId saknas (%s)",
    async (saknat) => {
      const wrapper = mountVy({ aktivitetId: saknat });
      await flushPromises();

      expect(fetchMock).not.toHaveBeenCalled();
      expect(wrapper.find(".process-vy").exists()).toBe(false);
    },
  );

  it("döljs när processen saknar steg", async () => {
    fetchMock.mockResolvedValue({ typ: "ok", data: { ...ok.data, steg: [] } });

    const wrapper = mountVy();
    await flushPromises();

    expect(wrapper.find(".process-vy").exists()).toBe(false);
  });

  it("visar ett neutralt meddelande när stegen inte kan hämtas", async () => {
    fetchMock.mockResolvedValue({ typ: "fel" });

    const wrapper = mountVy();
    await flushPromises();

    expect(wrapper.find(".steg-indikator").exists()).toBe(false);
    expect(wrapper.find(".process-vy__meddelande").text()).toBe(
      "Processens steg kan inte visas just nu.",
    );
  });

  it("hämtar om stegen när aktivitetId ändras och ignorerar det gamla svaret", async () => {
    let losGammalt: (r: HamtaStegResultat) => void = () => {};
    fetchMock
      .mockReturnValueOnce(new Promise((resolve) => (losGammalt = resolve)))
      .mockResolvedValueOnce(ok);

    const wrapper = mountVy();
    const forstaSignal = fetchMock.mock.calls[0]![1]!;
    await wrapper.setProps({ aktivitetId: "nytt-aktivitet-id" });
    await flushPromises();

    expect(forstaSignal.aborted).toBe(true);
    expect(fetchMock).toHaveBeenLastCalledWith("nytt-aktivitet-id", expect.any(AbortSignal));

    losGammalt({ typ: "fel" });
    await flushPromises();

    expect(wrapper.find(".process-vy__meddelande").exists()).toBe(false);
    expect(wrapper.findAll(".steg-indikator__steg")).toHaveLength(3);
  });

  it("avbryter pågående hämtning när vyn tas bort", () => {
    fetchMock.mockReturnValue(new Promise(() => {}));

    const wrapper = mountVy();
    const signal = fetchMock.mock.calls[0]![1]!;
    wrapper.unmount();

    expect(signal.aborted).toBe(true);
  });
});
