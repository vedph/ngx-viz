import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VizComponent } from './viz.component';

describe('NgxVizComponent', () => {
  let component: VizComponent;
  let fixture: ComponentFixture<VizComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VizComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(VizComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
