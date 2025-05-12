import { Component, ElementRef, HostListener, OnChanges, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { MeetingsService } from '../../services/meetings.service';
import { NewMeetDetail } from 'src/app/shared/modals/newMeetDetail';
import { ActivatedRoute, Router } from '@angular/router';
import { UserDetail } from 'src/app/shared/modals/userDetail';
import { SeatDetail } from 'src/app/shared/modals/seatDetail';

@Component({
  selector: 'app-meetings',
  templateUrl: './meetings.component.html',
  styleUrls: ['./meetings.component.scss']
})
export class MeetingsComponent implements OnInit, OnChanges {
  @ViewChild('videoElement', { static: false }) videoElement!: ElementRef;
  stream!: MediaStream;
  @HostListener('window:keydown', ['$event'])
  onKeyPress(event: KeyboardEvent) {
    switch (event.key) {
      case 'Enter':
        this.setUserInVacantSeat()
        break;
      case 'ArrowDown':
        break;
      case 'ArrowLeft':
        this.filterPreviousVacantSeat()
        break;
      case 'ArrowRight':
        this.filterNextVacantSeat();
        break;
      default:
      // console.log('');
    }
  }

  // @HostListener('window:keydown', ['$event'])
  // handleKeyDown(event: KeyboardEvent) {
  //   if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
  //     this.previousBottom = '20%';
  //     this.currentBottom = '60%';
  //   }
  // }

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

  ngOnChanges(changes: SimpleChanges): void {
    // if (this._userList) {
    //   this.userList = this._userList;
    //   this.updateUserList()
    // }
    // if (this._requestUserList) {
    //   this.requestUserList = this._requestUserList
    //   this.updateUserList()
    // }
  }

  meetingDetails: NewMeetDetail = new NewMeetDetail();

  loadMeetDetailsByMeetingCode(_meetId: string) {
    this.meetingDetails = this._meetingServices.getMeetDetailsByMeetCode(_meetId);
    if (this.meetingDetails.MeetCode) {
      this.loadUserList();
    }
  }

  setUserInVacantSeat() {
    debugger
    // console.log('Clicked Key =>', _key);
    this.seatList[Number(this.currentBottomEleIndex)] = this.selectedUserDetail;
    this.seatList[Number(this.currentBottomEleIndex)].SeatNo = this.currentBottomEleIndex;
    // this.seatList[Number(this.currentBottomEleIndex)].Gender = this.currentBottomEleIndex;
    setTimeout(() => {
      let _ele = document.getElementById('vacant_seat_' + this.currentBottomEleIndex)
      if (_ele) {
        _ele.style.bottom = '65%';
      }
      this.approveMemberRequest(this.selectedUserDetail);
    }, 500);
  }

  filterNextVacantSeat() {
    debugger
    let _index: string = ''
    if (this.currentBottomEleIndex) {
      if (Number(this.currentBottomEleIndex) === this.seatList.length - 1) {
        for (let i = 0; i < this.seatList.length; i++) {
          if (!this.seatList[i].SeatNo && i !== Number(this.currentBottomEleIndex)) {
            _index = i.toString();
            // this.currentBottomEleIndex = _index;
            break;
          }
        }
        // _index = '0'
      } else {
        for (let i = Number(this.currentBottomEleIndex); i < this.seatList.length; i++) {
          if (!this.seatList[i].SeatNo && i !== Number(this.currentBottomEleIndex)) {
            _index = i.toString();
            // this.currentBottomEleIndex = _index;
            break;
          }
        }
      }
      let _ele = document.getElementById('vacant_seat_' + _index)
      if (_ele) {
        _ele.style.bottom = '65%';
      }
      // for(let i = 0; i < this.seatList.length; i++){
      // if(i !== Number(this.currentBottomEleIndex)){
      let _ele1 = document.getElementById('vacant_seat_' + this.currentBottomEleIndex);
      if (_ele1) {
        _ele1.style.bottom = '20%';
      }

      this.currentBottomEleIndex = _index
      // }
      // }
    }
  }

  filterPreviousVacantSeat() {
    debugger
    let _index: string = ''
    if (this.currentBottomEleIndex) {
      // if (Number(this.currentBottomEleIndex) === 0) {
      // for (let i = this.seatList.length - 1; i < this.seatList.length; i--) {
      //   if (!this.seatList[i].SeatNo && i !== Number(this.currentBottomEleIndex)) {
      //     _index = i.toString();
      //     // this.currentBottomEleIndex = _index;
      //     break;
      //   }
      // }
      // _index = (this.seatList.length - 1).toString()
      // } else {
      for (let i = Number(this.currentBottomEleIndex); i < this.seatList.length; i--) {
        if (!this.seatList[i].SeatNo && i !== Number(this.currentBottomEleIndex)) {
          _index = i.toString();
          // this.currentBottomEleIndex = _index;
          break;
        }
        if (i === 0 && this.seatList[i].SeatNo) {
          i = this.seatList.length;
        }
      }
      // }
      let _ele = document.getElementById('vacant_seat_' + _index)
      if (_ele) {
        _ele.style.bottom = '65%';
      }
      // for(let i = 0; i < this.seatList.length; i++){
      // if(i !== Number(this.currentBottomEleIndex)){
      let _ele1 = document.getElementById('vacant_seat_' + this.currentBottomEleIndex);
      if (_ele1) {
        _ele1.style.bottom = '20%';
      }

      this.currentBottomEleIndex = _index
      // }
      // }
    }
  }


  seatList: SeatDetail[] = []
  generateSeatListByMeetSeatQuantity() {
    if (this.meetingDetails.MeetCandidateQuantity) {
      for (let i = 0; i < Number(this.meetingDetails.MeetCandidateQuantity); i++) {
        let _seat = new SeatDetail();
        this.seatList.push(_seat);
      }
    }
    this.settle_UserOnSeats();

  }

  showCandidateList: boolean = false;

  userList: UserDetail[] = [];
  _userList: UserDetail[] = [];
  requestUserList: UserDetail[] = [];
  _requestUserList: UserDetail[] = [];
  loadUserList() {
    let _localStoArray = localStorage;
    if (_localStoArray.length) {
      let __userList: UserDetail[] = [];
      let __requestUserList: UserDetail[] = [];
      // debugger
      for (let i = 0; i < localStorage.length; i++) {
        let _key = localStorage.key(i);
        if (_key?.toLowerCase().includes('user')) {
          let _userDetails: any = localStorage.getItem(_key);
          // console.log(_userDetails);
          if (_userDetails) {
            _userDetails = JSON.parse(_userDetails);
            if (_userDetails.MeetCode === this.meetingDetails.MeetCode) {
              if (_key?.includes('_NewRequest')) {
                __requestUserList.push(_userDetails)
              } else {
                __userList.push(_userDetails);
              }
            }
          }
        }
      }
      if (this._userList.length != __userList.length) {
        this._userList = __userList;
        this.updateUserList();
      }
      if (this._requestUserList.length != __requestUserList.length) {
        this._requestUserList = __requestUserList;
        this.updateUserList()
      }
      // this._requestUserList = __requestUserList
    }
    setInterval(() => {
      this.loadUserList();
    }, 1000);
  }

  showRequestList: boolean = false;
  updateUserList() {
    this.userList = this._userList;
    this.requestUserList = this._requestUserList;
    this.generateSeatListByMeetSeatQuantity();

  }

  leaveMeeting() {
    // localStorage.removeItem('user');
    this._router.navigate(['dashboard']);
  }

  startCamera() {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        this.stream = stream;
        this.videoElement.nativeElement.srcObject = stream;
      })
      .catch((error) => {
        console.error('Error accessing camera:', error);
      });
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
  }

  private mediaStream: MediaStream | null = null;

  async startScreenSharing() {
    try {
      this.mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'browser',
        } as MediaTrackConstraints,
        audio: false
      });

      const videoElement = document.getElementById('screenVideo') as HTMLVideoElement;
      if (videoElement) {
        videoElement.srcObject = this.mediaStream;
      }

      this.mediaStream.getVideoTracks()[0].onended = () => {
        this.stopScreenSharing();
      };
    } catch (error) {
      console.error('Error capturing screen:', error);
    }
  }

  stopScreenSharing() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
  }

  isSelectectingSeatApprovingPerson: boolean = false;
  selectedUserDetail: SeatDetail = new SeatDetail();
  setSeelctedUserDetail(_user: UserDetail) {
    debugger
    let _count = this.count_OccupiedSeats();
    if (Number(this.meetingDetails.MeetCandidateQuantity) !== _count) {
      this.isSelectectingSeatApprovingPerson = true;
      this.selectedUserDetail = new SeatDetail();
      this.selectedUserDetail = _user;
      this.showRequestList = false;
      let _index = this.filterWhichSeatIsVacant() || '';
      setTimeout(() => {
        debugger
        if (_index) {
          let _ele = document.getElementById('vacant_seat_' + _index)
          if (_ele) {
            _ele.style.bottom = '65%';
          }
          debugger
        }
      }, 500);
    } else {
      alert('There are no available seats right now...');
    }
  }

  count_OccupiedSeats() {
    debugger
    let _count: number = 0;

    this.userList.forEach(
      (z: SeatDetail) => {
        if (z.SeatNo) {
          _count++
        }
      }
    )
    debugger
    return _count;
  }

  settle_UserOnSeats() {

    debugger

    let _index = 0;

    for (let i = 0; i < this.seatList.length; i++) {
      if (this.seatList.length >= this.userList.length) {
        if (i < this.userList.length) {
          this.seatList[i].ConatctNo = this.userList[i].ConatctNo || '';
          this.seatList[i].FirstName = this.userList[i].FirstName || '';
          this.seatList[i].LastName = this.userList[i].LastName || '';
          this.seatList[i].Gender = this.userList[i].Gender || '';
          this.seatList[i].MeetCode = this.userList[i].MeetCode || '';
          this.seatList[i].MeetJoiningDate = this.userList[i].MeetJoiningDate || '';
          this.seatList[i].SeatNo = i.toString();
        }
      }
    }
    // this.seatList.map((z: SeatDetail) => {
    //   debugger
    //   z = this.userList[_index];
    //   z.SeatNo = _index.toString();
    //   _index++;
    // })
    console.log("Settled Seat List =>", this.seatList);

    this.isSelectectingSeatApprovingPerson = true;
  }

  remove_UserFromSeat(_index: number) {
    this.seatList[_index] = new SeatDetail();
  }

  return_BottomStyleBasedOnSeatNo(_seatNo: string) {
    debugger
    if (_seatNo) {
      return 'movable-box seated-person'
    } else {
      return 'movable-box'
    }
  }

  filterWhichSeatIsVacant() {
    let _index: string = '';
    if (this.seatList.length) {
      for (let i = 0; i < this.seatList.length; i++) {
        if (!this.seatList[i].SeatNo) {
          _index = i.toString();
          this.currentBottomEleIndex = _index;
          break;
        }
      }
    }
    return _index;
  }

  approveMemberRequest(_user: UserDetail) {
    debugger
    let _key = 'user_' + _user.ConatctNo + '_' + _user.MeetCode + '_' + 'NewRequest';
    let _userDetail = localStorage.getItem(_key) || null;
    if (_userDetail) {
      localStorage.removeItem(_key);
      _key = 'user_' + _user.ConatctNo + '_' + _user.MeetCode
      localStorage.setItem(_key, _userDetail);
      this.selectedUserDetail = new UserDetail();
      this.loadUserList();
    }
  }

  // approveMemberRequest(_user: UserDetail) {
  //   debugger
  //   let _key = 'user_' + _user.ConatctNo + '_' + _user.MeetCode + '_' + 'NewRequest';
  //   let _userDetail = localStorage.getItem(_key) || null;
  //   if (_userDetail) {
  //     localStorage.removeItem(_key);
  //     _key = 'user_' + _user.ConatctNo + '_' + _user.MeetCode
  //     localStorage.setItem(_key, _userDetail);
  //     this.loadUserList();
  //   }
  // }

  isMicOn: boolean = false;
  isVideoOn: boolean = false;
  isScreenShredOn: boolean = false;

  // currentBottom: string = '60%';
  currentBottomEleIndex: string = '';
  // previousBottom: string = '20%';



}
