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

    const chevron = wrapper.find(".steg-indikator__chevronrad svg");
    expect(chevron.exists()).toBe(true);
    expect(chevron.attributes("style")).toContain("grid-column: 4");
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
