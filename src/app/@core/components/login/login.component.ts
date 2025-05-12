import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { LoginDetails } from 'src/app/shared/modals/login';
import { Router } from '@angular/router';
import { NewUser } from 'src/app/shared/modals/NewUser';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {

  constructor(
    private _authServices: AuthService,
    private _router: Router
  ) { }

  ngOnInit(): void {
    this.getUserList();
  }

  loginDetails: LoginDetails = new LoginDetails();
  isExistingUser: boolean = true;
  loginIn() {
    if (this.userList.length) {
      for (let i = 0; i < this.userList.length; i++) {
        if (this.userList[i].EmailAddress.toLowerCase() == this.loginDetails.UserName.toLowerCase() && this.userList[i].Password == this.loginDetails.Password) {
          localStorage.setItem('user', JSON.stringify(this.userList[i]))
          this._router.navigate(['dashboard'])
        };
      }
    } else {
      alert('Please create user first.')
      this.isExistingUser = false;
    }
  }

  direct_JoinMeet() {
    this._router.navigate(['dashboard'], { queryParams: { redirect: 'DirectJoinMeet' } })
  }

  newUser: NewUser = new NewUser();
  createNewUser() {
    let _date = new Date();
    if (!this.newUser.FirstName) {
      alert('Please enter firstname!')
      return null;
    }
    if (!this.newUser.LastName) {
      alert('Please enter lastname!')
      return null;
    }
    if (!this.newUser.EmailAddress) {
      alert('Please enter email address!')
      return null;
    }
    if (!this.newUser.Password) {
      alert('Please enter password!')
      return null;
    }
    if (this.newUser.FirstName && this.newUser.LastName && this.newUser.EmailAddress && this.newUser.Password) {
      localStorage.setItem('createdUser_' + _date, JSON.stringify(this.newUser));
      this.isExistingUser = false;
      this.getUserList()
      alert('User has been created, Please login now.')
      return null;
    }
    return null;
  }

  userList: NewUser[] = []
  getUserList() {
    let _userList = localStorage;
    if (_userList.length) {
      debugger
      for (let i = 0; i < localStorage.length; i++) {
        let _key = localStorage.key(i);
        if (_key?.toLowerCase().includes('createduser')) {
          let _userDetails: any = localStorage.getItem(_key);
          if (_userDetails) {
            _userDetails = JSON.parse(_userDetails);
            this.userList.push(_userDetails);
          }
        }
      }
      console.log(this.userList);
    }
  }

}
