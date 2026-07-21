import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AIChat } from './ai-chat';

describe('AIChat', () => {
  let component: AIChat;
  let fixture: ComponentFixture<AIChat>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AIChat]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AIChat);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
