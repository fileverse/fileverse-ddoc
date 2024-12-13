type ZoomCallback = (zoomLevel: string) => void;

export class ZoomService {
  private static instance: ZoomService;
  private callbacks: ZoomCallback[] = [];

  static getInstance() {
    if (!ZoomService.instance) {
      ZoomService.instance = new ZoomService();
    }
    return ZoomService.instance;
  }

  subscribe(callback: ZoomCallback) {
    this.callbacks.push(callback);
    return () => {
      this.callbacks = this.callbacks.filter(cb => cb !== callback);
    };
  }

  updateZoomLevel(zoomLevel: string) {
    this.callbacks.forEach(callback => callback(zoomLevel));
  }
}

export const zoomService = ZoomService.getInstance();