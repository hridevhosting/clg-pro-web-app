import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { CommonModule, HashLocationStrategy, LocationStrategy } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { LoginModule } from './@core/components/login/login.module';
import { DashboardModule } from './@core/components/dashboard/dashboard.module';
import { MeetingsModule } from './@core/components/meetings/meetings.module';
import { CabinMeetingComponent } from './@core/components/cabin-meeting/cabin-meeting.component';

@NgModule({
  declarations: [
    AppComponent,
    CabinMeetingComponent
  ],
  imports: [
    CommonModule,
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    DashboardModule,
    MeetingsModule
  ],
  providers: [
    { provide: LocationStrategy, useClass: HashLocationStrategy },
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
