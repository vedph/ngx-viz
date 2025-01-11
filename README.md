# NgxViz

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.0.7.

This is a simple Angular [viz.js](https://viz-js.com) wrapper component to render [DOT graphs](https://graphviz.org/doc/info/lang.html).

## Setup

📦 `npm i @myrmidon/ngx-viz`.

## Usage

In your component template:

```html
<div style="width: 800px; height: 600px;">
  <ngx-viz-graph [code]="graphCode" />
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

### 0.0.1

- 2025-01-11: initial commit.
