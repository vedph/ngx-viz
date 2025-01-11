import { Component } from '@angular/core';

import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatInput, MatLabel } from '@angular/material/input';

import { VizComponent } from '../../projects/myrmidon/ngx-viz/src/public-api';

@Component({
  selector: 'app-root',
  imports: [
    ReactiveFormsModule,
    MatButton,
    MatFormField,
    MatLabel,
    MatInput,
    VizComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  public code = `digraph {
  A -> B;
  B -> C;
  C -> A;
}`;
  public codeInput: FormControl<string> = new FormControl<string>(this.code, {
    validators: Validators.required,
    nonNullable: true,
  });
  public form: FormGroup = new FormGroup({
    code: this.codeInput,
  });

  public setCode(): void {
    if (this.form.invalid) {
      return;
    }
    this.code = this.codeInput.value;
  }
}
