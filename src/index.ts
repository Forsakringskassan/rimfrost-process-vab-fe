import type { App } from "vue";
import { ValidationPlugin } from "@fkui/vue";
import { createApp } from "vue";
import AppComponent from "./App.vue";
import "./style.css";

export function init(mount: string | Element, params?: { handlaggningId?: string | null; aktivitetId?: string | null }): App {
    const container = typeof mount === "string" ? document.querySelector(mount) : mount;

    if (!container) {
        throw new Error(`Could not find element with selector "${mount}"`);
    }

    container.addEventListener("component-validity", (e) => e.stopPropagation());
    container.addEventListener("component-unmount", (e) => e.stopPropagation());

    const app = createApp(AppComponent, {
        handlaggningId: params?.handlaggningId ?? null,
        aktivitetId: params?.aktivitetId ?? null,
    });
    app.use(ValidationPlugin);
    app.mount(container);
    return app;
}