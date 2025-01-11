# NgxViz

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.0.7.

Usage:

```html
<div style="width: 800px; height: 600px;">
  <app-viz-graph [code]="graphCode"></app-viz-graph>
</div>
```

where `graphCode` is the code to display, e.g.:

```ts
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
