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
      elements.forEach(el => {
        if (el instanceof HTMLElement) {
          this.updateElementPosition(el, zoom);
        }
      });
  }

  private updateElementPosition(element: HTMLElement, zoom: string) {
    type ZoomLevel = '0.5' | '0.75' | '1' | '1.4' | '1.5' | '2';
    
    const positions: Record<ZoomLevel, string> = {
      '0.5': '0',
      '0.75': '-45%',
      '1': '-60%',
      '1.4': '-120%',
      '1.5': '-140%',
      '2': '-300%'
    };
    
    if (window.matchMedia('(min-width: 768px)').matches) {
      element.style.transform = `translateX(${positions[zoom as ZoomLevel] || '-60%'})`;
    }
  }
}

export const zoomService = ZoomService.getInstance();