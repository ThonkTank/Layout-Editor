import { UIComponent } from "./component";

export type StatusBannerTone = "info" | "success" | "warning" | "danger";

export interface StatusBannerDetail {
    label: string;
    text: string;
}

export interface StatusBannerState {
    tone: StatusBannerTone;
    title: string;
    description?: string;
    details?: StatusBannerDetail[];
}

export class StatusBannerComponent extends UIComponent<HTMLElement> {
    private state: StatusBannerState | null;
    private hostEl: HTMLElement | null = null;
    private titleEl: HTMLElement | null = null;
    private descriptionEl: HTMLElement | null = null;
    private detailsEl: HTMLElement | null = null;
    private currentTone: StatusBannerTone | null = null;

    constructor(initialState: StatusBannerState | null = null) {
        super();
        this.state = initialState;
    }

    protected onMount(host: HTMLElement): void {
        this.clearHost(host);
        this.hostEl = host;
        host.classList.add("sm-le-status-banner");
        this.titleEl = host.createDiv({ cls: "sm-le-status-banner__title" });
        this.descriptionEl = host.createDiv({ cls: "sm-le-status-banner__description" });
        this.detailsEl = host.createEl("dl", { cls: "sm-le-status-banner__details" });
        this.syncState();
    }

    protected onDestroy(): void {
        this.hostEl = null;
        this.titleEl = null;
        this.descriptionEl = null;
        this.detailsEl = null;
        this.currentTone = null;
    }

    setState(state: StatusBannerState | null): void {
        this.state = state;
        this.syncState();
    }

    private syncState(): void {
        const host = this.hostEl;
        const title = this.titleEl;
        const description = this.descriptionEl;
        const details = this.detailsEl;
        if (!host || !title || !description || !details) {
            return;
        }

        const state = this.state;
        if (!state) {
            host.style.display = "none";
            this.clearTone();
            this.clearChildren(title);
            this.clearChildren(description);
            this.clearChildren(details);
            return;
        }

        host.style.display = "";
        this.applyTone(state.tone);

        title.setText(state.title);

        if (state.description) {
            description.setText(state.description);
            description.style.display = "";
        } else {
            this.clearChildren(description);
            description.style.display = "none";
        }

        this.clearChildren(details);
        if (state.details && state.details.length > 0) {
            for (const detail of state.details) {
                const term = details.createEl("dt", { cls: "sm-le-status-banner__detail-term" });
                term.setText(detail.label);
                const value = details.createEl("dd", { cls: "sm-le-status-banner__detail-value" });
                value.setText(detail.text);
            }
            details.style.display = "";
        } else {
            details.style.display = "none";
        }
    }

    private applyTone(tone: StatusBannerTone): void {
        const host = this.hostEl;
        if (!host) return;
        if (this.currentTone && this.currentTone !== tone) {
            host.classList.remove(`sm-le-status-banner--${this.currentTone}`);
        }
        if (!host.classList.contains(`sm-le-status-banner--${tone}`)) {
            host.classList.add(`sm-le-status-banner--${tone}`);
        }
        this.currentTone = tone;
    }

    private clearTone(): void {
        const host = this.hostEl;
        if (!host || !this.currentTone) return;
        host.classList.remove(`sm-le-status-banner--${this.currentTone}`);
        this.currentTone = null;
    }

    private clearChildren(element: HTMLElement): void {
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    }
}
