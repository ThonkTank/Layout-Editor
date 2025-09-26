import {
    createElementsButton,
    createElementsField,
    createElementsStack,
    createElementsStatus,
    type ElementsButtonOptions,
    type ElementsFieldOptions,
    type ElementsFieldResult,
    type ElementsStackOptions,
    type ElementsStatusOptions,
} from "../../elements/ui";
import { UIComponent } from "./component";

export interface ButtonComponentOptions extends Omit<ElementsButtonOptions, "onClick"> {
    onClick?: (event: MouseEvent) => void;
}

export class ButtonComponent extends UIComponent<HTMLElement> {
    private buttonEl: HTMLButtonElement | null = null;

    constructor(private options: ButtonComponentOptions) {
        super();
    }

    protected onMount(host: HTMLElement): void {
        this.clearHost(host);
        const { onClick, ...rest } = this.options;
        const button = createElementsButton(host, rest as ElementsButtonOptions);
        this.buttonEl = button;
        const handler = (event: MouseEvent) => {
            this.options.onClick?.(event);
        };
        this.listen(button, "click", handler as EventListener);
        if (onClick) {
            this.options.onClick = onClick;
        }
    }

    protected onDestroy(): void {
        this.buttonEl = null;
    }

    get element(): HTMLButtonElement {
        if (!this.buttonEl) {
            throw new Error("ButtonComponent is not mounted");
        }
        return this.buttonEl;
    }

    setDisabled(disabled: boolean): void {
        const el = this.buttonEl;
        if (!el) return;
        el.disabled = disabled;
    }

    setLabel(label: string): void {
        this.options.label = label;
        const el = this.buttonEl;
        if (!el) return;
        if (this.options.icon) {
            const labelSpan = el.querySelector<HTMLElement>(".sm-elements-button__label");
            if (labelSpan) {
                labelSpan.setText(label);
            }
        } else {
            el.setText(label);
        }
    }

    setOnClick(onClick: ((event: MouseEvent) => void) | undefined): void {
        this.options.onClick = onClick;
    }
}

export class FieldComponent extends UIComponent<HTMLElement> {
    private result: ElementsFieldResult | null = null;

    constructor(private options: ElementsFieldOptions) {
        super();
    }

    protected onMount(host: HTMLElement): void {
        this.clearHost(host);
        this.result = createElementsField(host, this.options);
    }

    protected onDestroy(): void {
        this.result = null;
    }

    get field(): ElementsFieldResult {
        if (!this.result) {
            throw new Error("FieldComponent is not mounted");
        }
        return this.result;
    }

    setDescription(description: string | null): void {
        if (!this.result) return;
        this.options.description = description ?? undefined;
        if (description) {
            if (!this.result.descriptionEl) {
                this.result.descriptionEl = this.result.fieldEl.createDiv({
                    cls: "sm-elements-field__description",
                    text: description,
                });
            } else {
                this.result.descriptionEl.setText(description);
            }
        } else if (this.result.descriptionEl) {
            this.result.descriptionEl.remove();
            this.result.descriptionEl = undefined;
        }
    }
}

export class StackComponent extends UIComponent<HTMLElement> {
    private stackEl: HTMLElement | null = null;

    constructor(private options: ElementsStackOptions = {}) {
        super();
    }

    protected onMount(host: HTMLElement): void {
        this.clearHost(host);
        this.stackEl = createElementsStack(host, this.options);
    }

    protected onDestroy(): void {
        this.stackEl = null;
    }

    get element(): HTMLElement {
        if (!this.stackEl) {
            throw new Error("StackComponent is not mounted");
        }
        return this.stackEl;
    }
}

export class StatusComponent extends UIComponent<HTMLElement> {
    private statusEl: HTMLElement | null = null;

    constructor(private options: ElementsStatusOptions) {
        super();
    }

    protected onMount(host: HTMLElement): void {
        this.clearHost(host);
        this.statusEl = createElementsStatus(host, this.options);
    }

    protected onDestroy(): void {
        this.statusEl = null;
    }

    get element(): HTMLElement {
        if (!this.statusEl) {
            throw new Error("StatusComponent is not mounted");
        }
        return this.statusEl;
    }

    setText(text: string): void {
        this.options.text = text;
        this.statusEl?.setText(text);
    }

    setTone(tone: ElementsStatusOptions["tone"]): void {
        const el = this.statusEl;
        if (!el) return;
        if (this.options.tone) {
            el.removeClass(`sm-elements-status--${this.options.tone}`);
        }
        this.options.tone = tone;
        el.addClass(`sm-elements-status--${tone}`);
    }
}
