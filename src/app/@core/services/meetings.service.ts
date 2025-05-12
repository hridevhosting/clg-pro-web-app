import { Injectable } from '@angular/core';
import { NewMeetDetail } from 'src/app/shared/modals/newMeetDetail';
import { UserDetail } from 'src/app/shared/modals/userDetail';

@Injectable({
  providedIn: 'root'
})
export class MeetingsService {

  constructor() { }

  saveAndGenerateMeet(_newMeetDetail: NewMeetDetail) {
    localStorage.setItem('newMeet_' + _newMeetDetail.MeetCode, JSON.stringify(_newMeetDetail));
  }

  getMeetDetailsByMeetCode(_meetCode: string) {
    let _meetDetail = localStorage.getItem('newMeet_' + _meetCode) || null;
    return _meetDetail ? JSON.parse(_meetDetail) : null;
  }

  joinMeet(_userDetail: UserDetail, isMeetHost?: boolean) {
    _userDetail.MeetJoiningDate = new Date().toString();
    localStorage.setItem('user_' + _userDetail.ConatctNo + '_' + _userDetail.MeetCode + '_NewRequest' + (isMeetHost ? '_MeetHoster' : ''), JSON.stringify(_userDetail));
  }

  getUserDetailByContactNo(_contactNo: string) {
    let _userDetail = localStorage.getItem('user_' + _contactNo) || null;
    return _userDetail ? JSON.parse(_userDetail) : null;
  }

  checkUserCount_InMeeting(_meetCode: string) {
    debugger
    let _meetDetail: NewMeetDetail = this.getMeetDetailsByMeetCode(_meetCode) || null;
    let _meetTeamCount = 0;
    if (_meetDetail) {
      _meetTeamCount = Number(_meetDetail.MeetCandidateQuantity);
      let _localStoArray = localStorage;
      debugger
      if (localStorage.length) {
        for (let i = 0; i < localStorage.length; i++) {
          let _localItemKey = localStorage.key(i);
          debugger
          if (_localItemKey) {
            if (_localItemKey.toLowerCase().trim().includes(_meetCode)) {
              _meetTeamCount += 1;
            }
          }
        }
      }
      if (_meetTeamCount <= Number(_meetDetail.MeetCandidateQuantity)) {
        return true;
      } else {
        return false;
      }
    } else {
      return false
    }

  }

}
