import {
  Component,
  Input,
  OnInit,
  ElementRef,
  ViewChild,
  effect,
  signal,
  input,
} from '@angular/core';
import { CommonModule } from '@angular/common';

declare const Viz: any;

interface Transform {
  x: number;
  y: number;
  scale: number;
}

@Component({
  selector: 'ngx-viz',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="viz-container"
      #container
      (wheel)="onWheel($event)"
      (mousedown)="onMouseDown($event)"
      (mousemove)="onMouseMove($event)"
      (mouseup)="onMouseUp()"
      (mouseleave)="onMouseUp()"
    >
      <div #graphContainer></div>
      <div *ngIf="error()" class="error-message">
        {{ error() }}
      </div>
      <div *ngIf="loading()" class="loading">Loading...</div>
      <div class="zoom-controls">
        <button (click)="zoomIn()" class="zoom-btn">+</button>
        <button (click)="zoomOut()" class="zoom-btn">-</button>
        <button (click)="resetView()" class="zoom-btn">Reset</button>
      </div>
    </div>
  `,
  styles: [
    `
      .viz-container {
        width: 100%;
        height: 100%;
        position: relative;
        overflow: hidden;
        cursor: grab;
      }
      .viz-container:active {
        cursor: grabbing;
      }
      .viz-container > div:first-child {
        width: 100%;
        height: 100%;
      }
      .viz-container svg {
        width: 100%;
        height: 100%;
        max-width: 100%;
      }
      .error-message {
        color: red;
        padding: 1rem;
      }
      .loading {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
      }
      .zoom-controls {
        position: absolute;
        bottom: 1rem;
        right: 1rem;
        display: flex;
        gap: 0.5rem;
        background: rgba(255, 255, 255, 0.8);
        padding: 0.5rem;
        border-radius: 0.5rem;
      }
      .zoom-btn {
        width: 2rem;
        height: 2rem;
        border: 1px solid #ccc;
        background: white;
        border-radius: 0.25rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .zoom-btn:hover {
        background: #f0f0f0;
      }
    `,
  ],
})
export class VizComponent implements OnInit {
  @ViewChild('graphContainer') graphContainer!: ElementRef;
  @ViewChild('container') container!: ElementRef;

  public readonly code = input<string>('');
  public readonly error = signal<string | null>(null);
  public readonly loading = signal<boolean>(false);

  private readonly transform = signal<Transform>({ x: 0, y: 0, scale: 1 });
  private vizPromise: Promise<void> | null = null;
  private isDragging = false;
  private lastPosition = { x: 0, y: 0 };
  private readonly ZOOM_SPEED = 0.1;
  private readonly MIN_SCALE = 0.1;
  private readonly MAX_SCALE = 5;

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

  // Zoom Controls
  zoomIn() {
    this.updateZoom(this.transform().scale + this.ZOOM_SPEED);
  }

  zoomOut() {
    this.updateZoom(this.transform().scale - this.ZOOM_SPEED);
  }

  resetView() {
    this.transform.set({ x: 0, y: 0, scale: 1 });
    this.applyTransform();
  }

  private updateZoom(newScale: number) {
    const scale = Math.max(this.MIN_SCALE, Math.min(this.MAX_SCALE, newScale));
    this.transform.update((t) => ({ ...t, scale }));
    this.applyTransform();
  }

  // Mouse Event Handlers
  onWheel(event: WheelEvent) {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -this.ZOOM_SPEED : this.ZOOM_SPEED;
    this.updateZoom(this.transform().scale + delta);
  }

  onMouseDown(event: MouseEvent) {
    this.isDragging = true;
    this.lastPosition = { x: event.clientX, y: event.clientY };
  }

  onMouseMove(event: MouseEvent) {
    if (!this.isDragging) return;

    const dx = event.clientX - this.lastPosition.x;
    const dy = event.clientY - this.lastPosition.y;

    this.transform.update((t) => ({
      ...t,
      x: t.x + dx,
      y: t.y + dy,
    }));

    this.lastPosition = { x: event.clientX, y: event.clientY };
    this.applyTransform();
  }

  onMouseUp() {
    this.isDragging = false;
  }

  private applyTransform() {
    if (!this.graphContainer) return;

    const svg = this.graphContainer.nativeElement.querySelector('svg');
    if (!svg) return;

    const { x, y, scale } = this.transform();
    const transform = `translate(${x}px, ${y}px) scale(${scale})`;
    svg.style.transform = transform;
    svg.style.transformOrigin = 'center';
  }

  private initViz(): Promise<void> {
    if (this.vizPromise) {
      return this.vizPromise;
    }

    this.vizPromise = new Promise<void>((resolve, reject) => {
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

    return this.vizPromise;
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

      // Make SVG responsive and prepare for transforms
      const svg = this.graphContainer.nativeElement.querySelector('svg');
      if (svg) {
        svg.style.transition = 'transform 0.1s';
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      }

      // Reset transform when new graph is rendered
      this.resetView();
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : 'Error rendering graph');
    }
  }
}
