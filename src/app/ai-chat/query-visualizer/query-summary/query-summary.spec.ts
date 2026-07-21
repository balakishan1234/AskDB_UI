import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuerySummary } from './query-summary';

describe('QuerySummary', () => {
  let component: QuerySummary;
  let fixture: ComponentFixture<QuerySummary>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuerySummary]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QuerySummary);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
