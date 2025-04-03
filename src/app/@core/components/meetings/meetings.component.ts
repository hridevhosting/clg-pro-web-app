import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
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
  @ViewChild('videoElement', { static: false }) videoElement!: ElementRef;
  stream!: MediaStream;

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

  isMicOn:boolean = false;
  isVideoOn:boolean = false;
  isScreenShredOn:boolean = false;


}
