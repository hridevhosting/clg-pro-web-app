import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CabinMeetingComponent } from './cabin-meeting.component';

describe('CabinMeetingComponent', () => {
  let component: CabinMeetingComponent;
  let fixture: ComponentFixture<CabinMeetingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CabinMeetingComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CabinMeetingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
