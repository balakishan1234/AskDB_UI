import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WorkspaceRegistration } from './workspace-registration';

describe('WorkspaceRegistration', () => {
  let component: WorkspaceRegistration;
  let fixture: ComponentFixture<WorkspaceRegistration>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkspaceRegistration]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WorkspaceRegistration);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
