import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ClassRoomRoutingModule } from './class-room-routing.module';
import { ClassroomComponent } from './class-room.component';


@NgModule({
  declarations: [
    ClassroomComponent
  ],
  imports: [
    CommonModule,
    ClassRoomRoutingModule
  ]
})
export class ClassRoomModule { }
