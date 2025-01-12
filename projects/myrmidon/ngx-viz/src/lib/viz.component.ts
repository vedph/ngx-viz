import {
  Component,
  OnInit,
  ElementRef,
  ViewChild,
  effect,
  signal,
  input,
} from '@angular/core';
import { CommonModule } from '@angular/common';

interface Transform {
  x: number;
  y: number;
  scale: number;
}

interface ViewBox {
  width: number;
  height: number;
  x: number;
  y: number;
}

const VIZ_URL = 'https://unpkg.com/viz.js@2.1.2/viz.js';
const RENDER_URL = 'https://unpkg.com/viz.js@2.1.2/full.render.js';

/**
 * Wrapper for Viz.js library to render DOT graphs in Angular.
 */
@Component({
  selector: 'ngx-viz',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './viz.component.html',
  styleUrl: './viz.component.css',
})
export class VizComponent implements OnInit {
  private readonly ZOOM_SPEED = 0.1;
  private readonly MIN_SCALE = 0.1;
  private readonly MAX_SCALE = 5;

  private readonly _transform = signal<Transform>({ x: 0, y: 0, scale: 1 });
  private _vizPromise: Promise<void> | null = null;
  private _isDragging = false;
  private _lastPosition = { x: 0, y: 0 };
  private _originalViewBox: ViewBox | null = null;

  @ViewChild('graphContainer') graphContainer!: ElementRef;
  @ViewChild('container') container!: ElementRef;

  /**
   * DOT code to render as a graph.
   */
  public readonly code = input<string>('');

  public readonly error = signal<string | null>(null);
  public readonly loading = signal<boolean>(false);

  constructor() {
    effect(() => {
      if (this.code()) {
        this.checkAndRender();
      }
    });
  }

  public ngOnInit() {
    this.initViz();
  }

  // #region Viewport and Zoom
  public fitToContainer() {
    if (!this.graphContainer || !this._originalViewBox) return;

    const container = this.container.nativeElement;
    const containerRect = container.getBoundingClientRect();

    // get the bounding box of the graph elements
    const svg = this.graphContainer.nativeElement.querySelector('svg');
    const graphBoundingBox = svg.getBBox();

    // account for potential invisible elements by expanding the bounding box
    const expandedBoundingBox = {
      x: graphBoundingBox.x - 20,
      y: graphBoundingBox.y - 30,
      width: graphBoundingBox.width + 40,
      height: graphBoundingBox.height + 60,
    };

    // calculate padding based on expanded bounding box
    const paddingX = Math.max(expandedBoundingBox.width / 10, 10);
    const paddingY = Math.max(expandedBoundingBox.height / 10, 10);

    // calculate scale to fit the graph within the container, considering padding
    const scaleX =
      (containerRect.width - 2 * paddingX) /
      (expandedBoundingBox.width + 2 * paddingX);
    const scaleY =
      (containerRect.height - 2 * paddingY) /
      (expandedBoundingBox.height + 2 * paddingY);
    const scale = Math.min(scaleX, scaleY);

    // calculate center position based on the expanded bounding box
    const x =
      (containerRect.width -
        (expandedBoundingBox.width + expandedBoundingBox.x) * scale) /
      2;
    const y =
      (containerRect.height -
        (expandedBoundingBox.height + expandedBoundingBox.y) * scale) /
      2;

    // apply transform with animation
    this._transform.set({ x, y, scale });
    this.applyTransform(true);
  }

  public zoomIn() {
    this.updateZoom(this._transform().scale + this.ZOOM_SPEED);
  }

  public zoomOut() {
    this.updateZoom(this._transform().scale - this.ZOOM_SPEED);
  }

  public resetView() {
    this._transform.set({ x: 0, y: 0, scale: 1 });
    this.applyTransform();
  }

  private updateZoom(newScale: number) {
    const scale = Math.max(this.MIN_SCALE, Math.min(this.MAX_SCALE, newScale));
    this._transform.update((t) => ({ ...t, scale }));
    this.applyTransform();
  }
  //#endregion

  //#region Mouse Events
  public onWheel(event: WheelEvent) {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -this.ZOOM_SPEED : this.ZOOM_SPEED;
    this.updateZoom(this._transform().scale + delta);
  }

  public onMouseDown(event: MouseEvent) {
    this._isDragging = true;
    this._lastPosition = { x: event.clientX, y: event.clientY };
  }

  public onMouseMove(event: MouseEvent) {
    if (!this._isDragging) return;

    const dx = event.clientX - this._lastPosition.x;
    const dy = event.clientY - this._lastPosition.y;

    this._transform.update((t) => ({
      ...t,
      x: t.x + dx,
      y: t.y + dy,
    }));

    this._lastPosition = { x: event.clientX, y: event.clientY };
    this.applyTransform();
  }

  public onMouseUp() {
    this._isDragging = false;
  }
  //#endregion

  private applyTransform(animate: boolean = false) {
    if (!this.graphContainer) return;

    const svg = this.graphContainer.nativeElement.querySelector('svg');
    if (!svg) return;

    const { x, y, scale } = this._transform();
    const transform = `translate(${x}px, ${y}px) scale(${scale})`;

    if (animate) {
      svg.style.transition = 'transform 0.3s ease-out';
      // remove transition after animation
      setTimeout(() => {
        svg.style.transition = 'none';
      }, 300);
    } else {
      svg.style.transition = 'none';
    }

    svg.style.transform = transform;
    svg.style.transformOrigin = 'center';
  }

  private storeOriginalViewBox(svg: SVGElement) {
    // get original viewBox or computed size
    const viewBox = svg.getAttribute('viewBox');
    if (viewBox) {
      const [x, y, width, height] = viewBox.split(' ').map(Number);
      this._originalViewBox = { x, y, width, height };
    } else {
      const rect = svg.getBoundingClientRect();
      this._originalViewBox = {
        x: 0,
        y: 0,
        width: rect.width,
        height: rect.height,
      };
    }
  }

  private initViz(): Promise<void> {
    if (this._vizPromise) {
      return this._vizPromise;
    }

    this._vizPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = VIZ_URL;
      script.onerror = () => reject(new Error('Failed to load Viz.js'));

      script.onload = () => {
        const renderScript = document.createElement('script');
        renderScript.src = RENDER_URL;
        renderScript.onerror = () =>
          reject(new Error('Failed to load Viz.js renderer'));

        renderScript.onload = () => {
          resolve();
        };

        document.head.appendChild(renderScript);
      };

      document.head.appendChild(script);
    });

    return this._vizPromise;
  }

  private async checkAndRender() {
    this.loading.set(true);
    this.error.set(null);

    try {
      await this.initViz();
      await this.renderGraph();
    } catch (e) {
      this.error.set(
        e instanceof Error ? e.message : 'Error initializing or rendering graph'
      );
      console.error('Viz.js error:', e);
    } finally {
      this.loading.set(false);
    }
  }

  private async renderGraph(): Promise<void> {
    if (!this.graphContainer) return;

    try {
      const viz = new (window as any).Viz();

      const result = await viz.renderSVGElement(this.code());

      // clear previous content
      this.graphContainer.nativeElement.innerHTML = '';

      // add new SVG
      this.graphContainer.nativeElement.appendChild(result);

      // store original viewBox and prepare SVG
      const svg = this.graphContainer.nativeElement.querySelector('svg');
      if (svg) {
        this.storeOriginalViewBox(svg);
        svg.style.transition = 'transform 0.3s ease-out';
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      }

      // fit to container after rendering
      this.fitToContainer();
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : 'Error rendering graph');
    }
  }

  /**
   * Exports the rendered graph as an SVG file.
   */
  public exportSVG() {
    const svgElement = this.graphContainer.nativeElement.querySelector('svg');
    if (svgElement) {
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svgElement);
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'graph.svg';
      a.click();
      URL.revokeObjectURL(url);
    }
  }
}
