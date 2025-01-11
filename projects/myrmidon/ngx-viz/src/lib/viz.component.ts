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

@Component({
  selector: 'ngx-viz',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="viz-container">
      <div #graphContainer></div>
      <div *ngIf="error()" class="error-message">
        {{ error() }}
      </div>
      <div *ngIf="loading()" class="loading">Loading...</div>
    </div>
  `,
  styles: [
    `
      .viz-container {
        width: 100%;
        height: 100%;
        position: relative;
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
    `,
  ],
})
export class VizComponent implements OnInit {
  @ViewChild('graphContainer') graphContainer!: ElementRef;

  public readonly code = input<string>();
  public readonly error = signal<string | null>(null);
  public readonly loading = signal<boolean>(false);

  private vizPromise: Promise<void> | null = null;

  constructor() {
    effect(() => {
      // Trigger render when code changes
      if (this.code()) {
        this.checkAndRender();
      }
    });
  }

  ngOnInit() {
    this.initViz();
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

      // Make SVG responsive
      const svg = this.graphContainer.nativeElement.querySelector('svg');
      if (svg) {
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      }
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : 'Error rendering graph');
    }
  }
}
