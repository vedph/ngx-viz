import { Component } from '@angular/core';

import { VizComponent } from '../../projects/myrmidon/ngx-viz/src/public-api';

@Component({
  selector: 'app-root',
  imports: [VizComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  code = `
      digraph {
      A -> B;
      B -> C;
      C -> A;
    }
`;
}
