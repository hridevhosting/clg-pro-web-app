import { Component, OnInit } from '@angular/core';
import { MeetingsService } from '../../services/meetings.service';
import { NewMeetDetail } from 'src/app/shared/modals/newMeetDetail';
import { ActivatedRoute, Router } from '@angular/router';
import { UserDetail } from 'src/app/shared/modals/userDetail';

@Component({
  selector: 'app-meetings',
  templateUrl: './meetings.component.html',
  styleUrls: ['./meetings.component.scss']
})
export class MeetingsComponent implements OnInit {

  constructor(
    private _meetingServices: MeetingsService,
    private _activeRoute: ActivatedRoute,
    private _router: Router
  ) { }

  ngOnInit(): void {
    this._activeRoute.queryParams.subscribe(
      (res: any) => {
        if (res['meetId']) {
          this.loadMeetDetailsByMeetingCode(res['meetId']);
        }
      }
    )
  }

  meetingDetails: NewMeetDetail = new NewMeetDetail();

  loadMeetDetailsByMeetingCode(_meetId: string) {
    this.meetingDetails = this._meetingServices.getMeetDetailsByMeetCode(_meetId);
    if (this.meetingDetails.MeetCode) {
      this.loadUserList();
    }
  }

  userList: UserDetail[] = [];
  loadUserList() {
    let _localStoArray = localStorage;
    if (_localStoArray.length) {
      debugger
      for (let i = 0; i < localStorage.length; i++) {
        let _key = localStorage.key(i);
        if (_key?.toLowerCase().includes('user')) {
          let _userDetails: any = localStorage.getItem(_key);
          if (_userDetails) {
            _userDetails = JSON.parse(_userDetails);
            this.userList.push(_userDetails);
          }
        }
      }
    }
  }

  leaveMeeting(){
    // localStorage.removeItem('user');
    this._router.navigate(['dashboard']);
  }


}
