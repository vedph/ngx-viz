# NgxViz

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.0.7.

This is a simple Angular [viz.js](https://viz-js.com) wrapper component to render [DOT graphs](https://graphviz.org/doc/info/lang.html).

## Setup

📦 `npm i @myrmidon/ngx-viz`.

## Usage

In your component template:

```html
<div style="width: 800px; height: 600px;">
  <ngx-viz [code]="graphCode" />
</div>
```

where `graphCode` is the code to display, e.g.:

```ts
@Component({
  // ...
  imports: [
    VizComponent
  ]
  // ...
})
export class YourComponent {
  graphCode = `
    digraph {
      A -> B;
      B -> C;
      C -> A;
    }
  `;
}
```

## History

- 2025-07-12: updated Angular and packages.

### 1.0.0

- 2025-07-03: ⚠️ updated to Angular 20.

### 0.0.3

- 2025-01-12: refactored script loading for Viz to handle the case where AMD module might already be present and prevent duplicate script loading.

### 0.0.2

- 2025-01-12: refactored script loading for Viz.

### 0.0.1

- 2025-01-11: initial commit.
