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

// declare const Viz: any;

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

  ngOnInit() {
    this.initViz();
  }

  fitToContainer() {
    if (!this.graphContainer || !this._originalViewBox) return;

    const container = this.container.nativeElement;
    const containerRect = container.getBoundingClientRect();
    const { width: svgWidth, height: svgHeight } = this._originalViewBox;

    // Get the bounding box of the graph elements
    const svg = this.graphContainer.nativeElement.querySelector('svg');
    const graphBoundingBox = svg.getBBox();

    // Account for potential invisible elements by expanding the bounding box
    const expandedBoundingBox = {
      x: graphBoundingBox.x - 20, // Adjust as needed
      y: graphBoundingBox.y - 30, // Adjust as needed
      width: graphBoundingBox.width + 40, // Adjust as needed
      height: graphBoundingBox.height + 60, // Increase vertical margin to 60
    };

    // Calculate padding based on expanded bounding box
    const paddingX = Math.max(expandedBoundingBox.width / 10, 10); // Adjust as needed
    const paddingY = Math.max(expandedBoundingBox.height / 10, 10); // Adjust as needed

    // Calculate scale to fit the graph within the container, considering padding
    const scaleX =
      (containerRect.width - 2 * paddingX) /
      (expandedBoundingBox.width + 2 * paddingX);
    const scaleY =
      (containerRect.height - 2 * paddingY) /
      (expandedBoundingBox.height + 2 * paddingY);
    const scale = Math.min(scaleX, scaleY);

    // Calculate center position based on the expanded bounding box
    const x =
      (containerRect.width -
        (expandedBoundingBox.width + expandedBoundingBox.x) * scale) /
      2;
    const y =
      (containerRect.height -
        (expandedBoundingBox.height + expandedBoundingBox.y) * scale) /
      2;

    // Apply transform with animation
    this._transform.set({ x, y, scale });
    this.applyTransform(true);
  }

  zoomIn() {
    this.updateZoom(this._transform().scale + this.ZOOM_SPEED);
  }

  zoomOut() {
    this.updateZoom(this._transform().scale - this.ZOOM_SPEED);
  }

  resetView() {
    this._transform.set({ x: 0, y: 0, scale: 1 });
    this.applyTransform();
  }

  private updateZoom(newScale: number) {
    const scale = Math.max(this.MIN_SCALE, Math.min(this.MAX_SCALE, newScale));
    this._transform.update((t) => ({ ...t, scale }));
    this.applyTransform();
  }

  // Mouse Event Handlers
  onWheel(event: WheelEvent) {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -this.ZOOM_SPEED : this.ZOOM_SPEED;
    this.updateZoom(this._transform().scale + delta);
  }

  onMouseDown(event: MouseEvent) {
    this._isDragging = true;
    this._lastPosition = { x: event.clientX, y: event.clientY };
  }

  onMouseMove(event: MouseEvent) {
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

  onMouseUp() {
    this._isDragging = false;
  }

  private applyTransform(animate: boolean = false) {
    if (!this.graphContainer) return;

    const svg = this.graphContainer.nativeElement.querySelector('svg');
    if (!svg) return;

    const { x, y, scale } = this._transform();
    const transform = `translate(${x}px, ${y}px) scale(${scale})`;

    if (animate) {
      svg.style.transition = 'transform 0.3s ease-out';
      // Remove transition after animation
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
    // Get original viewBox or computed size
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
      script.src = 'https://unpkg.com/viz.js@2.1.2/viz.js';
      script.onerror = () => reject(new Error('Failed to load Viz.js'));

      script.onload = () => {
        const renderScript = document.createElement('script');
        renderScript.src = 'https://unpkg.com/viz.js@2.1.2/full.render.js';
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

      // Clear previous content
      this.graphContainer.nativeElement.innerHTML = '';

      // Add new SVG
      this.graphContainer.nativeElement.appendChild(result);

      // Store original viewBox and prepare SVG
      const svg = this.graphContainer.nativeElement.querySelector('svg');
      if (svg) {
        this.storeOriginalViewBox(svg);
        svg.style.transition = 'transform 0.3s ease-out';
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      }

      // Fit to container after rendering
      this.fitToContainer();
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : 'Error rendering graph');
    }
  }
}
