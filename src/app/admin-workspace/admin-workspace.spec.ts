import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminWorkspace } from './admin-workspace';

describe('AdminWorkspace', () => {
  let component: AdminWorkspace;
  let fixture: ComponentFixture<AdminWorkspace>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminWorkspace]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminWorkspace);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
