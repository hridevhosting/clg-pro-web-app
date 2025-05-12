import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './@core/components/login/login.component';
import { DashboardComponent } from './@core/components/dashboard/dashboard.component';
import { MeetingsComponent } from './@core/components/meetings/meetings.component';
import { ClassroomComponent } from './@core/components/class-room/class-room.component';
import { CabinMeetingComponent } from './@core/components/cabin-meeting/cabin-meeting.component';

const routes: Routes = [
  {
    path: '', redirectTo: 'login', pathMatch: 'full'
  },
  {
    path: 'login', component:LoginComponent,
  },
  {
    path: 'dashboard', component:DashboardComponent,
  },
  {
    path: 'meeting', component:MeetingsComponent,
  },
  {
    path: 'class-room', component:ClassroomComponent,
  },
  {
    path: 'cabin-meeting', component:CabinMeetingComponent,
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
