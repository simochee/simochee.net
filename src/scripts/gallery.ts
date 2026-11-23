customElements.define(
  "gallery-viewer",
  class extends HTMLElement {
    #index = 0;

    get #thumbs() {
      return [...this.querySelectorAll<HTMLAnchorElement>("ul a[data-src]")];
    }
    #part<T extends HTMLElement>(name: string) {
      return this.querySelector<T>(`:scope > div [data-${name}]`)!;
    }

    connectedCallback() {
      this.#part("controls").hidden = false;
      this.addEventListener("click", this);
      this.#select(this.#index);
    }
    disconnectedCallback() {
      this.removeEventListener("click", this);
    }
    handleEvent(event: Event) {
      const target = event.target as Element;
      const step = target.closest<HTMLElement>("[data-step]");
      if (step) {
        this.#select(this.#index + Number(step.dataset.step));
        return;
      }
      const thumb = target.closest<HTMLAnchorElement>("ul a[data-src]");
      const { ctrlKey, metaKey, shiftKey, altKey, button } = event as MouseEvent;
      if (!thumb || ctrlKey || metaKey || shiftKey || altKey || button) return;
      event.preventDefault();
      this.#select(this.#thumbs.indexOf(thumb));
    }

    #select(index: number) {
      const thumbs = this.#thumbs;
      const thumb = thumbs[index];
      if (!thumb) return;
      this.#index = index;
      for (const other of thumbs) other.ariaCurrent = other === thumb ? "true" : null;
      const image = this.#part<HTMLImageElement>("image");
      image.src = thumb.dataset.src!;
      image.srcset = thumb.dataset.srcset!;
      image.width = Number(thumb.dataset.width);
      image.height = Number(thumb.dataset.height);
      image.alt = thumb.dataset.caption!;
      this.#part("caption").textContent = thumb.dataset.caption!;
      this.#part("date").textContent = thumb.dataset.date!;
      const post = this.#part<HTMLAnchorElement>("post");
      post.href = thumb.href;
      post.textContent = thumb.dataset.title!;
      this.#part("position").textContent = String(index + 1);
      const [previous, next] = this.querySelectorAll<HTMLButtonElement>("[data-step]");
      previous!.disabled = index === 0;
      next!.disabled = index === thumbs.length - 1;
    }
  },
);
