import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SqlWarningPopup } from './sql-warning-popup';

describe('SqlWarningPopup', () => {
  let component: SqlWarningPopup;
  let fixture: ComponentFixture<SqlWarningPopup>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SqlWarningPopup]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SqlWarningPopup);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
