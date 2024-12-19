class ZoomService {
  private static instance: ZoomService;
  private _currentZoom: string = '1';

  static getInstance() {
    if (!ZoomService.instance) {
      ZoomService.instance = new ZoomService();
    }
    return ZoomService.instance;
  }

  get currentZoom(): string {
    return this._currentZoom;
  }

  setZoom(zoom: string) {
    this._currentZoom = zoom;
    const elements = document.querySelectorAll('.template-buttons');
    elements.forEach((el) => {
      if (el instanceof HTMLElement) {
        this.updateElementPosition(el, zoom);
      }
    });
  }

  private updateElementPosition(element: HTMLElement, zoom: string) {
    type ZoomLevel = '0.5' | '0.75' | '1' | '1.4' | '1.5' | '2';

    const tailwindPositions: Record<ZoomLevel, string> = {
      '0.5': '-translate-x-0',
      '0.75': '-translate-x-[45%]',
      '1': '-translate-x-[60%]',
      '1.4': '-translate-x-[120%]',
      '1.5': '-translate-x-[140%]',
      '2': '-translate-x-[300%]',
    };

    element.classList.remove(
      ...Array.from(element.classList).filter((c) =>
        c.startsWith('-translate-x-'),
      ),
    );

    if (window.matchMedia('(max-width: 1280px)').matches) {
      return;
    }

    if (zoom in tailwindPositions) {
      element.classList.add(tailwindPositions[zoom as ZoomLevel]);
    }
  }
}

export const zoomService = ZoomService.getInstance();
