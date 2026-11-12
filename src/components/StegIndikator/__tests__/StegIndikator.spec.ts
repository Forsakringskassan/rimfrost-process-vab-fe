import { nextTick } from "vue";
import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StegIndikator from "../StegIndikator.vue";
import type { Steg } from "../steg";

const steg: Steg[] = [
  { id: "a", rubrik: "Kontakt", beskrivning: "Om kontakt" },
  { id: "b", rubrik: "Uppgifter", beskrivning: "Om uppgifter" },
  { id: "c", rubrik: "Adress", beskrivning: "Om adress" },
  { id: "d", rubrik: "Verifiering", beskrivning: "Om verifiering" },
];

let resizeCallback: ResizeObserverCallback | null = null;

class ResizeObserverMock {
  public constructor(callback: ResizeObserverCallback) {
    resizeCallback = callback;
  }
  public observe = vi.fn();
  public disconnect = vi.fn();
  public unobserve = vi.fn();
}

async function setBredd(bredd: number): Promise<void> {
  resizeCallback?.(
    [{ contentRect: { width: bredd } } as ResizeObserverEntry],
    {} as ResizeObserver,
  );
  await nextTick();
}

function mountIndikator(props: Record<string, unknown> = {}) {
  return mount(StegIndikator, {
    props: { steg, aktivtSteg: 2, ...props },
    global: { stubs: { FIcon: true } },
  });
}

describe("StegIndikator", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resizeCallback = null;
  });

  it("marks steps before the active step as done and later ones as upcoming", () => {
    const wrapper = mountIndikator();
    const items = wrapper.findAll("li");

    expect(items).toHaveLength(4);
    expect(items[0].classes()).toContain("steg-indikator__steg--klar");
    expect(items[1].classes()).toContain("steg-indikator__steg--klar");
    expect(items[2].classes()).toContain("steg-indikator__steg--aktiv");
    expect(items[3].classes()).toContain("steg-indikator__steg--kommande");
  });

  it("sets aria-current only on the active step", () => {
    const wrapper = mountIndikator();
    const buttons = wrapper.findAll("button");

    expect(buttons[2].attributes("aria-current")).toBe("step");
    expect(buttons.filter((b) => b.attributes("aria-current"))).toHaveLength(1);
  });

  it("shows a check mark for done steps and the step number otherwise", () => {
    const wrapper = mountIndikator();
    const circles = wrapper.findAll(".steg-indikator__cirkel");

    expect(circles[0].find(".steg-indikator__bock").exists()).toBe(true);
    expect(circles[3].text()).toBe("4");
  });

  it("opens the details for a pressed step and closes them on a second press", async () => {
    const wrapper = mountIndikator();
    const button = wrapper.findAll("button")[1];

    await button.trigger("click");
    expect(button.attributes("aria-expanded")).toBe("true");
    expect(wrapper.find(".steg-indikator__detaljer").text()).toContain(
      "Om uppgifter",
    );
    // Steg 2 ligger före det aktiva steget, så panelen visar statustexten "Klart".
    expect(wrapper.find(".steg-detaljer__status").text()).toBe("Klart");

    await button.trigger("click");
    expect(button.attributes("aria-expanded")).toBe("false");
    expect(wrapper.find(".steg-indikator__detaljer").exists()).toBe(false);
  });

  it("closes the details on Escape", async () => {
    const wrapper = mountIndikator();
    await wrapper.findAll("button")[0].trigger("click");

    await wrapper.find(".steg-indikator__detaljer").trigger("keydown.esc");

    expect(wrapper.find(".steg-indikator__detaljer").exists()).toBe(false);
  });

  it("renders the detaljer slot with the selected step", async () => {
    const wrapper = mount(StegIndikator, {
      props: { steg, aktivtSteg: 2 },
      slots: {
        detaljer: `<template #detaljer="{ steg, status }">
          <p class="egen">{{ steg.rubrik }}: {{ status }}</p>
        </template>`,
      },
      global: { stubs: { FIcon: true } },
    });

    await wrapper.findAll("button")[2].trigger("click");

    expect(wrapper.find(".egen").text()).toBe("Adress: aktiv");
  });

  it("draws a downward chevron under the selected step when horizontal", async () => {
    const wrapper = mountIndikator();
    await setBredd(1000);
    await wrapper.findAll("button")[3].trigger("click");

    const chevron = wrapper.find(".steg-indikator__chevronplats");
    expect(chevron.find(".steg-indikator__chevronknapp").exists()).toBe(true);
    expect(chevron.attributes("style")).toContain("grid-column: 4");
  });

  it("closes the panel when the horizontal chevron is clicked", async () => {
    const wrapper = mountIndikator();
    await setBredd(1000);
    await wrapper.findAll("li button")[3].trigger("click");

    await wrapper.find(".steg-indikator__chevronknapp").trigger("click");

    expect(wrapper.find(".steg-detaljer").exists()).toBe(false);
    expect(wrapper.emitted("update:valtSteg")?.at(-1)).toEqual([null]);
  });

  it("closes the panel when the chevron next to it is clicked in vertical layout", async () => {
    const wrapper = mountIndikator({ orientering: "vertikal" });
    await setBredd(1000);
    await wrapper.findAll("li button")[1].trigger("click");

    await wrapper.find(".steg-detaljer__chevronknapp").trigger("click");

    expect(wrapper.find(".steg-detaljer").exists()).toBe(false);
  });

  describe("understeg", () => {
    const medUndersteg: Steg[] = [
      steg[0],
      {
        id: "b",
        rubrik: "Bedömning",
        understeg: [
          { id: "b1", rubrik: "Folkbokföring", status: "klar" },
          { id: "b2", rubrik: "Rätt till försäkring", status: "aktiv" },
          { id: "b3", rubrik: "Anställning", status: "kommande" },
          { id: "b4", rubrik: "Dagar kvar", status: "kommande" },
        ],
      },
      steg[2],
    ];

    it("fills the active step's circle with the share of done understeg", () => {
      const wrapper = mountIndikator({ steg: medUndersteg, aktivtSteg: 1 });
      const cirkel = wrapper.findAll(".steg-indikator__cirkel")[1];

      expect(cirkel.classes()).toContain("steg-indikator__cirkel--delvis");
      expect(cirkel.attributes("style")).toContain("--framsteg: 25%");
      expect(wrapper.findAll("li")[1].text()).toContain("1 av 4 klara");
    });

    it("does not fill the circle when no understeg is done or the step is not active", () => {
      const ingaKlara = medUndersteg.map((s) =>
        s.understeg
          ? { ...s, understeg: s.understeg.map((u) => ({ ...u, status: "kommande" as const })) }
          : s,
      );
      const aktiv = mountIndikator({ steg: ingaKlara, aktivtSteg: 1 });
      expect(aktiv.findAll(".steg-indikator__cirkel--delvis")).toHaveLength(0);

      const klar = mountIndikator({ steg: medUndersteg, aktivtSteg: 2 });
      expect(klar.findAll(".steg-indikator__cirkel--delvis")).toHaveLength(0);
    });

    it("describes steps with understeg as opening, then closing, the delsteg view", async () => {
      const wrapper = mountIndikator({ steg: medUndersteg, aktivtSteg: 1 });
      await setBredd(1000);
      const knapp = () => wrapper.findAll("li .steg-indikator__knapp")[1];
      const beskrivning = () =>
        wrapper.find(`#${knapp().attributes("aria-describedby")}`).text();

      expect(beskrivning()).toBe("Öppna vy för delsteg");

      await knapp().trigger("click");

      expect(beskrivning()).toBe("Stäng vy för delsteg");
      expect(wrapper.find(".steg-indikator__chevronplats [role='tooltip']").text()).toBe(
        "Stäng vy för delsteg",
      );
    });

    it("has no tooltip on steps without understeg", async () => {
      const wrapper = mountIndikator({ steg: medUndersteg, aktivtSteg: 1 });
      await setBredd(1000);
      const knapp = wrapper.findAll("li .steg-indikator__knapp")[0];

      expect(knapp.attributes("aria-describedby")).toBeUndefined();
      await knapp.trigger("click");
      expect(wrapper.find(".steg-indikator__chevronplats [role='tooltip']").exists()).toBe(false);
    });

    it("expands an understeg with its own understeg inline, closed by default", async () => {
      const nestad: Steg[] = [
        {
          id: "b",
          rubrik: "Bedömning",
          understeg: [
            {
              id: "m",
              rubrik: "Manuell kontroll",
              status: "aktiv",
              understeg: [
                { id: "m1", rubrik: "Komplettera", status: "klar" },
                { id: "m2", rubrik: "Bedöm", status: "aktiv" },
                { id: "m3", rubrik: "Dokumentera", status: "kommande" },
              ],
            },
          ],
        },
      ];
      const wrapper = mountIndikator({ steg: nestad, aktivtSteg: 0 });
      await setBredd(1000);
      await wrapper.findAll("li .steg-indikator__knapp")[0].trigger("click");

      const knapp = wrapper.find(".understeg__knapp");
      expect(knapp.attributes("aria-expanded")).toBe("false");
      expect(knapp.text()).toContain("1 av 3 klara");
      expect(wrapper.find(".understeg__markor--delvis").attributes("style")).toContain(
        "--framsteg: 33.3",
      );
      expect(wrapper.find(".understeg--niva-2").exists()).toBe(false);

      await knapp.trigger("click");

      expect(knapp.attributes("aria-expanded")).toBe("true");
      const inre = wrapper.find(".understeg--niva-2");
      expect(inre.attributes("id")).toBe(knapp.attributes("aria-controls"));
      expect(inre.findAll(".understeg__steg")).toHaveLength(3);
      expect(wrapper.find(`#${knapp.attributes("aria-describedby")}`).text()).toBe(
        "Stäng vy för delsteg",
      );
    });

    it("shows the description only for the active understeg", async () => {
      const medBeskrivning: Steg[] = [
        {
          id: "b",
          rubrik: "Bedömning",
          understeg: [
            { id: "b1", rubrik: "Folkbokföring", beskrivning: "Om folkbokföring", status: "klar" },
            { id: "b2", rubrik: "Anställning", beskrivning: "Om anställning", status: "aktiv" },
            { id: "b3", rubrik: "Dagar kvar", beskrivning: "Om dagar", status: "kommande" },
          ],
        },
      ];
      const wrapper = mountIndikator({ steg: medBeskrivning, aktivtSteg: 0 });
      await wrapper.findAll("li .steg-indikator__knapp")[0].trigger("click");

      const beskrivningar = wrapper.findAll(".understeg__beskrivning");
      expect(beskrivningar.map((b) => b.text())).toEqual(["Om anställning"]);
      expect(wrapper.findAll(".understeg__status").map((s) => s.text())).toEqual(["Pågår"]);
    });

    it("marks an expanded understeg as open so its chevron points up", async () => {
      const nestad: Steg[] = [
        {
          id: "b",
          rubrik: "Bedömning",
          understeg: [
            {
              id: "m",
              rubrik: "Manuell kontroll",
              status: "kommande",
              understeg: [{ id: "m1", rubrik: "Bedöm", status: "kommande" }],
            },
          ],
        },
      ];
      const wrapper = mountIndikator({ steg: nestad, aktivtSteg: 0 });
      await wrapper.findAll("li .steg-indikator__knapp")[0].trigger("click");
      const rad = () => wrapper.find(".understeg__steg");
      expect(rad().classes()).not.toContain("understeg__steg--oppen");

      await wrapper.find(".understeg__knapp").trigger("click");
      expect(rad().classes()).toContain("understeg__steg--oppen");

      await wrapper.find(".understeg__knapp").trigger("click");
      expect(rad().classes()).not.toContain("understeg__steg--oppen");
      expect(wrapper.find(".understeg--niva-2").exists()).toBe(false);
    });

    it("closes the panel when the chevron above it is clicked in compact layout", async () => {
      const wrapper = mountIndikator({
        steg: medUndersteg,
        aktivtSteg: 1,
        minStegBredd: 100,
        kompaktBredd: 300,
      });
      await setBredd(299);
      await wrapper.findAll("li .steg-indikator__knapp")[1].trigger("click");

      const chevron = wrapper.find(".steg-detaljer--pil-ned .steg-detaljer__chevronknapp");
      expect(chevron.attributes("tabindex")).toBe("-1");
      await chevron.trigger("click");

      expect(wrapper.find(".steg-detaljer").exists()).toBe(false);
    });

    it("hides the tooltip on Escape", async () => {
      vi.useFakeTimers();
      try {
        const wrapper = mountIndikator({ steg: medUndersteg, aktivtSteg: 1 });
        const tooltip = wrapper.findAll(".steg-tooltip")[1];
        const bubbla = () => tooltip.find("[role='tooltip']");
        expect((bubbla().element as HTMLElement).style.display).toBe("none");

        await tooltip.trigger("mouseenter");
        vi.advanceTimersByTime(300);
        await nextTick();
        expect((bubbla().element as HTMLElement).style.display).toBe("");

        await tooltip.trigger("keydown.esc");
        expect((bubbla().element as HTMLElement).style.display).toBe("none");
      } finally {
        vi.useRealTimers();
      }
    });

    it("hides a visible understeg tooltip on Escape without closing the panel", async () => {
      vi.useFakeTimers();
      try {
        const nestad: Steg[] = [
          {
            id: "b",
            rubrik: "Bedömning",
            understeg: [
              {
                id: "m",
                rubrik: "Manuell kontroll",
                status: "kommande",
                understeg: [{ id: "m1", rubrik: "Bedöm", status: "kommande" }],
              },
            ],
          },
        ];
        const wrapper = mountIndikator({ steg: nestad, aktivtSteg: 0 });
        await wrapper.findAll("li .steg-indikator__knapp")[0].trigger("click");
        const tooltip = wrapper.find(".understeg__tooltip");
        const knapp = wrapper.find(".understeg__knapp");

        await tooltip.trigger("mouseenter");
        vi.advanceTimersByTime(300);
        await nextTick();
        await knapp.trigger("keydown.esc");

        const bubbla = tooltip.find("[role='tooltip']").element as HTMLElement;
        expect(bubbla.style.display).toBe("none");
        expect(wrapper.find(".steg-detaljer").exists()).toBe(true);

        await knapp.trigger("keydown.esc");
        expect(wrapper.find(".steg-detaljer").exists()).toBe(false);
      } finally {
        vi.useRealTimers();
      }
    });

    it("keeps a flat process as before: no progress text, fill or tooltips", () => {
      const wrapper = mountIndikator();

      expect(wrapper.find(".steg-indikator__framsteg").exists()).toBe(false);
      expect(wrapper.find(".steg-indikator__cirkel--delvis").exists()).toBe(false);
      expect(wrapper.find("[role='tooltip']").exists()).toBe(false);
      expect(
        wrapper.findAll(".steg-indikator__knapp").filter((k) => k.attributes("aria-describedby")),
      ).toHaveLength(0);
    });

    it("lists the understeg in the panel, not before the step is opened", async () => {
      const wrapper = mountIndikator({ steg: medUndersteg, aktivtSteg: 1 });
      await setBredd(1000);
      expect(wrapper.find(".understeg").exists()).toBe(false);

      await wrapper.findAll("li button")[1].trigger("click");

      const rader = wrapper.findAll(".understeg__steg");
      expect(rader).toHaveLength(4);
      expect(rader[0].classes()).toContain("understeg__steg--klar");
      expect(rader[1].attributes("aria-current")).toBe("step");
    });
  });

  it("switches to vertical when each step gets less than the minimum width", async () => {
    const wrapper = mountIndikator({ minStegBredd: 100, kompaktBredd: 200 });

    await setBredd(400);
    expect(wrapper.classes()).toContain("steg-indikator--horisontell");

    await setBredd(399);
    expect(wrapper.classes()).toContain("steg-indikator--vertikal");
  });

  it("switches to vertical when steps are added beyond the available width", async () => {
    const wrapper = mountIndikator({ minStegBredd: 100, kompaktBredd: 200 });
    await setBredd(450);
    expect(wrapper.classes()).toContain("steg-indikator--horisontell");

    await wrapper.setProps({
      steg: [...steg, { id: "e", rubrik: "Beslut" }],
    });

    expect(wrapper.classes()).toContain("steg-indikator--vertikal");
  });

  it("draws a right-pointing chevron beside the details when vertical", async () => {
    const wrapper = mountIndikator({ orientering: "vertikal" });
    await wrapper.findAll("button")[1].trigger("click");

    expect(wrapper.find(".steg-indikator__chevronrad").exists()).toBe(false);
    const panel = wrapper.find(".steg-indikator__detaljer");
    expect(panel.classes()).toContain("steg-detaljer--pil-hoger");
    expect(panel.find("svg").exists()).toBe(true);
  });

  it("opens the details under the pressed step when too narrow for a side panel", async () => {
    const wrapper = mountIndikator({ minStegBredd: 100, kompaktBredd: 300 });
    await setBredd(299);
    expect(wrapper.classes()).toContain("steg-indikator--kompakt");

    await wrapper.findAll("button")[1].trigger("click");

    const items = wrapper.findAll("li");
    const panel = items[1].find(".steg-indikator__detaljer");
    expect(panel.exists()).toBe(true);
    expect(panel.classes()).toContain("steg-detaljer--pil-ned");
    expect(panel.text()).toContain("Om uppgifter");
    expect(wrapper.findAll(".steg-indikator__detaljer")).toHaveLength(1);
  });

  it("clears the selection when the selected step is removed", async () => {
    const wrapper = mountIndikator({ valtSteg: 3 });

    await wrapper.setProps({ steg: steg.slice(0, 2) });

    expect(wrapper.emitted("update:valtSteg")?.at(-1)).toEqual([null]);
  });
});
